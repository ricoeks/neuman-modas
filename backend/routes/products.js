const express = require("express");
const db = require("../database/connection");

const router = express.Router();

router.get("/", (req, res) => {
  try {
        const category = req.query.category;

    if (
      category !== undefined &&
      (typeof category !== "string" || category.trim() === "")
    ) {
      return res.status(400).json({
        mensagem: "Informe uma categoria válida.",
      });
    }

    const categorySlug = category === undefined ? null : category.trim();
        const q = req.query.q;

    if (
      q !== undefined &&
      (typeof q !== "string" || q.trim() === "" || q.trim().length > 100)
    ) {
      return res.status(400).json({
        mensagem: "Informe uma busca entre 1 e 100 caracteres.",
      });
    }

    const searchTerm = q === undefined ? null : q.trim();
        const pageText = req.query.page ?? "1";
    const limitText = req.query.limit ?? "12";

    if (
      typeof pageText !== "string" ||
      typeof limitText !== "string" ||
      !/^[1-9]\d*$/.test(pageText) ||
      !/^[1-9]\d*$/.test(limitText)
    ) {
      return res.status(400).json({
        mensagem: "Página e limite devem ser números inteiros positivos.",
      });
    }

    const page = Number(pageText);
    const limit = Number(limitText);
    const offset = (page - 1) * limit;

    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(limit) ||
      limit > 100 ||
      !Number.isSafeInteger(offset)
    ) {
      return res.status(400).json({
        mensagem: "Paginação inválida. O limite máximo é 100.",
      });
    }

        const sort = req.query.sort ?? "name";

    const ordenacoes = {
      name: "p.name ASC, p.id ASC",
      price_asc: "price_cents IS NULL, price_cents ASC, p.id ASC",
      price_desc: "price_cents IS NULL, price_cents DESC, p.id ASC",
    };

    if (
      typeof sort !== "string" ||
      !Object.prototype.hasOwnProperty.call(ordenacoes, sort)
    ) {
      return res.status(400).json({
        mensagem: "Ordenação inválida. Use name, price_asc ou price_desc.",
      });
    }

    const orderBy = ordenacoes[sort];

    const filtros = `
      WHERE p.status = 'active'
        AND (
          @searchTerm IS NULL
          OR instr(lower(p.name), lower(@searchTerm)) > 0
          OR instr(lower(p.sku_base), lower(@searchTerm)) > 0
        )
        AND (
          @categorySlug IS NULL
          OR EXISTS (
            SELECT 1
            FROM categories AS c
            WHERE c.id = p.category_id
              AND c.slug = @categorySlug
              AND c.status = 'active'
          )
        )
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
    `;

    const { total } = db.prepare(`
      SELECT COUNT(*) AS total
      FROM products AS p
      ${filtros}
    `).get({ categorySlug, searchTerm });

    const produtos = db.prepare(`
      SELECT
        p.id,
        p.sku_base,
        p.name,
        p.slug,
        p.brand,
        p.category_id,
        p.collection_id,
        p.short_description,
        p.description,
        m.url AS image_url,
        m.alt_text AS image_alt_text,
        preco.sale_price_cents,
        preco.promotional_price_cents,
        COALESCE(
          preco.promotional_price_cents,
          preco.sale_price_cents
        ) AS price_cents,
        preco.currency
      FROM products AS p
      LEFT JOIN product_media AS m
        ON m.id = (
          SELECT pm.id
          FROM product_media AS pm
          WHERE pm.product_id = p.id
            AND pm.media_type = 'image'
            AND pm.status = 'active'
          ORDER BY pm.is_primary DESC, pm.sort_order, pm.id
          LIMIT 1
        )
      LEFT JOIN variant_pricing AS preco
        ON preco.id = (
          SELECT vp.id
          FROM product_variants AS v
          JOIN variant_pricing AS vp
            ON vp.id = (
              SELECT atual.id
              FROM variant_pricing AS atual
              WHERE atual.variant_id = v.id
                AND atual.status = 'active'
                AND (
                  atual.valid_from IS NULL
                  OR datetime(atual.valid_from) <= datetime('now')
                )
                AND (
                  atual.valid_until IS NULL
                  OR datetime(atual.valid_until) > datetime('now')
                )
              ORDER BY
                datetime(atual.valid_from) DESC,
                atual.id DESC
              LIMIT 1
            )
          WHERE v.product_id = p.id
            AND v.status = 'active'
            AND vp.currency = 'BRL'
          ORDER BY
            COALESCE(
              vp.promotional_price_cents,
              vp.sale_price_cents
            ),
            v.id
          LIMIT 1
        )
            ${filtros}
            ORDER BY ${orderBy}
      LIMIT @limit OFFSET @offset
    `).all({ categorySlug, searchTerm, limit, offset });

        res.json({
      total,
      page,
      limit,
      sort,
      total_pages: Math.ceil(total / limit),
      produtos,
    });
      } catch (erro) {
    console.error("Erro ao listar produtos:", erro);
    res.status(500).json({
      mensagem: "Não foi possível listar os produtos.",
    });
  }
});

