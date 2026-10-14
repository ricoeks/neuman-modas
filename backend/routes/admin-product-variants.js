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


function falharVariante(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  throw erro;
}

function validarTextoVariante(valor, nome, limite, obrigatorio = true) {
  if (valor === null && !obrigatorio) return null;

  if (typeof valor !== "string") {
    falharVariante(400, "Confira " + nome + ".");
  }

  const resultado = valor.trim();

  if (!resultado) {
    if (obrigatorio) {
      falharVariante(400, "Informe " + nome + ".");
    }
    return null;
  }

  if (
    resultado.length > limite ||
    /[\x00-\x1F\x7F]/.test(resultado)
  ) {
    falharVariante(400, "Confira " + nome + ".");
  }

  return resultado;
}

function validarCentavos(valor, nome, obrigatorio = false) {
  if (valor === null && !obrigatorio) return null;

  if (
    !Number.isSafeInteger(valor) ||
    valor < 0
  ) {
    falharVariante(400, "Informe um valor valido para " + nome + ".");
  }

  return valor;
}

function validarQuantidade(valor, nome) {
  if (!Number.isSafeInteger(valor) || valor < 0) {
    falharVariante(400, "Informe um valor valido para " + nome + ".");
  }

  return valor;
}


router.post(
  "/:id/variants",
  protegerAlteracao,
  exigirPermissao("products.variants.manage"),
  (req, res) => {
    try {
      const valorId = req.params.id;

      if (!/^[1-9]\d*$/.test(valorId)) {
        falharVariante(400, "Identificador de produto inválido.");
      }

      const productId = Number(valorId);

      if (!Number.isSafeInteger(productId)) {
        falharVariante(400, "Identificador de produto inválido.");
      }

      const corpo = req.body;

      if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
        falharVariante(400, "Informe os dados da variante.");
      }

      const camposPermitidos = [
        "sku",
        "ean",
        "color_name",
        "color_code",
        "size_name",
        "size_code",
        "sale_price_cents",
        "cost_price_cents",
        "promotional_price_cents",
        "available_quantity",
        "source_type",
        "lead_time_days",
      ];

      if (Object.keys(corpo).some(
        (campo) => !camposPermitidos.includes(campo)
      )) {
        falharVariante(400, "Existem campos não permitidos.");
      }

      const sku = validarTextoVariante(corpo.sku, "o SKU", 100);
      const ean = corpo.ean == null
        ? null
        : validarTextoVariante(corpo.ean, "o EAN", 32, false);

      const colorName = validarTextoVariante(
        corpo.color_name, "a cor", 100
      );

      const colorCode = validarTextoVariante(
        corpo.color_code, "o código da cor", 50
      );

      const sizeName = validarTextoVariante(
        corpo.size_name, "o tamanho", 50
      );

      const sizeCode = validarTextoVariante(
        corpo.size_code, "o código do tamanho", 50
      );

      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sku)) {
        falharVariante(400, "SKU contém caracteres inválidos.");
      }

      if (
        !/^[A-Za-z0-9_-]+$/.test(colorCode) ||
        !/^[A-Za-z0-9_-]+$/.test(sizeCode)
      ) {
        falharVariante(400, "Confira os códigos da cor e do tamanho.");
      }

      if (ean !== null && !/^[0-9]{8,14}$/.test(ean)) {
        falharVariante(400, "EAN deve conter de 8 a 14 dígitos.");
      }

      const salePrice = validarCentavos(
        corpo.sale_price_cents, "preço de venda", true
      );

      const costPrice = validarCentavos(
        corpo.cost_price_cents ?? null, "preço de custo"
      );

      const promotionalPrice = validarCentavos(
        corpo.promotional_price_cents ?? null,
        "preço promocional"
      );

      if (
        promotionalPrice !== null &&
        promotionalPrice > salePrice
      ) {
        falharVariante(
          400,
          "O preço promocional não pode superar o preço de venda."
        );
      }

      const quantidade = validarQuantidade(
        corpo.available_quantity, "estoque"
      );

      const sourceType = corpo.source_type ?? "supplier";

      if (![
        "supplier", "own_stock", "dropship"
      ].includes(sourceType)) {
        falharVariante(400, "Origem do estoque inválida.");
      }

      const leadTime = validarQuantidade(
        corpo.lead_time_days ?? 5, "prazo de entrega"
      );

      const cadastrar = db.transaction(() => {
        const produto = db.prepare(`
          SELECT id, name, status
          FROM products
          WHERE id = ?
        `).get(productId);

        if (!produto) {
          falharVariante(404, "Produto não encontrado.");
        }

        const skuExistente = db.prepare(`
          SELECT id
          FROM product_variants
          WHERE sku = ?
        `).get(sku);

        if (skuExistente) {
          falharVariante(409, "Já existe uma variante com esse SKU.");
        }

        const combinacaoExistente = db.prepare(`
          SELECT id
          FROM product_variants
          WHERE product_id = ?
            AND UPPER(TRIM(color_code)) = UPPER(?)
            AND UPPER(TRIM(size_code)) = UPPER(?)
        `).get(productId, colorCode, sizeCode);

        if (combinacaoExistente) {
          falharVariante(
            409,
            "Este produto já possui essa combinação de cor e tamanho."
          );
        }

        const criada = db.prepare(`
          INSERT INTO product_variants (
            product_id, sku, ean,
            color_name, color_code,
            size_name, size_code, status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `).run(
          productId, sku, ean,
          colorName, colorCode,
          sizeName, sizeCode
        );

        const variantId = Number(criada.lastInsertRowid);

        db.prepare(`
          INSERT INTO variant_pricing (
            variant_id,
            cost_price_cents,
            sale_price_cents,
            promotional_price_cents,
            currency,
            status
          )
          VALUES (?, ?, ?, ?, 'BRL', 'active')
        `).run(
          variantId,
          costPrice,
          salePrice,
          promotionalPrice
        );

        const availabilityStatus =
          quantidade === 0 ? "out_of_stock" : "available";

        db.prepare(`
          INSERT INTO variant_inventory (
            variant_id,
            source_type,
            available_quantity,
            availability_status,
            lead_time_days
          )
          VALUES (?, ?, ?, ?, ?)
        `).run(
          variantId,
          sourceType,
          quantidade,
          availabilityStatus,
          leadTime
        );

        db.prepare(`
          INSERT INTO admin_audit_logs (
            admin_user_id,
            actor_name,
            action,
            entity_type,
            entity_id,
            description,
            ip_address
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.admin.id,
          req.admin.name,
          "products.variants.create",
          "product_variants",
          variantId,
          JSON.stringify({
            product_id: productId,
            sku,
            color_code: colorCode,
            size_code: sizeCode,
            sale_price_cents: salePrice,
            available_quantity: quantidade
          }),
          req.ip || null
        );

        return {
          mensagem: "Variante cadastrada com sucesso.",
          variant_id: variantId,
          product_id: productId,
          sku
        };
      });

      return res.status(201).json(cadastrar.immediate());

    } catch (erro) {
      if (erro.status && erro.status < 500) {
        return res.status(erro.status).json({
          mensagem: erro.message
        });
      }

      if (
        erro.code === "SQLITE_CONSTRAINT_UNIQUE" ||
        erro.code === "SQLITE_CONSTRAINT_PRIMARYKEY"
      ) {
        return res.status(409).json({
          mensagem: "SKU ou EAN já cadastrado."
        });
      }

      console.error("Erro ao cadastrar variante:", erro);

      return res.status(500).json({
        mensagem: "Não foi possível cadastrar a variante."
      });
    }
  }
);

module.exports = router;
