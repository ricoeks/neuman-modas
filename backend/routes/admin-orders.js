const express = require("express");
const db = require("../database/connection");
const {
  exigirAdmin,
  exigirPermissao,
  protegerAlteracao,
} = require("./admin-auth");

const router = express.Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.use(exigirAdmin);
router.use(exigirPermissao("orders.read"));

function falhar(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  throw erro;
}

function responderErro(res, erro, mensagem) {
  if (erro.status) {
    return res.status(erro.status).json({
      mensagem: erro.message,
    });
  }

  console.error(mensagem, erro);
  return res.status(500).json({ mensagem });
}

function inteiroPositivo(valor, padrao) {
  if (valor === undefined) {
    return padrao;
  }

  if (
    typeof valor !== "string" ||
    !/^[1-9]\d*$/.test(valor)
  ) {
    return null;
  }

  const numero = Number(valor);
  return Number.isSafeInteger(numero) ? numero : null;
}

function apresentarPedido(pedido) {
  return {
    ...pedido,
    shipping_total_cents:
      pedido.shipping_status === "quoted"
        ? pedido.shipping_total_cents
        : null,
    total_cents:
      pedido.shipping_status === "quoted"
        ? pedido.total_cents
        : null,
  };
}

function consultarPedido(id) {
  const pedido = db.prepare(`
    SELECT
      id, order_number,
      customer_name, customer_email, customer_phone,
      shipping_postal_code, shipping_street, shipping_number,
      shipping_complement, shipping_neighborhood,
      shipping_city, shipping_state, shipping_country,
      status, payment_status, fulfillment_status, shipping_status,
      subtotal_cents, discount_total_cents, tax_total_cents,
      shipping_total_cents, total_cents, currency,
      placed_at, created_at, updated_at
    FROM orders
    WHERE id = ?
  `).get(id);

  if (!pedido) {
    return null;
  }

  const itens = db.prepare(`
    SELECT
      id, product_id, variant_id,
      product_name, product_sku, variant_sku,
      color_name, size_name, quantity,
      unit_price_cents, discount_total_cents,
      tax_total_cents, line_total_cents,
      currency, status
    FROM order_items
    WHERE order_id = ?
    ORDER BY id
  `).all(id);

  return {
    ...apresentarPedido(pedido),
    itens,
  };
}

router.get("/", (req, res) => {
  try {
    const page = inteiroPositivo(req.query.page, 1);
    const limit = inteiroPositivo(req.query.limit, 20);

    if (
      page === null ||
      limit === null ||
      limit > 100 ||
      !Number.isSafeInteger((page - 1) * limit)
    ) {
      falhar(
        400,
        "Paginação inválida. Use página positiva e limite de 1 a 100."
      );
    }

    const busca = req.query.q;

    if (
      busca !== undefined &&
      (
        typeof busca !== "string" ||
        busca.trim() === "" ||
        busca.trim().length > 100 ||
        Array.from(busca).some(
          (caractere) =>
            caractere.charCodeAt(0) < 32 ||
            caractere.charCodeAt(0) === 127
        )
      )
    ) {
      falhar(400, "Informe uma busca entre 1 e 100 caracteres.");
    }

    const situacaoFrete = req.query.shipping_status;

    if (
      situacaoFrete !== undefined &&
      (
        typeof situacaoFrete !== "string" ||
        !["not_requested", "awaiting_quote", "quoted"].includes(
          situacaoFrete
        )
      )
    ) {
      falhar(400, "Informe uma situação de frete válida.");
    }

    const parametros = {
      searchTerm: busca === undefined ? null : busca.trim(),
      shippingStatus: situacaoFrete ?? null,
    };

    const condicoes = `
      WHERE (
        @searchTerm IS NULL
        OR instr(lower(order_number), lower(@searchTerm)) > 0
        OR instr(
          lower(COALESCE(customer_name, '')),
          lower(@searchTerm)
        ) > 0
      )
      AND (
        @shippingStatus IS NULL
        OR shipping_status = @shippingStatus
      )
    `;

    const consultar = db.transaction(() => {
      const total = db.prepare(`
        SELECT COUNT(*) AS total
        FROM orders
        ${condicoes}
      `).get(parametros).total;

      const pedidos = db.prepare(`
        SELECT
          id, order_number, customer_name,
          status, payment_status, fulfillment_status, shipping_status,
          subtotal_cents, discount_total_cents, tax_total_cents,
          shipping_total_cents, total_cents, currency,
          placed_at, created_at
        FROM orders
        ${condicoes}
        ORDER BY id DESC
        LIMIT @limit OFFSET @offset
      `).all({
        ...parametros,
        limit,
        offset: (page - 1) * limit,
      }).map(apresentarPedido);

      return {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        pedidos,
      };
    });

    res.json(consultar());
  } catch (erro) {
    responderErro(res, erro, "Não foi possível consultar os pedidos.");
  }
});