router.get("/:slug", (req, res) => {
  try {
          const produto = db.prepare(`
      SELECT
        p.id,
        p.sku_base,
        p.name,
        p.slug,
        p.brand,
        p.category_id,
        p.collection_id,
        p.short_description,
        p.description
      FROM products AS p
      WHERE p.slug = ?
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
    `).get(req.params.slug);

    if (!produto) {
      return res.status(404).json({
        mensagem: "Produto não encontrado.",
      });
    }

        const variantes = db.prepare(`
      SELECT
        v.id,
        v.sku,
        v.color_name,
        v.color_code,
        v.size_name,
        v.size_code,
        p.sale_price_cents,
        p.promotional_price_cents,
                p.currency,
        i.source_type,
        i.available_quantity,
        i.availability_status,
        i.lead_time_days,
                i.last_checked_at,
        s.weight,
        s.package_weight,
        s.height,
        s.width,
        s.length,
        s.weight_unit,
        s.dimension_unit
      FROM product_variants AS v
      LEFT JOIN variant_pricing AS p
        ON p.id = (
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
              LEFT JOIN variant_shipping AS s
        ON s.variant_id = v.id
        AND s.status = 'active'
      WHERE v.product_id = ?
        AND v.status = 'active'
      ORDER BY v.id
    `).all(produto.id);

        const imagens = db.prepare(`
      SELECT
        id,
        variant_id,
        url,
        alt_text,
        title,
        is_primary,
        sort_order
      FROM product_media
      WHERE product_id = ?
        AND media_type = 'image'
        AND status = 'active'
      ORDER BY is_primary DESC, sort_order, id
    `).all(produto.id);

        const atributos = db.prepare(`
      SELECT
        pa.id,
        a.code,
        a.name,
        a.type,
        av.value AS selected_value,
        pa.value_text,
        pa.value_number,
        pa.value_boolean,
        pa.value_date
      FROM product_attributes AS pa
      JOIN attributes AS a
        ON a.id = pa.attribute_id
      LEFT JOIN attribute_values AS av
        ON av.id = pa.attribute_value_id
        AND av.attribute_id = pa.attribute_id
      WHERE pa.product_id = ?
      ORDER BY a.id, av.sort_order, pa.id
    `).all(produto.id);

    const tags = db.prepare(`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.description,
        t.tag_type,
        t.sort_order
      FROM tags AS t
      JOIN product_tags AS pt
        ON pt.tag_id = t.id
      WHERE pt.product_id = ?
        AND t.status = 'active'
      ORDER BY t.sort_order, t.id
    `).all(produto.id);

        const seo = db.prepare(`
      SELECT
        seo_title,
        meta_description,
        meta_keywords,
        canonical_url,
        robots_index,
        robots_follow,
        og_title,
        og_description,
        og_image_url,
        schema_type
      FROM product_seo
      WHERE product_id = ?
        AND status = 'active'
    `).get(produto.id);

    res.json({
      produto: {
        ...produto,
        variantes,
         imagens,
         atributos,
          tags,
          seo: seo ?? null,
      },
    });
  } catch (erro) {
    console.error("Erro ao consultar produto:", erro);
    res.status(500).json({
      mensagem: "Não foi possível consultar o produto.",
    });
  }
});

module.exports = router;