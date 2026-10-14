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

router.get(
  "/:id/variants",
  exigirPermissao("products.read"),
  (req, res) => {
    try {
      const valor = req.params.id;

      if (!/^[1-9]\d*$/.test(valor)) {
        return res.status(400).json({
          mensagem: "Identificador de produto inválido.",
        });
      }

      const productId = Number(valor);

      if (!Number.isSafeInteger(productId)) {
        return res.status(400).json({
          mensagem: "Identificador de produto inválido.",
        });
      }

      const produto = db.prepare(`
        SELECT id, name, sku_base, status
        FROM products
        WHERE id = ?
      `).get(productId);

      if (!produto) {
        return res.status(404).json({
          mensagem: "Produto não encontrado.",
        });
      }

      const variantes = db.prepare(`
        SELECT
          v.id,
          v.product_id,
          v.sku,
          v.ean,
          v.color_name,
          v.color_code,
          v.size_name,
          v.size_code,
          v.status,
          v.created_at,
          v.updated_at,

          preco.id AS pricing_id,
          preco.sale_price_cents,
          preco.cost_price_cents,
          preco.promotional_price_cents,
          preco.currency,
          preco.status AS pricing_status,

          i.available_quantity,
          i.source_type,
          i.availability_status,
          i.lead_time_days

        FROM product_variants AS v

        LEFT JOIN variant_pricing AS preco
          ON preco.id = (
            SELECT vp.id
            FROM variant_pricing AS vp
            WHERE vp.variant_id = v.id
              AND vp.status = 'active'
              AND (
                vp.valid_from IS NULL
                OR datetime(vp.valid_from) <= datetime('now')
              )
              AND (
                vp.valid_until IS NULL
                OR datetime(vp.valid_until) > datetime('now')
              )
            ORDER BY datetime(vp.valid_from) DESC, vp.id DESC
            LIMIT 1
          )

        LEFT JOIN variant_inventory AS i
          ON i.variant_id = v.id

        WHERE v.product_id = ?

        ORDER BY v.id
      `).all(productId);

      return res.json({
        produto,
        total: variantes.length,
        variantes,
      });
    } catch (erro) {
      console.error("Erro ao consultar variantes:", erro);

      return res.status(500).json({
        mensagem: "Não foi possível consultar as variantes.",
      });
    }
  }
);

module.exports = router;
