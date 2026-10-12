const express = require("express");
const { createHash, randomUUID } = require("node:crypto");
const db = require("../database/connection");

const router = express.Router();

const estados = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF",
  "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS",
  "RO", "RR", "SC", "SP", "SE", "TO",
]);

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

function obterTokenHash(req) {
  const cookie = (req.headers.cookie || "")
    .split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith("neumam_cart="));

  const token = cookie
    ? cookie.slice("neumam_cart=".length)
    : "";

  if (!/^[a-f0-9]{64}$/.test(token)) {
    falhar(404, "Carrinho não encontrado.");
  }

  return createHash("sha256").update(token).digest("hex");
}

function validarDados(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    falhar(400, "Informe os dados de contato e entrega.");
  }

  const limites = {
    customer_name: 120,
    customer_email: 254,
    customer_phone: 20,
    shipping_postal_code: 9,
    shipping_street: 200,
    shipping_number: 20,
    shipping_complement: 100,
    shipping_neighborhood: 100,
    shipping_city: 100,
    shipping_state: 2,
  };

  const dados = {};

  for (const [campo, limite] of Object.entries(limites)) {
    const valor = body[campo];

    if (
      campo === "shipping_complement" &&
      (valor === undefined || valor === null)
    ) {
      dados[campo] = "";
      continue;
    }

    if (typeof valor !== "string") {
      falhar(400, `Campo inválido: ${campo}.`);
    }

    const texto = valor.trim();

    if (
      texto.length > limite ||
      /[\u0000-\u001f\u007f]/.test(texto) ||
      (campo !== "shipping_complement" && texto === "")
    ) {
      falhar(400, `Confira o campo: ${campo}.`);
    }

    dados[campo] = texto;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.customer_email)) {
    falhar(400, "Informe um e-mail válido.");
  }

  if (!/^[\d\s()+-]+$/.test(dados.customer_phone)) {
    falhar(400, "Informe um telefone válido.");
  }

  dados.customer_phone = dados.customer_phone.replace(/\D/g, "");

  if (!/^\d{10,11}$/.test(dados.customer_phone)) {
    falhar(400, "Informe um telefone com DDD, com 10 ou 11 dígitos.");
  }

  if (!/^\d{5}-?\d{3}$/.test(dados.shipping_postal_code)) {
    falhar(400, "Informe um CEP com 8 dígitos.");
  }

  dados.shipping_postal_code =
    dados.shipping_postal_code.replace(/\D/g, "");

  dados.shipping_state = dados.shipping_state.toUpperCase();

  if (!estados.has(dados.shipping_state)) {
    falhar(400, "Selecione um estado válido.");
  }

  return dados;
}

function respostaPedido(orderId) {
  const pedido = db.prepare(`
    SELECT
      order_number,
      status,
      payment_status,
      subtotal_cents,
      discount_total_cents,
      tax_total_cents,
      shipping_status,
      shipping_total_cents,
      total_cents,
      currency
    FROM orders
    WHERE id = ?
  `).get(orderId);

  if (!pedido) {
    falhar(409, "Não foi possível recuperar a solicitação.");
  }

  // Enquanto o frete aguarda orçamento, o total final é desconhecido.
  if (pedido.shipping_status !== "quoted") {
    return {
      ...pedido,
      shipping_total_cents: null,
      total_cents: null,
    };
  }

  return pedido;
}

function mensagemPedido(pedido) {
  return pedido.shipping_status === "quoted"
    ? "Solicitação registrada. O frete já foi informado."
    : "Solicitação registrada. O frete será informado antes do pagamento.";
}

