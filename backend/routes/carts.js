const express = require("express");
const { randomBytes, createHash } = require("node:crypto");
const db = require("../database/connection");

const router = express.Router();

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
    return null;
  }

  return createHash("sha256").update(token).digest("hex");
}

function buscarCarrinho(tokenHash) {
  if (!tokenHash) {
    return null;
  }

  return db.prepare(`
    SELECT
      id,
      currency,
      coupon_code,
      subtotal_cents,
      discount_total_cents,
      shipping_total_cents,
      total_cents
    FROM carts
    WHERE session_token = ?
      AND customer_id IS NULL
      AND status = 'active'
      AND datetime(expires_at) > datetime('now')
  `).get(tokenHash);
}

function exigirCarrinho(req) {
  const carrinho = buscarCarrinho(obterTokenHash(req));

  if (!carrinho) {
    falhar(404, "Carrinho não encontrado.");
  }

  if (
    carrinho.coupon_code !== null ||
    carrinho.discount_total_cents !== 0 ||
    carrinho.shipping_total_cents !== 0
  ) {
    falhar(
      409,
      "Este carrinho possui desconto ou frete que precisa ser recalculado."
    );
  }

  return carrinho;
}

function montarResposta(carrinho) {
  const itens = db.prepare(`
    SELECT
      id,
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
      line_total_cents,
      currency,
      status
    FROM cart_items
    WHERE cart_id = ?
      AND status = 'active'
    ORDER BY id
  `).all(carrinho.id);

  return {
    id: carrinho.id,
    currency: carrinho.currency,
    subtotal_cents: carrinho.subtotal_cents,
    discount_total_cents: carrinho.discount_total_cents,
    shipping_total_cents: carrinho.shipping_total_cents,
    total_cents: carrinho.total_cents,
    itens,
  };
}