router.get("/:id", (req, res) => {
  try {
    const id = inteiroPositivo(req.params.id, null);

    if (id === null) {
      falhar(400, "Informe um identificador de pedido válido.");
    }

    const consultar = db.transaction(() => consultarPedido(id));
    const pedido = consultar();

    if (!pedido) {
      falhar(404, "Pedido não encontrado.");
    }

    res.json({ pedido });
  } catch (erro) {
    responderErro(res, erro, "Não foi possível consultar o pedido.");
  }
});

router.patch(
  "/:id/shipping-quote",
  protegerAlteracao,
  exigirPermissao("orders.shipping.quote"),
  (req, res) => {
    try {
      const id = inteiroPositivo(req.params.id, null);

      if (id === null) {
        falhar(400, "Informe um identificador de pedido válido.");
      }

      const body = req.body;

      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).length !== 1 ||
        !Object.hasOwn(body, "shipping_total_cents") ||
        !Number.isSafeInteger(body.shipping_total_cents) ||
        body.shipping_total_cents < 0
      ) {
        falhar(
          400,
          "Informe somente shipping_total_cents como inteiro não negativo."
        );
      }

      const frete = body.shipping_total_cents;

      const registrar = db.transaction(() => {
        const pedido = db.prepare(`
          SELECT
            id, status, payment_status, currency, shipping_status,
            subtotal_cents, discount_total_cents, tax_total_cents,
            shipping_total_cents, total_cents
          FROM orders
          WHERE id = ?
        `).get(id);

        if (!pedido) {
          falhar(404, "Pedido não encontrado.");
        }

        if (
          pedido.status !== "pending" ||
          pedido.payment_status !== "pending" ||
          pedido.currency !== "BRL"
        ) {
          falhar(
            409,
            "O pedido precisa estar pendente, sem pagamento, e em BRL."
          );
        }

        for (const campo of [
          "subtotal_cents",
          "discount_total_cents",
          "tax_total_cents",
        ]) {
          if (
            !Number.isSafeInteger(pedido[campo]) ||
            pedido[campo] < 0
          ) {
            falhar(409, "Os valores do pedido precisam de revisão.");
          }
        }

        if (pedido.discount_total_cents > pedido.subtotal_cents) {
          falhar(409, "O desconto do pedido precisa de revisão.");
        }

        const total =
          BigInt(pedido.subtotal_cents) -
          BigInt(pedido.discount_total_cents) +
          BigInt(frete) +
          BigInt(pedido.tax_total_cents);

        if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
          falhar(400, "O total ultrapassa o limite permitido.");
        }

        const totalCentavos = Number(total);

        if (pedido.shipping_status === "quoted") {
          if (
            pedido.shipping_total_cents === frete &&
            pedido.total_cents === totalCentavos
          ) {
            return {
              repetido: true,
              pedido: consultarPedido(id),
            };
          }

          falhar(409, "O pedido já possui outro orçamento de frete.");
        }

        if (pedido.shipping_status !== "awaiting_quote") {
          falhar(409, "Este pedido não está aguardando orçamento.");
        }

        const atualizacao = db.prepare(`
          UPDATE orders
          SET shipping_status = 'quoted',
              shipping_total_cents = @frete,
              total_cents = @total,
              updated_at = CURRENT_TIMESTAMP,
              notes = COALESCE(notes, '') || char(10) ||
                'ORCAMENTO_FRETE: ' || @frete ||
                ' centavos, administrador ' || @adminId ||
                ', registrado em ' || CURRENT_TIMESTAMP
          WHERE id = @id
            AND shipping_status = 'awaiting_quote'
            AND status = 'pending'
            AND payment_status = 'pending'
        `).run({
          id,
          frete,
          total: totalCentavos,
          adminId: req.admin.id,
        });

        if (atualizacao.changes !== 1) {
          falhar(409, "O pedido mudou. Consulte novamente.");
        }

        const descricao = JSON.stringify({
          currency: pedido.currency,
          before: {
            shipping_status: pedido.shipping_status,
            shipping_total_cents: null,
            total_cents: null,
          },
          after: {
            shipping_status: "quoted",
            shipping_total_cents: frete,
            total_cents: totalCentavos,
          },
        });

        db.prepare(`
          INSERT INTO admin_audit_logs (
            admin_user_id, actor_name, action,
            entity_type, entity_id, description, ip_address
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.admin.id,
          req.admin.name,
          "orders.shipping.quote",
          "orders",
          id,
          descricao,
          req.ip || req.socket.remoteAddress || null
        );

        return {
          repetido: false,
          pedido: consultarPedido(id),
        };
      });

      const resultado = registrar.immediate();

      res.json({
        mensagem: resultado.repetido
          ? "Este orçamento já estava registrado."
          : "Frete registrado e total atualizado.",
        pedido: resultado.pedido,
      });
    } catch (erro) {
      responderErro(
        res,
        erro,
        "Não foi possível registrar o orçamento de frete."
      );
    }
  }
);

module.exports = router;