router.post("/", (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const tokenHash = obterTokenHash(req);

    const criarPedido = db.transaction(() => {
      const carrinho = db.prepare(`
        SELECT
          id,
          status,
          currency,
          coupon_code,
          discount_total_cents,
          shipping_total_cents,
          converted_order_id
        FROM carts
        WHERE session_token = ?
          AND customer_id IS NULL
          AND datetime(expires_at) > datetime('now')
      `).get(tokenHash);

      if (!carrinho) {
        falhar(404, "Carrinho não encontrado.");
      }

      // O mesmo carrinho convertido sempre retorna o mesmo pedido.
      if (
        carrinho.status === "converted" &&
        carrinho.converted_order_id
      ) {
        return {
          repetido: true,
          pedido: respostaPedido(carrinho.converted_order_id),
        };
      }

      if (carrinho.status !== "active") {
        falhar(409, "Este carrinho não está ativo.");
      }

      const dados = validarDados(req.body);

      if (
        carrinho.currency !== "BRL" ||
        carrinho.coupon_code !== null ||
        carrinho.discount_total_cents !== 0 ||
        carrinho.shipping_total_cents !== 0
      ) {
        falhar(409, "Este carrinho precisa de revisão antes do envio.");
      }

      const itens = db.prepare(`
        SELECT
          variant_id,
          quantity,
          unit_price_cents,
          discount_total_cents,
          currency
        FROM cart_items
        WHERE cart_id = ?
          AND status = 'active'
        ORDER BY id
      `).all(carrinho.id);

      if (itens.length === 0) {
        falhar(409, "Seu carrinho está vazio.");
      }

      const itensPedido = [];
      let soma = 0n;

      for (const item of itens) {
        if (
          !Number.isSafeInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 100 ||
          item.discount_total_cents !== 0 ||
          item.currency !== "BRL"
        ) {
          falhar(409, "Confira os itens do carrinho.");
        }

        const variante = db.prepare(`
          SELECT
            v.id,
            v.product_id,
            v.sku,
            v.color_name,
            v.size_name,
            p.name AS product_name,
            p.sku_base AS product_sku,
            i.available_quantity,
            i.availability_status
          FROM product_variants AS v
          JOIN products AS p
            ON p.id = v.product_id
          LEFT JOIN variant_inventory AS i
            ON i.variant_id = v.id
          WHERE v.id = ?
            AND v.status = 'active'
            AND p.status = 'active'
            AND EXISTS (
              SELECT 1
              FROM product_publication AS pp
              WHERE pp.product_id = p.id
                AND pp.channel = 'online_store'
                AND pp.status = 'published'
                AND pp.is_published = 1
                AND pp.is_visible = 1
                AND (
                  pp.published_at IS NULL
                  OR datetime(pp.published_at) <= datetime('now')
                )
                AND (
                  pp.unpublished_at IS NULL
                  OR datetime(pp.unpublished_at) > datetime('now')
                )
            )
        `).get(item.variant_id);

        if (
          !variante ||
          !Number.isSafeInteger(variante.available_quantity) ||
          item.quantity > variante.available_quantity ||
          !["available", "low_stock"].includes(
            variante.availability_status
          )
        ) {
          falhar(
            409,
            "Um dos produtos está indisponível. Revise o carrinho."
          );
        }

        const preco = db.prepare(`
          SELECT
            sale_price_cents,
            promotional_price_cents,
            currency
          FROM variant_pricing
          WHERE variant_id = ?
            AND status = 'active'
            AND (
              valid_from IS NULL
              OR datetime(valid_from) <= datetime('now')
            )
            AND (
              valid_until IS NULL
              OR datetime(valid_until) > datetime('now')
            )
          ORDER BY datetime(valid_from) DESC, id DESC
          LIMIT 1
        `).get(item.variant_id);

        const valor =
          preco?.promotional_price_cents ?? preco?.sale_price_cents;

        if (
          !preco ||
          preco.currency !== "BRL" ||
          !Number.isSafeInteger(valor) ||
          valor < 0
        ) {
          falhar(409, "Um dos produtos está sem preço disponível.");
        }

        if (valor !== item.unit_price_cents) {
          falhar(
            409,
            "O preço de um produto mudou. Atualize a quantidade no carrinho para revisar o preço."
          );
        }

        const totalItem = BigInt(valor) * BigInt(item.quantity);
        soma += totalItem;

        if (soma > BigInt(Number.MAX_SAFE_INTEGER)) {
          falhar(409, "Total acima do limite permitido.");
        }

        itensPedido.push({
          product_id: variante.product_id,
          variant_id: variante.id,
          product_name: variante.product_name,
          product_sku: variante.product_sku,
          variant_sku: variante.sku,
          color_name: variante.color_name,
          size_name: variante.size_name,
          quantity: item.quantity,
          unit_price_cents: valor,
          line_total_cents: Number(totalItem),
        });
      }

      const subtotal = Number(soma);

      const resultado = db.prepare(`
        INSERT INTO orders (
          order_number,
          status,
          payment_status,
          fulfillment_status,
          subtotal_cents,
          discount_total_cents,
          shipping_status,
          shipping_total_cents,
          tax_total_cents,
          total_cents,
          currency,
          customer_name,
          customer_email,
          customer_phone,
          shipping_postal_code,
          shipping_street,
          shipping_number,
          shipping_complement,
          shipping_neighborhood,
          shipping_city,
          shipping_state,
          shipping_country,
          notes,
          placed_at
        )
        VALUES (
          @order_number,
          'pending',
          'pending',
          'unfulfilled',
          @subtotal,
          0,
          'awaiting_quote',
          0,
          0,
          @subtotal,
          'BRL',
          @customer_name,
          @customer_email,
          @customer_phone,
          @shipping_postal_code,
          @shipping_street,
          @shipping_number,
          @shipping_complement,
          @shipping_neighborhood,
          @shipping_city,
          @shipping_state,
          'Brasil',
          'FRETE_SOB_CONSULTA: valor de entrega pendente. Total registrado corresponde apenas aos produtos. Solicitação sem pagamento e sem reserva de estoque.',
          CURRENT_TIMESTAMP
        )
      `).run({
        ...dados,
        order_number: `NM-${randomUUID()}`,
        subtotal,
      });

      const orderId = Number(resultado.lastInsertRowid);

      const inserirItem = db.prepare(`
        INSERT INTO order_items (
          order_id,
          product_id,
          variant_id,
          product_name,
          product_sku,
          variant_sku,
          color_name,
          size_name,
          quantity,
          unit_price_cents,
          discount_total_cents,
          tax_total_cents,
          line_total_cents,
          currency,
          status
        )
        VALUES (
          @order_id,
          @product_id,
          @variant_id,
          @product_name,
          @product_sku,
          @variant_sku,
          @color_name,
          @size_name,
          @quantity,
          @unit_price_cents,
          0,
          0,
          @line_total_cents,
          'BRL',
          'active'
        )
      `);

      for (const item of itensPedido) {
        inserirItem.run({ ...item, order_id: orderId });
      }

      db.prepare(`
        UPDATE carts
        SET status = 'converted',
            converted_order_id = ?,
            subtotal_cents = ?,
            total_cents = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(orderId, subtotal, subtotal, carrinho.id);

      return {
        repetido: false,
        pedido: respostaPedido(orderId),
      };
    });

    const resultado = criarPedido.immediate();

    return res.status(resultado.repetido ? 200 : 201).json({
      mensagem: mensagemPedido(resultado.pedido),
      pedido: resultado.pedido,
    });
  } catch (erro) {
    return responderErro(
      res,
      erro,
      "Não foi possível registrar a solicitação."
    );
  }
});

router.get("/current", (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const tokenHash = obterTokenHash(req);

    const carrinho = db.prepare(`
      SELECT converted_order_id
      FROM carts
      WHERE session_token = ?
        AND customer_id IS NULL
        AND status = 'converted'
        AND converted_order_id IS NOT NULL
        AND datetime(expires_at) > datetime('now')
    `).get(tokenHash);

    if (!carrinho) {
      falhar(404, "Solicitação não encontrada.");
    }

    return res.json({
      pedido: respostaPedido(carrinho.converted_order_id),
    });
  } catch (erro) {
    return responderErro(
      res,
      erro,
      "Não foi possível consultar a solicitação."
    );
  }
});

module.exports = router;