function recalcularCarrinho(carrinho) {
  const linhas = db.prepare(`
    SELECT line_total_cents
    FROM cart_items
    WHERE cart_id = ?
      AND status = 'active'
  `).all(carrinho.id);

  const soma = linhas.reduce(
    (total, item) => total + BigInt(item.line_total_cents),
    0n
  );

  if (soma > BigInt(Number.MAX_SAFE_INTEGER)) {
    falhar(409, "Total acima do limite permitido.");
  }

  const subtotal = Number(soma);

  db.prepare(`
    UPDATE carts
    SET subtotal_cents = ?,
        total_cents = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(subtotal, subtotal, carrinho.id);

  return montarResposta({
    ...carrinho,
    subtotal_cents: subtotal,
    total_cents: subtotal,
  });
}

function quantidadeValida(quantidade) {
  return (
    Number.isSafeInteger(quantidade) &&
    quantidade >= 1 &&
    quantidade <= 100
  );
}

function obterItemId(valor) {
  if (!/^[1-9]\d*$/.test(valor)) {
    falhar(400, "Informe um item válido.");
  }

  const id = Number(valor);

  if (!Number.isSafeInteger(id)) {
    falhar(400, "Informe um item válido.");
  }

  return id;
}

function buscarItem(carrinhoId, itemId) {
  const item = db.prepare(`
    SELECT id, variant_id, quantity
    FROM cart_items
    WHERE id = ?
      AND cart_id = ?
      AND status = 'active'
  `).get(itemId, carrinhoId);

  if (!item) {
    falhar(404, "Item não encontrado neste carrinho.");
  }

  return item;
}

function obterDadosVariante(variantId, quantidade, moeda) {
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
  `).get(variantId);

  if (!variante) {
    falhar(409, "Esta variante não está disponível para compra.");
  }

  if (
    !quantidadeValida(quantidade) ||
    !Number.isSafeInteger(variante.available_quantity) ||
    quantidade > variante.available_quantity ||
    !["available", "low_stock"].includes(
      variante.availability_status
    )
  ) {
    falhar(409, "Quantidade solicitada indisponível.");
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
  `).get(variantId);

  if (!preco || preco.currency !== moeda) {
    falhar(409, "Preço indisponível para este carrinho.");
  }

  const valor =
    preco.promotional_price_cents ?? preco.sale_price_cents;

  const totalItem = valor * quantidade;

  if (
    !Number.isSafeInteger(valor) ||
    valor < 0 ||
    !Number.isSafeInteger(totalItem)
  ) {
    falhar(409, "Valor acima do limite permitido.");
  }

  return { variante, valor, totalItem };
}

function salvarItem(carrinho, variantId, quantidade) {
  const { variante, valor, totalItem } = obterDadosVariante(
    variantId,
    quantidade,
    carrinho.currency
  );

  db.prepare(`
    INSERT INTO cart_items (
      cart_id,
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
      line_total_cents,
      currency,
      status
    )
    VALUES (
      @cart_id,
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
      @line_total_cents,
      @currency,
      'active'
    )
    ON CONFLICT(cart_id, variant_id) DO UPDATE SET
      product_name = excluded.product_name,
      product_sku = excluded.product_sku,
      variant_sku = excluded.variant_sku,
      color_name = excluded.color_name,
      size_name = excluded.size_name,
      quantity = excluded.quantity,
      unit_price_cents = excluded.unit_price_cents,
      discount_total_cents = 0,
      line_total_cents = excluded.line_total_cents,
      currency = excluded.currency,
      status = 'active',
      updated_at = CURRENT_TIMESTAMP
  `).run({
    cart_id: carrinho.id,
    product_id: variante.product_id,
    variant_id: variantId,
    product_name: variante.product_name,
    product_sku: variante.product_sku,
    variant_sku: variante.sku,
    color_name: variante.color_name,
    size_name: variante.size_name,
    quantity: quantidade,
    unit_price_cents: valor,
    line_total_cents: totalItem,
    currency: carrinho.currency,
  });
}

router.post("/", (req, res) => {
  try {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const duracao = 7 * 24 * 60 * 60 * 1000;

    const expiresAt = new Date(Date.now() + duracao)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);

    const resultado = db.prepare(`
      INSERT INTO carts (session_token, currency, expires_at)
      VALUES (?, 'BRL', ?)
    `).run(tokenHash, expiresAt);

    res.cookie("neumam_cart", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: duracao,
      path: "/api",
    });

    res.status(201).json({
      mensagem: "Carrinho criado.",
      carrinho: {
        id: Number(resultado.lastInsertRowid),
        currency: "BRL",
        subtotal_cents: 0,
        discount_total_cents: 0,
        shipping_total_cents: 0,
        total_cents: 0,
        itens: [],
      },
    });
  } catch (erro) {
    responderErro(res, erro, "Não foi possível criar o carrinho.");
  }
});

router.get("/", (req, res) => {
  try {
    const carrinho = buscarCarrinho(obterTokenHash(req));

    if (!carrinho) {
      falhar(404, "Carrinho não encontrado.");
    }

    res.json({
      carrinho: montarResposta(carrinho),
    });
  } catch (erro) {
    responderErro(res, erro, "Não foi possível consultar o carrinho.");
  }
});

router.post("/items", (req, res) => {
  const { variant_id, quantity } = req.body || {};

  if (
    !Number.isSafeInteger(variant_id) ||
    variant_id < 1 ||
    !quantidadeValida(quantity)
  ) {
    return res.status(400).json({
      mensagem:
        "Informe uma variante válida e quantidade entre 1 e 100.",
    });
  }

  try {
    const adicionar = db.transaction(() => {
      const carrinho = exigirCarrinho(req);

      const existente = db.prepare(`
        SELECT quantity, status
        FROM cart_items
        WHERE cart_id = ?
          AND variant_id = ?
      `).get(carrinho.id, variant_id);

      const quantidadeAtual =
        existente?.status === "active" ? existente.quantity : 0;

      salvarItem(
        carrinho,
        variant_id,
        quantidadeAtual + quantity
      );

      return recalcularCarrinho(carrinho);
    });

    res.json({
      mensagem: "Item adicionado ao carrinho.",
      carrinho: adicionar.immediate(),
    });
  } catch (erro) {
    responderErro(res, erro, "Não foi possível adicionar o item.");
  }
});

router.patch("/items/:id", (req, res) => {
  const { quantity } = req.body || {};

  if (!quantidadeValida(quantity)) {
    return res.status(400).json({
      mensagem: "Informe uma quantidade inteira entre 1 e 100.",
    });
  }

  try {
    const itemId = obterItemId(req.params.id);

    const alterar = db.transaction(() => {
      const carrinho = exigirCarrinho(req);
      const item = buscarItem(carrinho.id, itemId);

      salvarItem(carrinho, item.variant_id, quantity);

      return recalcularCarrinho(carrinho);
    });

    res.json({
      mensagem: "Quantidade atualizada.",
      carrinho: alterar.immediate(),
    });
  } catch (erro) {
    responderErro(res, erro, "Não foi possível alterar a quantidade.");
  }
});

router.delete("/items/:id", (req, res) => {
  try {
    const itemId = obterItemId(req.params.id);

    const remover = db.transaction(() => {
      const carrinho = exigirCarrinho(req);
      const item = buscarItem(carrinho.id, itemId);

      db.prepare(`
        UPDATE cart_items
        SET status = 'removed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND cart_id = ?
      `).run(item.id, carrinho.id);

      return recalcularCarrinho(carrinho);
    });

    res.json({
      mensagem: "Item removido do carrinho.",
      carrinho: remover.immediate(),
    });
  } catch (erro) {
    responderErro(res, erro, "Não foi possível remover o item.");
  }
});

module.exports = router;