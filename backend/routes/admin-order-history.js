const express = require("express");
const db = require("../database/connection");
const {
  exigirAdmin,
  exigirPermissao,
} = require("./admin-auth");

const router = express.Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.use(exigirAdmin);
router.use(exigirPermissao("orders.read"));

router.get("/:id/history", (req, res) => {
  try {
    const textoId = req.params.id;
    const id = Number(textoId);

    if (
      !/^[1-9]\d*$/.test(textoId) ||
      !Number.isSafeInteger(id)
    ) {
      return res.status(400).json({
        mensagem: "Informe um identificador de pedido válido.",
      });
    }

    const consultar = db.transaction(() => {
      const pedido = db.prepare(`
        SELECT id
        FROM orders
        WHERE id = ?
      `).get(id);

      if (!pedido) {
        return null;
      }

      const registros = db.prepare(`
        SELECT
          id,
          actor_name,
          action,
          description,
          created_at
        FROM admin_audit_logs
        WHERE entity_type = 'orders'
          AND entity_id = ?
          AND action = 'orders.shipping.quote'
        ORDER BY id DESC
        LIMIT 100
      `).all(id);

      return registros.map((registro) => {
        let valores = null;

        try {
          const descricao = JSON.parse(registro.description);
          const depois = descricao?.after;

          if (
            descricao?.currency === "BRL" &&
            depois?.shipping_status === "quoted" &&
            Number.isSafeInteger(depois.shipping_total_cents) &&
            depois.shipping_total_cents >= 0 &&
            Number.isSafeInteger(depois.total_cents) &&
            depois.total_cents >= 0
          ) {
            valores = {
              currency: "BRL",
              shipping_total_cents: depois.shipping_total_cents,
              total_cents: depois.total_cents,
            };
          }
        } catch {
          // Registros antigos podem ter descrição em texto.
        }

        return {
          id: registro.id,
          actor_name: registro.actor_name,
          action: registro.action,
          created_at: registro.created_at,
          valores,
        };
      });
    });

    const historico = consultar();

    if (historico === null) {
      return res.status(404).json({
        mensagem: "Pedido não encontrado.",
      });
    }

    res.json({
      order_id: id,
      historico,
    });
  } catch (erro) {
    console.error("Erro ao consultar histórico do pedido:", erro);
    res.status(500).json({
      mensagem: "Não foi possível consultar o histórico.",
    });
  }
});

module.exports = router;