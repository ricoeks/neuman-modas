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
router.use(exigirPermissao("products.read"));

function inteiroPositivo(valor, padrao) {
  if (valor === undefined) {
    return padrao;
  }

  if (typeof valor !== "string" || !/^[1-9]\d*$/.test(valor)) {
    return null;
  }

  const numero = Number(valor);
  return Number.isSafeInteger(numero) ? numero : null;
}

router.get("/", (req, res) => {
  try {
    const page = inteiroPositivo(req.query.page, 1);
    const limit = inteiroPositivo(req.query.limit, 20);

    if (page === null || limit === null || limit > 100) {
      return res.status(400).json({
        mensagem: "Paginação inválida. Use limite entre 1 e 100.",
      });
    }

    const offset = (page - 1) * limit;

    if (!Number.isSafeInteger(offset)) {
      return res.status(400).json({
        mensagem: "Página acima do limite permitido.",
      });
    }

    const q = req.query.q;

    if (
      q !== undefined &&
      (
        typeof q !== "string" ||
        q.trim() === "" ||
        q.trim().length > 100 ||
        Array.from(q).some(
          (caractere) =>
            caractere.charCodeAt(0) < 32 ||
            caractere.charCodeAt(0) === 127
        )
      )
    ) {
      return res.status(400).json({
        mensagem: "Informe uma busca entre 1 e 100 caracteres.",
      });
    }

    const status = req.query.status;
    const statusPermitidos = [
      "draft",
      "active",
      "inactive",
      "blocked",
      "archived",
    ];

    if (
      status !== undefined &&
      (
        typeof status !== "string" ||
        !statusPermitidos.includes(status)
      )
    ) {
      return res.status(400).json({
        mensagem: "Informe um status válido.",
      });
    }

    const parametros = {
      searchTerm: q === undefined ? null : q.trim(),
      productStatus: status === undefined ? null : status,
    };

    const condicoes = `
      WHERE (
        @searchTerm IS NULL
        OR instr(lower(p.name), lower(@searchTerm)) > 0
        OR instr(lower(p.sku_base), lower(@searchTerm)) > 0
      )
      AND (
        @productStatus IS NULL
        OR p.status = @productStatus
      )
    `;

    const consultar = db.transaction(() => {
      const { total } = db.prepare(`
        SELECT COUNT(*) AS total
        FROM products AS p
        ${condicoes}
      `).get(parametros);

      const produtos = db.prepare(`
        SELECT
          p.id,
          p.sku_base,
          p.name,
          p.slug,
          p.brand,
          p.status,
          p.lifecycle_stage,
          p.category_id,
          c.name AS category_name,
          p.collection_id,
          p.created_at,
          p.updated_at,
          (
            SELECT COUNT(*)
            FROM product_variants AS v
            WHERE v.product_id = p.id
          ) AS variant_count
        FROM products AS p
        LEFT JOIN categories AS c
          ON c.id = p.category_id
        ${condicoes}
        ORDER BY p.id DESC
        LIMIT @limit OFFSET @offset
      `).all({ ...parametros, limit, offset });

      return {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        produtos,
      };
    });

    res.json(consultar());
  } catch (erro) {
    console.error("Erro ao listar produtos administrativos:", erro);

    res.status(500).json({
      mensagem: "Não foi possível consultar os produtos.",
    });
  }
});

module.exports = router;