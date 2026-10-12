const db = require("./connection");

// ======================================================
// 1. TABELAS EXISTENTES
// ======================================================

const tabelas = db
  .prepare(
    `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name;
  `,
  )
  .all();

console.log("\nTabelas existentes no banco:");

console.table(tabelas);

// ======================================================
// 2. CATEGORIAS
// ======================================================

const categorias = db
  .prepare(
    `
    SELECT
      id,
      parent_id,
      name,
      slug,
      description,
      status,
      sort_order,
      created_at,
      updated_at
    FROM categories
    ORDER BY id;
  `,
  )
  .all();

console.log("\nCategorias cadastradas:");

console.table(categorias);

// ======================================================
// 3. COLEÇÕES
// ======================================================

const colecoes = db
  .prepare(
    `
    SELECT
      id,
      name,
      slug,
      description,
      start_date,
      end_date,
      status,
      created_at,
      updated_at
    FROM collections
    ORDER BY id;
  `,
  )
  .all();

console.log("\nColeções cadastradas:");

console.table(colecoes);

// ======================================================
// 4. PRODUTOS
// ======================================================

const produtos = db
  .prepare(
    `
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
      col.name AS collection_name
    FROM products p

    LEFT JOIN categories c
      ON c.id = p.category_id

    LEFT JOIN collections col
      ON col.id = p.collection_id

    ORDER BY p.id;
  `,
  )
  .all();

console.log("\nProdutos cadastrados:");

console.table(produtos);

// ======================================================
// 5. VARIANTES
// ======================================================

const variantes = db
  .prepare(
    `
    SELECT
      v.id,
      v.sku,
      v.ean,
      v.color_name,
      v.color_code,
      v.size_name,
      v.size_code,
      v.status,
      v.product_id,
      p.name AS product_name
    FROM product_variants v

    LEFT JOIN products p
      ON p.id = v.product_id

    ORDER BY
      v.product_id,
      v.color_name,
      v.size_name,
      v.id;
  `,
  )
  .all();

console.log("\nVariantes cadastradas:");

console.table(variantes);

// ======================================================
// 6. PREÇOS DAS VARIANTES
// ======================================================

const precosVariantes = db
  .prepare(
    `
    SELECT
      vp.id,
      vp.variant_id,
      pv.sku,
      p.name AS product_name,
      pv.color_name,
      pv.size_name,
     vp.cost_price_cents / 100.0 AS cost_price,
vp.sale_price_cents / 100.0 AS sale_price,
vp.promotional_price_cents / 100.0 AS promotional_price,
      vp.currency,
      vp.status,
      vp.valid_from,
      vp.valid_until,
      vp.created_at,
      vp.updated_at
    FROM variant_pricing vp

    INNER JOIN product_variants pv
      ON pv.id = vp.variant_id

    INNER JOIN products p
      ON p.id = pv.product_id

    ORDER BY
      p.id,
      pv.color_name,
      pv.size_name,
      pv.id,
      vp.id;
  `,
  )
  .all();

console.log("\nPreços das variantes:");

console.table(precosVariantes);

// ======================================================
// 7. DADOS COMERCIAIS DAS VARIANTES
// ======================================================

const dadosComerciaisVariantes = db
  .prepare(
    `
    SELECT
      vc.id,
      vc.variant_id,
      pv.sku,
      p.name AS product_name,
      pv.color_name,
      pv.size_name,
      vc.minimum_price_cents / 100.0 AS minimum_price,
      vc.target_margin_percent,
      vc.target_markup_percent,
      vc.commission_percent,
      vc.operational_cost_cents / 100.0 AS operational_cost,
      vc.tax_percent,
      vc.status,
      vc.created_at,
      vc.updated_at
    FROM variant_commercial vc

    INNER JOIN product_variants pv
      ON pv.id = vc.variant_id

    INNER JOIN products p
      ON p.id = pv.product_id

    ORDER BY
      p.id,
      pv.color_name,
      pv.size_name,
      pv.id;
  `,
  )
  .all();

console.log("\nDados comerciais das variantes:");

console.table(dadosComerciaisVariantes);

// ======================================================
// 7. DISPONIBILIDADE DAS VARIANTES
// ======================================================

const disponibilidadeVariantes = db
  .prepare(
    `
    SELECT
      vi.id,
      vi.variant_id,
      pv.sku,
      p.name AS product_name,
      pv.color_name,
      pv.size_name,
      vi.source_type,
      vi.available_quantity,
      vi.availability_status,
      vi.lead_time_days,
      vi.last_checked_at,
      vi.created_at,
      vi.updated_at
    FROM variant_inventory vi

    INNER JOIN product_variants pv
      ON pv.id = vi.variant_id

    INNER JOIN products p
      ON p.id = pv.product_id

    ORDER BY
      p.id,
      pv.color_name,
      pv.size_name,
      pv.id;
  `,
  )
  .all();

console.log("\nDisponibilidade das variantes:");

console.table(disponibilidadeVariantes);

// ======================================================
// 8. FORNECEDORES
// ======================================================

const fornecedores = db
  .prepare(
    `
    SELECT
      id,
      code,
      name,
      legal_name,
      document,
      contact_name,
      email,
      phone,
      whatsapp,
      website,
      address_line,
      city,
      state,
      postal_code,
      country,
      default_lead_time_days,
      status,
      notes,
      created_at,
      updated_at
    FROM suppliers
    ORDER BY id;
  `,
  )
  .all();

console.log("\nFornecedores cadastrados:");

console.table(fornecedores);

// ======================================================
// 9. FORNECEDORES DAS VARIANTES
// ======================================================

const fornecedoresVariantes = db
  .prepare(
    `
    SELECT
      sv.id,
      sv.supplier_id,
      s.code AS supplier_code,
      s.name AS supplier_name,
      sv.variant_id,
      pv.sku AS variant_sku,
      p.name AS product_name,
      pv.color_name,
      pv.size_name,
      sv.supplier_sku,
      sv.supplier_cost_cents / 100.0 AS supplier_cost,
      sv.available_quantity,
      sv.availability_status,
      sv.lead_time_days,
      sv.is_preferred,
      sv.status,
      sv.last_checked_at,
      sv.created_at,
      sv.updated_at
    FROM supplier_variants sv

    INNER JOIN suppliers s
      ON s.id = sv.supplier_id

    INNER JOIN product_variants pv
      ON pv.id = sv.variant_id

    INNER JOIN products p
      ON p.id = pv.product_id

    ORDER BY
      p.id,
      s.id,
      pv.color_name,
      pv.size_name,
      pv.id;
  `,
  )
  .all();

console.log("\nFornecedores vinculados às variantes:");

console.table(fornecedoresVariantes);

// ======================================================
// 10. MÍDIAS DOS PRODUTOS
// ======================================================

const midiasProdutos = db
  .prepare(
    `
    SELECT
      pm.id,
      pm.product_id,
      p.name AS product_name,
      pm.variant_id,
      pv.sku AS variant_sku,
      pv.color_name,
      pv.size_name,
      pm.media_type,
      pm.url,
      pm.alt_text,
      pm.title,
      pm.is_primary,
      pm.sort_order,
      pm.status,
      pm.created_at,
      pm.updated_at
    FROM product_media pm

    INNER JOIN products p
      ON p.id = pm.product_id

    LEFT JOIN product_variants pv
      ON pv.id = pm.variant_id

    ORDER BY
      pm.product_id,
      pm.is_primary DESC,
      pm.sort_order,
      pm.id;
  `,
  )
  .all();

console.log("\nMídias dos produtos:");

console.table(midiasProdutos);

// ======================================================
// 11. DADOS DE FRETE DAS VARIANTES
// ======================================================

const fretesVariantes = db
  .prepare(
    `
    SELECT
      vs.id,
      vs.variant_id,
      pv.sku,
      p.name AS product_name,
      pv.color_name,
      pv.size_name,
      vs.weight,
      vs.package_weight,
      vs.height,
      vs.width,
      vs.length,
      vs.weight_unit,
      vs.dimension_unit,
      vs.status,
      vs.created_at,
      vs.updated_at
    FROM variant_shipping vs

    INNER JOIN product_variants pv
      ON pv.id = vs.variant_id

    INNER JOIN products p
      ON p.id = pv.product_id

    ORDER BY
      p.id,
      pv.color_name,
      pv.size_name,
      pv.id;
  `,
  )
  .all();

console.log("\nDados de frete das variantes:");

console.table(fretesVariantes);

// ======================================================
// 12. SEO DOS PRODUTOS
// ======================================================

const seoProdutos = db
  .prepare(
    `
    SELECT
      ps.id,
      ps.product_id,
      p.sku_base,
      p.name AS product_name,
      p.slug AS product_slug,
      ps.seo_title,
      ps.meta_description,
      ps.meta_keywords,
      ps.canonical_url,
      ps.robots_index,
      ps.robots_follow,
      ps.og_title,
      ps.og_description,
      ps.og_image_url,
      ps.schema_type,
      ps.status,
      ps.created_at,
      ps.updated_at
    FROM product_seo ps

    INNER JOIN products p
      ON p.id = ps.product_id

    ORDER BY
      ps.product_id,
      ps.id;
  `,
  )
  .all();

console.log("\nSEO dos produtos:");

console.table(seoProdutos);

// ======================================================
// 13. ATRIBUTOS
// ======================================================

const atributos = db
  .prepare(
    `
    SELECT
      id,
      name,
      code,
      type,
      is_filterable,
      is_required,
      created_at,
      updated_at
    FROM attributes
    ORDER BY id;
  `,
  )
  .all();

console.log("\nAtributos cadastrados:");

console.table(atributos);

// ======================================================
// 14. VALORES DOS ATRIBUTOS
// ======================================================

const valoresAtributos = db
  .prepare(
    `
    SELECT
      av.id,
      a.name AS attribute_name,
      a.code AS attribute_code,
      av.value,
      av.code,
      av.sort_order
    FROM attribute_values av

    INNER JOIN attributes a
      ON a.id = av.attribute_id

    ORDER BY
      a.id,
      av.sort_order,
      av.id;
  `,
  )
  .all();

console.log("\nValores dos atributos cadastrados:");

console.table(valoresAtributos);

// ======================================================
// 15. ATRIBUTOS ASSOCIADOS AOS PRODUTOS
// ======================================================

const atributosProdutos = db
  .prepare(
    `
    SELECT
      pa.id,
      p.name AS product_name,
      p.sku_base,
      a.name AS attribute_name,
      a.code AS attribute_code,

      CASE
        WHEN pa.attribute_value_id IS NOT NULL
          THEN av.value

        WHEN pa.value_text IS NOT NULL
          THEN pa.value_text

        WHEN pa.value_number IS NOT NULL
          THEN CAST(pa.value_number AS TEXT)

        WHEN pa.value_boolean IS NOT NULL
          THEN CASE
            WHEN pa.value_boolean = 1 THEN 'Sim'
            ELSE 'Não'
          END

        WHEN pa.value_date IS NOT NULL
          THEN pa.value_date

        ELSE NULL
      END AS attribute_value

    FROM product_attributes pa

    INNER JOIN products p
      ON p.id = pa.product_id

    INNER JOIN attributes a
      ON a.id = pa.attribute_id

    LEFT JOIN attribute_values av
      ON av.id = pa.attribute_value_id

    ORDER BY
      p.id,
      a.id,
      pa.id;
  `,
  )
  .all();

console.log("\nAtributos associados aos produtos:");

console.table(atributosProdutos);

// ======================================================
// 16. PUBLICAÇÕES DOS PRODUTOS
// ======================================================

const publicacoesProdutos = db
  .prepare(
    `
    SELECT
      pp.id,
      pp.product_id,
      p.sku_base,
      p.name AS product_name,
      pp.channel,
      pp.is_published,
      pp.is_visible,
      pp.is_featured,
      pp.sort_order,
      pp.published_at,
      pp.unpublished_at,
      pp.status,
      pp.created_at,
      pp.updated_at
    FROM product_publication pp

    INNER JOIN products p
      ON p.id = pp.product_id

    ORDER BY
      pp.product_id,
      pp.channel,
      pp.id;
  `,
  )
  .all();

console.log("\nPublicações dos produtos:");

console.table(publicacoesProdutos);

// ======================================================
// 17. HISTÓRICO DOS PRODUTOS
// ======================================================

const historicoProdutos = db
  .prepare(
    `
    SELECT
      ph.id,
      ph.product_id,
      p.sku_base,
      p.name AS product_name,
      ph.event_type,
      ph.field_name,
      ph.old_value,
      ph.new_value,
      ph.description,
      ph.changed_by,
      ph.created_at
    FROM product_history ph

    INNER JOIN products p
      ON p.id = ph.product_id

    ORDER BY
      ph.product_id,
      ph.created_at,
      ph.id;
  `,
  )
  .all();

console.log("\nHistórico dos produtos:");

console.table(historicoProdutos);

// ======================================================
// 18. TAGS
// ======================================================

const tags = db
  .prepare(
    `
    SELECT
      id,
      name,
      slug,
      description,
      tag_type,
      status,
      sort_order,
      created_at,
      updated_at
    FROM tags
    ORDER BY
      sort_order,
      id;
  `,
  )
  .all();

console.log("\nTags cadastradas:");

console.table(tags);

// ======================================================
// 19. TAGS ASSOCIADAS AOS PRODUTOS
// ======================================================

const tagsProdutos = db
  .prepare(
    `
    SELECT
      pt.id,
      pt.product_id,
      p.sku_base,
      p.name AS product_name,
      pt.tag_id,
      t.name AS tag_name,
      t.slug AS tag_slug,
      t.tag_type,
      t.status,
      t.sort_order,
      pt.created_at
    FROM product_tags pt

    INNER JOIN products p
      ON p.id = pt.product_id

    INNER JOIN tags t
      ON t.id = pt.tag_id

    ORDER BY
      pt.product_id,
      t.sort_order,
      t.id;
  `,
  )
  .all();

console.log("\nTags associadas aos produtos:");

console.table(tagsProdutos);

// ======================================================
// 20. RELACIONAMENTOS ENTRE PRODUTOS
// ======================================================

const relacionamentosProdutos = db
  .prepare(
    `
    SELECT
      pr.id,
      pr.product_id,
      p.sku_base AS product_sku,
      p.name AS product_name,
      pr.related_product_id,
      rp.sku_base AS related_product_sku,
      rp.name AS related_product_name,
      pr.relation_type,
      pr.description,
      pr.sort_order,
      pr.status,
      pr.created_at,
      pr.updated_at
    FROM product_relations pr

    INNER JOIN products p
      ON p.id = pr.product_id

    INNER JOIN products rp
      ON rp.id = pr.related_product_id

    ORDER BY
      pr.product_id,
      pr.relation_type,
      pr.sort_order,
      pr.id;
  `,
  )
  .all();

console.log("\nRelacionamentos entre produtos:");

console.table(relacionamentosProdutos);

// ======================================================
// 21. CLIENTES
// ======================================================

const clientes = db
  .prepare(
    `
    SELECT
      id,
      first_name,
      last_name,
      email,
      phone,
      whatsapp,
      document,
      birth_date,
      status,
      accepts_marketing,
      notes,
      created_at,
      updated_at
    FROM customers
    ORDER BY
      first_name,
      last_name,
      id;
  `,
  )
  .all();

console.log("\nClientes cadastrados:");

console.table(clientes);

// ======================================================
// 22. ENDEREÇOS DOS CLIENTES
// ======================================================

const enderecosClientes = db
  .prepare(
    `
    SELECT
      ca.id,
      ca.customer_id,
      c.first_name,
      c.last_name,
      c.email,
      ca.label,
      ca.address_type,
      ca.recipient_name,
      ca.postal_code,
      ca.street,
      ca.number,
      ca.complement,
      ca.neighborhood,
      ca.city,
      ca.state,
      ca.country,
      ca.is_default,
      ca.status,
      ca.created_at,
      ca.updated_at
    FROM customer_addresses ca

    INNER JOIN customers c
      ON c.id = ca.customer_id

    ORDER BY
      ca.customer_id,
      ca.is_default DESC,
      ca.id;
  `,
  )
  .all();

console.log("\nEndereços dos clientes:");

console.table(enderecosClientes);

// ======================================================
// 23. PEDIDOS
// ======================================================

const pedidos = db
  .prepare(
    `
    SELECT
      o.id,
      o.order_number,
      o.customer_id,
      c.first_name,
      c.last_name,
      o.status,
      o.payment_status,
      o.fulfillment_status,
      o.subtotal_cents / 100.0 AS subtotal,
      o.discount_total_cents / 100.0 AS discount_total,
      o.shipping_total_cents / 100.0 AS shipping_total,
      o.tax_total_cents / 100.0 AS tax_total,
      o.total_cents / 100.0 AS total,
      o.currency,
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      o.shipping_postal_code,
      o.shipping_street,
      o.shipping_number,
      o.shipping_complement,
      o.shipping_neighborhood,
      o.shipping_city,
      o.shipping_state,
      o.shipping_country,
      o.notes,
      o.placed_at,
      o.confirmed_at,
      o.cancelled_at,
      o.completed_at,
      o.created_at,
      o.updated_at
    FROM orders o

    LEFT JOIN customers c
      ON c.id = o.customer_id

    ORDER BY
      o.created_at,
      o.id;
  `,
  )
  .all();

console.log("\nPedidos cadastrados:");

console.table(pedidos);

// ======================================================
// 24. ITENS DOS PEDIDOS
// ======================================================

const itensPedidos = db
  .prepare(
    `
    SELECT
      oi.id,
      oi.order_id,
      o.order_number,
      oi.product_id,
      oi.variant_id,
      oi.product_name,
      oi.product_sku,
      oi.variant_sku,
      oi.color_name,
      oi.size_name,
      oi.quantity,
      oi.unit_price_cents / 100.0 AS unit_price,
      oi.discount_total_cents / 100.0 AS discount_total,
      oi.tax_total_cents / 100.0 AS tax_total,
      oi.line_total_cents / 100.0 AS line_total,
      oi.currency,
      oi.status,
      oi.created_at,
      oi.updated_at
    FROM order_items oi

    INNER JOIN orders o
      ON o.id = oi.order_id

    ORDER BY
      oi.order_id,
      oi.id;
  `,
  )
  .all();

console.log("\nItens dos pedidos:");

console.table(itensPedidos);

// ======================================================
// 25. PAGAMENTOS
// ======================================================

const pagamentos = db
  .prepare(
    `
    SELECT
      pay.id,
      pay.order_id,
      o.order_number,
      pay.payment_method,
      pay.status,
     pay.amount_cents / 100.0 AS amount,
      pay.currency,
      pay.installments,
      pay.provider,
      pay.external_transaction_id,
      pay.authorization_code,
      pay.pix_transaction_id,
      pay.pix_copy_paste,
      pay.boleto_barcode,
      pay.boleto_due_date,
      pay.card_brand,
      pay.card_last_four,
      pay.authorized_at,
      pay.paid_at,
      pay.failed_at,
      pay.cancelled_at,
      pay.refunded_at,
      pay.notes,
      pay.created_at,
      pay.updated_at
    FROM payments pay

    INNER JOIN orders o
      ON o.id = pay.order_id

    ORDER BY
      pay.order_id,
      pay.created_at,
      pay.id;
  `,
  )
  .all();

console.log("\nPagamentos:");

console.table(pagamentos);

// ======================================================
// 26. ENTREGAS DOS PEDIDOS
// ======================================================

const entregasPedidos = db
  .prepare(
    `
    SELECT
      s.id,
      s.order_id,
      o.order_number,
      s.status,
      s.shipping_method,
      s.carrier,
      s.service_name,
      s.tracking_code,
      s.tracking_url,
     s.shipping_cost_cents / 100.0 AS shipping_cost,
      s.recipient_name,
      s.postal_code,
      s.street,
      s.number,
      s.complement,
      s.neighborhood,
      s.city,
      s.state,
      s.country,
      s.estimated_delivery_date,
      s.shipped_at,
      s.delivered_at,
      s.failed_at,
      s.returned_at,
      s.cancelled_at,
      s.notes,
      s.created_at,
      s.updated_at
    FROM shipments s

    INNER JOIN orders o
      ON o.id = s.order_id

    ORDER BY
      s.order_id,
      s.created_at,
      s.id;
  `,
  )
  .all();

console.log("\nEntregas dos pedidos:");

console.table(entregasPedidos);

// ============================================================
// 27. CUPONS
// ============================================================

const cupons = db
  .prepare(`
    SELECT
      id,
      code,
      name,
      description,
      discount_type,
      discount_percent,
discount_amount_cents / 100.0 AS discount_amount,
minimum_order_value_cents / 100.0 AS minimum_order_value,
maximum_discount_value_cents / 100.0 AS maximum_discount_value,
      usage_limit,
      usage_limit_per_customer,
      usage_count,
      starts_at,
      expires_at,
      status,
      created_at,
      updated_at
    FROM coupons
    ORDER BY id;
  `)
  .all();

console.log("\nCupons:");
console.table(cupons);

// ======================================================
// 28. USO DE CUPONS
// ======================================================

const usosCupons = db
  .prepare(`
    SELECT
      cu.id,
      cu.coupon_id,
      c.code AS coupon_code_cadastrado,
      cu.coupon_code,
      cu.order_id,
      o.order_number,
      cu.customer_id,
      customer.first_name,
      customer.last_name,
      cu.discount_type,
      cu.discount_percent,
cu.discount_value_cents / 100.0 AS discount_value,
cu.discount_amount_cents / 100.0 AS discount_amount,
cu.order_subtotal_cents / 100.0 AS order_subtotal,
      cu.used_at,
      cu.status,
      cu.notes,
      cu.created_at,
      cu.updated_at
    FROM coupon_usages cu

    INNER JOIN coupons c
      ON c.id = cu.coupon_id

    INNER JOIN orders o
      ON o.id = cu.order_id

    LEFT JOIN customers customer
      ON customer.id = cu.customer_id

    ORDER BY
      cu.used_at,
      cu.id;
  `)
  .all();

console.log("\nUsos de cupons:");

console.table(usosCupons);

// ======================================================
// 29. CARRINHOS
// ======================================================

const carrinhos = db
  .prepare(`
    SELECT
      c.id,
      c.customer_id,
      customer.first_name,
      customer.last_name,
      c.session_token,
      c.status,
      c.currency,
     c.subtotal_cents / 100.0 AS subtotal,
c.discount_total_cents / 100.0 AS discount_total,
c.shipping_total_cents / 100.0 AS shipping_total,
c.total_cents / 100.0 AS total,
      c.coupon_code,
      c.expires_at,
      c.converted_order_id,
      o.order_number AS converted_order_number,
      c.created_at,
      c.updated_at
    FROM carts c

    LEFT JOIN customers customer
      ON customer.id = c.customer_id

    LEFT JOIN orders o
      ON o.id = c.converted_order_id

    ORDER BY
      c.created_at,
      c.id;
  `)
  .all();

console.log("\nCarrinhos:");

console.table(carrinhos);

// ======================================================
// 30. ITENS DO CARRINHO
// ======================================================

const itensCarrinho = db
  .prepare(`
    SELECT
      ci.id,
      ci.cart_id,
      c.customer_id,
      customer.first_name,
      customer.last_name,
      c.session_token,
      ci.product_id,
      ci.variant_id,
      ci.product_name,
      ci.product_sku,
      ci.variant_sku,
      ci.color_name,
      ci.size_name,
      ci.quantity,
     ci.unit_price_cents / 100.0 AS unit_price,
ci.discount_total_cents / 100.0 AS discount_total,
ci.line_total_cents / 100.0 AS line_total,
      ci.currency,
      ci.status,
      ci.created_at,
      ci.updated_at
    FROM cart_items ci

    INNER JOIN carts c
      ON c.id = ci.cart_id

    LEFT JOIN customers customer
      ON customer.id = c.customer_id

    ORDER BY
      ci.cart_id,
      ci.created_at,
      ci.id;
  `)
  .all();

console.log("\nItens do carrinho:");

console.table(itensCarrinho);

// ======================================================
// 31. LISTA DE DESEJOS
// ======================================================

const listasDesejos = db
  .prepare(`
    SELECT
      w.id,
      w.customer_id,

      c.first_name,
      c.last_name,
      c.email,

      w.name,
      w.description,
      w.is_default,
      w.status,
      w.created_at,
      w.updated_at

    FROM wishlists w

    INNER JOIN customers c
      ON c.id = w.customer_id

    ORDER BY
      w.customer_id,
      w.is_default DESC,
      w.id
  `)
  .all();

console.log("\nListas de desejos:");

if (listasDesejos.length === 0) {
  console.log("Nenhuma lista de desejos cadastrada.");
} else {
  console.table(listasDesejos);
}

// ======================================================
// 32. ITENS DA LISTA DE DESEJOS
// ======================================================

const itensListasDesejos = db
  .prepare(`
    SELECT
      wi.id,
      wi.wishlist_id,

      w.name AS wishlist_name,

      wi.product_id,
      wi.variant_id,

      wi.product_name,
      wi.product_sku,
      wi.variant_sku,
      wi.color_name,
      wi.size_name,

      wi.status,
      wi.added_at,
      wi.created_at,
      wi.updated_at

    FROM wishlist_items wi

    INNER JOIN wishlists w
      ON w.id = wi.wishlist_id

    ORDER BY
      wi.wishlist_id,
      wi.id
  `)
  .all();

console.log("\nItens das listas de desejos:");

if (itensListasDesejos.length === 0) {
  console.log("Nenhum item em lista de desejos cadastrado.");
} else {
  console.table(itensListasDesejos);
}

// ======================================================
// 33. AVALIAÇÕES DE PRODUTOS
// ======================================================

const avaliacoesProdutos = db
  .prepare(`
    SELECT
      pr.id,

      pr.product_id,
      p.name AS product_name,

      pr.variant_id,
      pv.sku AS variant_sku,

      pr.customer_id,
      c.first_name,
      c.last_name,

      pr.order_id,
      o.order_number,

      pr.rating,
      pr.title,
      pr.comment,
      pr.customer_name,

      pr.is_verified_purchase,
      pr.status,

      pr.admin_reply,
      pr.admin_replied_at,

      pr.created_at,
      pr.updated_at

    FROM product_reviews pr

    INNER JOIN products p
      ON p.id = pr.product_id

    LEFT JOIN product_variants pv
      ON pv.id = pr.variant_id

    LEFT JOIN customers c
      ON c.id = pr.customer_id

    LEFT JOIN orders o
      ON o.id = pr.order_id

    ORDER BY
      pr.created_at DESC,
      pr.id DESC
  `)
  .all();

console.log("\nAvaliações de produtos:");

if (avaliacoesProdutos.length === 0) {
  console.log("Nenhuma avaliação de produto cadastrada.");
} else {
  console.table(avaliacoesProdutos);
}

// ======================================================
// 34. PERGUNTAS SOBRE PRODUTOS
// ======================================================

const perguntasProdutos = db
  .prepare(`
    SELECT
      pq.id,

      pq.product_id,
      p.name AS product_name,

      pq.variant_id,
      pv.sku AS variant_sku,

      pq.customer_id,
      c.first_name,
      c.last_name,

      pq.question,
      pq.customer_name,
      pq.customer_email,

      pq.status,
      pq.answer,
      pq.answered_by,
      pq.answered_at,

      pq.created_at,
      pq.updated_at

    FROM product_questions pq

    INNER JOIN products p
      ON p.id = pq.product_id

    LEFT JOIN product_variants pv
      ON pv.id = pq.variant_id

    LEFT JOIN customers c
      ON c.id = pq.customer_id

    ORDER BY
      pq.created_at DESC,
      pq.id DESC
  `)
  .all();

console.log("\nPerguntas sobre produtos:");

if (perguntasProdutos.length === 0) {
  console.log("Nenhuma pergunta sobre produto cadastrada.");
} else {
  console.table(perguntasProdutos);
}

// ======================================================
// 35. NOTIFICAÇÕES
// ======================================================

const notificacoes = db
  .prepare(`
    SELECT
      n.id,

      n.customer_id,
      c.first_name,
      c.last_name,

      n.type,
      n.title,
      n.message,

      n.reference_type,
      n.reference_id,

      n.channel,
      n.status,
      n.is_read,

      n.scheduled_at,
      n.sent_at,
      n.read_at,

      n.created_at,
      n.updated_at

    FROM notifications n

    LEFT JOIN customers c
      ON c.id = n.customer_id

    ORDER BY
      n.created_at DESC,
      n.id DESC
  `)
  .all();

console.log("\nNotificações:");

if (notificacoes.length === 0) {
  console.log("Nenhuma notificação cadastrada.");
} else {
  console.table(notificacoes);
}

// ======================================================
// 36. DEVOLUÇÕES E TROCAS
// ======================================================

const devolucoesTrocas = db
  .prepare(`
    SELECT
      r.id,

      r.order_id,
      o.order_number,

      r.order_item_id,
      oi.product_name,
      oi.product_sku,
      oi.variant_sku,
      oi.color_name,
      oi.size_name,

      r.customer_id,
      c.first_name,
      c.last_name,

      r.type,
      r.reason,
      r.reason_details,

      r.quantity,

      r.status,
      r.resolution,

      r.refund_amount_cents / 100.0 AS refund_amount,
      r.tracking_code,

      r.requested_at,
      r.approved_at,
      r.received_at,
      r.completed_at,
      r.cancelled_at,

      r.notes,

      r.created_at,
      r.updated_at

    FROM returns r

    INNER JOIN orders o
      ON o.id = r.order_id

    LEFT JOIN order_items oi
      ON oi.id = r.order_item_id

    LEFT JOIN customers c
      ON c.id = r.customer_id

    ORDER BY
      r.created_at DESC,
      r.id DESC
  `)
  .all();

console.log("\nDevoluções e trocas:");

if (devolucoesTrocas.length === 0) {
  console.log("Nenhuma devolução ou troca cadastrada.");
} else {
  console.table(devolucoesTrocas);
}

// ======================================================
// 37. HISTÓRICO DE DEVOLUÇÕES E TROCAS
// ======================================================

const historicoDevolucoesTrocas = db
  .prepare(`
    SELECT
      rh.id,

      rh.return_id,

      r.order_id,
      o.order_number,

      r.type AS return_type,
      r.status AS current_status,

      rh.old_status,
      rh.new_status,

      rh.changed_by,
      rh.notes,

      rh.created_at

    FROM return_history rh

    INNER JOIN returns r
      ON r.id = rh.return_id

    INNER JOIN orders o
      ON o.id = r.order_id

    ORDER BY
      rh.created_at DESC,
      rh.id DESC
  `)
  .all();

console.log("\nHistórico de devoluções e trocas:");

if (historicoDevolucoesTrocas.length === 0) {
  console.log("Nenhum histórico de devolução ou troca cadastrado.");
} else {
  console.table(historicoDevolucoesTrocas);
}

// ======================================================
// 38. MOVIMENTAÇÕES DE ESTOQUE
// ======================================================

const movimentacoesEstoque = db
  .prepare(`
    SELECT
      im.id,

      im.variant_id,
      pv.sku AS variant_sku,
      p.name AS product_name,

      im.movement_type,
      im.quantity,
      im.quantity_before,
      im.quantity_after,

      im.reference_type,
      im.reference_id,

      im.reason,
      im.changed_by,

      im.created_at

    FROM inventory_movements im

    INNER JOIN product_variants pv
      ON pv.id = im.variant_id

    INNER JOIN products p
      ON p.id = pv.product_id

    ORDER BY
      im.created_at DESC,
      im.id DESC
  `)
  .all();

console.log("\nMovimentações de estoque:");

if (movimentacoesEstoque.length === 0) {
  console.log("Nenhuma movimentação de estoque cadastrada.");
} else {
  console.table(movimentacoesEstoque);
}

// ======================================================
// 39. HISTÓRICO DOS PEDIDOS
// ======================================================

const historicoPedidos = db
  .prepare(`
    SELECT
      oh.id,

      oh.order_id,
      o.order_number,

      oh.status_type,
      oh.old_value,
      oh.new_value,

      oh.description,
      oh.changed_by,

      oh.created_at

    FROM order_history oh

    INNER JOIN orders o
      ON o.id = oh.order_id

    ORDER BY
      oh.created_at DESC,
      oh.id DESC
  `)
  .all();

console.log("\nHistórico dos pedidos:");

if (historicoPedidos.length === 0) {
  console.log("Nenhum histórico de pedido cadastrado.");
} else {
  console.table(historicoPedidos);
}

// ======================================================
// 40. EVENTOS DAS ENTREGAS
// ======================================================

const eventosEntregas = db
  .prepare(`
    SELECT
      se.id,

      se.shipment_id,

      o.order_number,

      s.carrier,
      s.tracking_code,

      se.status,
      se.description,
      se.location,
      se.carrier_event_code,

      se.occurred_at,
      se.created_at

    FROM shipment_events se

    INNER JOIN shipments s
      ON s.id = se.shipment_id

    INNER JOIN orders o
      ON o.id = s.order_id

    ORDER BY
      se.occurred_at DESC,
      se.id DESC
  `)
  .all();

console.log("\nEventos das entregas:");

if (eventosEntregas.length === 0) {
  console.log("Nenhum evento de entrega cadastrado.");
} else {
  console.table(eventosEntregas);
}

// ======================================================
// 41. AUTENTICAÇÃO DOS CLIENTES
// ======================================================

const autenticacoesClientes = db
  .prepare(`
    SELECT
      ca.id,

      ca.customer_id,

      c.first_name,
      c.last_name,
      c.email,

      ca.failed_login_attempts,
      ca.locked_until,
      ca.last_login_at,
      ca.password_changed_at,

      ca.created_at,
      ca.updated_at

    FROM customer_auth ca

    INNER JOIN customers c
      ON c.id = ca.customer_id

    ORDER BY
      ca.created_at DESC,
      ca.id DESC
  `)
  .all();

console.log("\nAutenticações dos clientes:");

if (autenticacoesClientes.length === 0) {
  console.log("Nenhuma autenticação de cliente cadastrada.");
} else {
  console.table(autenticacoesClientes);
}



// ======================================================
// 42. RECUPERAÇÃO DE SENHA DOS CLIENTES
// ======================================================

const recuperacoesSenhaClientes = db
  .prepare(`
    SELECT
      cpr.id,

      cpr.customer_id,

      c.first_name,
      c.last_name,
      c.email,

      cpr.expires_at,
      cpr.used_at,
      cpr.created_at

    FROM customer_password_resets cpr

    INNER JOIN customers c
      ON c.id = cpr.customer_id

    ORDER BY
      cpr.created_at DESC,
      cpr.id DESC
  `)
  .all();

console.log("\nRecuperações de senha dos clientes:");

if (recuperacoesSenhaClientes.length === 0) {
  console.log("Nenhuma recuperação de senha cadastrada.");
} else {
  console.table(recuperacoesSenhaClientes);
}

// ======================================================
// 43. VERIFICAÇÃO DE E-MAIL DOS CLIENTES
// ======================================================

const verificacoesEmailClientes = db
  .prepare(`
    SELECT
      cev.id,

      cev.customer_id,

      c.first_name,
      c.last_name,
      c.email,

      cev.expires_at,
      cev.verified_at,
      cev.created_at

    FROM customer_email_verifications cev

    INNER JOIN customers c
      ON c.id = cev.customer_id

    ORDER BY
      cev.created_at DESC,
      cev.id DESC
  `)
  .all();

console.log("\nVerificações de e-mail dos clientes:");

if (verificacoesEmailClientes.length === 0) {
  console.log("Nenhuma verificação de e-mail cadastrada.");
} else {
  console.table(verificacoesEmailClientes);
}

// ======================================================
// 44. SESSÕES DOS CLIENTES
// ======================================================

const sessoesClientes = db
  .prepare(`
    SELECT
      cs.id,
      cs.customer_id,
      c.first_name,
      c.last_name,
      c.email,
      cs.ip_address,
      cs.user_agent,
      cs.expires_at,
      cs.revoked_at,
      cs.last_activity_at,
      cs.created_at,
      CASE
        WHEN cs.revoked_at IS NOT NULL THEN 'Revogada'
        WHEN datetime(cs.expires_at) <= CURRENT_TIMESTAMP
          THEN 'Expirada'
        ELSE 'Ativa'
      END AS session_status
    FROM customer_sessions cs
    INNER JOIN customers c
      ON c.id = cs.customer_id
    ORDER BY cs.created_at DESC, cs.id DESC;
  `)
  .all();

console.log("\nSessões dos clientes:");

if (sessoesClientes.length === 0) {
  console.log("Nenhuma sessão de cliente cadastrada.");
} else {
  console.table(sessoesClientes);
}

// ======================================================
// 45. HISTÓRICO DE OBSERVAÇÕES DOS CLIENTES
// ======================================================

const observacoesClientes = db
  .prepare(`
    SELECT
      cn.id,
      cn.customer_id,
      c.first_name,
      c.last_name,
      cn.note,
      cn.created_by,
      cn.created_at
    FROM customer_notes cn
    INNER JOIN customers c
      ON c.id = cn.customer_id
    ORDER BY cn.created_at DESC, cn.id DESC;
  `)
  .all();

console.log("\nHistórico de observações dos clientes:");

if (observacoesClientes.length === 0) {
  console.log("Nenhuma observação de cliente cadastrada.");
} else {
  console.table(observacoesClientes);
}

// ======================================================
// 46. HISTÓRICO DE ATENDIMENTOS DOS CLIENTES
// ======================================================

const atendimentosClientes = db
  .prepare(`
    SELECT
      ci.id,
      ci.customer_id,
      c.first_name,
      c.last_name,
      ci.order_id,
      o.order_number,
      ci.channel,
      ci.direction,
      ci.subject,
      ci.description,
      ci.handled_by,
      ci.occurred_at,
      ci.created_at
    FROM customer_interactions ci
    INNER JOIN customers c
      ON c.id = ci.customer_id
    LEFT JOIN orders o
      ON o.id = ci.order_id
    ORDER BY ci.occurred_at DESC, ci.id DESC;
  `)
  .all();

console.log("\nHistórico de atendimentos dos clientes:");

if (atendimentosClientes.length === 0) {
  console.log("Nenhum atendimento de cliente cadastrado.");
} else {
  console.table(atendimentosClientes);
}

// ======================================================
// 47. TAREFAS DE ACOMPANHAMENTO DOS CLIENTES
// ======================================================

const tarefasClientes = db
  .prepare(`
    SELECT
      ct.id,
      ct.customer_id,
      c.first_name,
      c.last_name,
      ct.title,
      ct.description,
      ct.assigned_to,
      ct.status,
      ct.priority,
      ct.due_at,
      ct.completed_at,
      ct.created_at,
      ct.updated_at
    FROM customer_tasks ct
    INNER JOIN customers c
      ON c.id = ct.customer_id
    ORDER BY ct.due_at IS NULL, ct.due_at, ct.id;
  `)
  .all();

console.log("\nTarefas de acompanhamento dos clientes:");

if (tarefasClientes.length === 0) {
  console.log("Nenhuma tarefa de cliente cadastrada.");
} else {
  console.table(tarefasClientes);
}

// ======================================================
// 48. GRUPOS DE CLIENTES
// ======================================================

const gruposClientes = db
  .prepare(`
    SELECT
      id,
      name,
      code,
      description,
      status,
      created_at,
      updated_at
    FROM customer_segments
    ORDER BY name, id;
  `)
  .all();

console.log("\nGrupos de clientes:");

if (gruposClientes.length === 0) {
  console.log("Nenhum grupo de clientes cadastrado.");
} else {
  console.table(gruposClientes);
}

// ======================================================
// 49. CLIENTES VINCULADOS AOS GRUPOS
// ======================================================

const clientesGrupos = db
  .prepare(`
    SELECT
      csm.id,
      csm.customer_id,
      c.first_name,
      c.last_name,
      csm.segment_id,
      cs.name AS segment_name,
      cs.code AS segment_code,
      cs.status AS segment_status,
      csm.created_at
    FROM customer_segment_members csm
    INNER JOIN customers c
      ON c.id = csm.customer_id
    INNER JOIN customer_segments cs
      ON cs.id = csm.segment_id
    ORDER BY cs.name, c.first_name, c.last_name, csm.id;
  `)
  .all();

console.log("\nClientes vinculados aos grupos:");

if (clientesGrupos.length === 0) {
  console.log("Nenhum cliente vinculado a grupos.");
} else {
  console.table(clientesGrupos);
}

// ======================================================
// 50. HISTÓRICO DE ALTERAÇÕES DOS CLIENTES
// ======================================================

const historicoClientes = db
  .prepare(`
    SELECT
      ch.id,
      ch.customer_id,
      c.first_name,
      c.last_name,
      ch.event_type,
      ch.field_name,
      ch.old_value,
      ch.new_value,
      ch.description,
      ch.changed_by,
      ch.created_at
    FROM customer_history ch
    INNER JOIN customers c
      ON c.id = ch.customer_id
    ORDER BY ch.created_at DESC, ch.id DESC;
  `)
  .all();

console.log("\nHistórico de alterações dos clientes:");

if (historicoClientes.length === 0) {
  console.log("Nenhuma alteração de cliente registrada.");
} else {
  console.table(historicoClientes);
}

// ======================================================
// 51. PEDIDOS DE COMPRA AOS FORNECEDORES
// ======================================================

const pedidosCompra = db
  .prepare(`
    SELECT
      po.id,
      po.purchase_number,
      po.supplier_id,
      s.name AS supplier_name,
      po.status,
      po.currency,
      po.subtotal_cents / 100.0 AS subtotal,
      po.discount_cents / 100.0 AS discount,
      po.shipping_cents / 100.0 AS shipping,
      po.total_cents / 100.0 AS total,
      po.expected_delivery_date,
      po.sent_at,
      po.received_at,
      po.notes,
      po.created_by,
      po.created_at,
      po.updated_at
    FROM purchase_orders po
    INNER JOIN suppliers s
      ON s.id = po.supplier_id
    ORDER BY po.created_at DESC, po.id DESC;
  `)
  .all();

console.log("\nPedidos de compra aos fornecedores:");

if (pedidosCompra.length === 0) {
  console.log("Nenhum pedido de compra cadastrado.");
} else {
  console.table(pedidosCompra);
}

// ======================================================
// 52. ITENS DOS PEDIDOS DE COMPRA
// ======================================================

const itensPedidosCompra = db
  .prepare(`
    SELECT
      poi.id,
      poi.purchase_order_id,
      po.purchase_number,
      s.name AS supplier_name,
      po.currency,
      poi.variant_id,
      poi.product_name,
      poi.variant_sku,
      poi.supplier_sku,
      poi.color_name,
      poi.size_name,
      poi.quantity,
      poi.received_quantity,
      poi.unit_cost_cents / 100.0 AS unit_cost,
      poi.discount_cents / 100.0 AS discount,
      poi.line_total_cents / 100.0 AS line_total,
      poi.notes,
      poi.created_at,
      poi.updated_at
    FROM purchase_order_items poi
    INNER JOIN purchase_orders po
      ON po.id = poi.purchase_order_id
    INNER JOIN suppliers s
      ON s.id = po.supplier_id
    ORDER BY poi.purchase_order_id, poi.id;
  `)
  .all();

console.log("\nItens dos pedidos de compra:");

if (itensPedidosCompra.length === 0) {
  console.log("Nenhum item de pedido de compra cadastrado.");
} else {
  console.table(itensPedidosCompra);
}

// ======================================================
// 53. HISTÓRICO DOS PEDIDOS DE COMPRA
// ======================================================

const historicoPedidosCompra = db
  .prepare(`
    SELECT
      poh.id,
      poh.purchase_order_id,
      po.purchase_number,
      s.name AS supplier_name,
      poh.event_type,
      poh.old_status,
      poh.new_status,
      poh.description,
      poh.changed_by,
      poh.created_at
    FROM purchase_order_history poh
    INNER JOIN purchase_orders po
      ON po.id = poh.purchase_order_id
    INNER JOIN suppliers s
      ON s.id = po.supplier_id
    ORDER BY poh.created_at DESC, poh.id DESC;
  `)
  .all();

console.log("\nHistórico dos pedidos de compra:");

if (historicoPedidosCompra.length === 0) {
  console.log("Nenhum histórico de pedido de compra registrado.");
} else {
  console.table(historicoPedidosCompra);
}

// ======================================================
// 54. RECEBIMENTOS DAS COMPRAS AOS FORNECEDORES
// ======================================================

const recebimentosCompra = db
  .prepare(`
    SELECT
      pr.id,
      pr.receipt_number,
      pr.purchase_order_id,
      po.purchase_number,
      s.name AS supplier_name,
      pr.receipt_type,
      pr.status,
      pr.received_at,
      pr.received_by,
      pr.supplier_document_number,
      pr.notes,
      pr.created_at,
      pr.updated_at
    FROM purchase_receipts pr
    INNER JOIN purchase_orders po
      ON po.id = pr.purchase_order_id
    INNER JOIN suppliers s
      ON s.id = po.supplier_id
    ORDER BY pr.received_at DESC, pr.id DESC;
  `)
  .all();

console.log("\nRecebimentos das compras aos fornecedores:");

if (recebimentosCompra.length === 0) {
  console.log("Nenhum recebimento de compra cadastrado.");
} else {
  console.table(recebimentosCompra);
}

// ======================================================
// 55. ITENS DOS RECEBIMENTOS DAS COMPRAS
// ======================================================

const itensRecebimentosCompra = db.prepare(`
  SELECT
    pri.id,
    pri.purchase_receipt_id,
    pr.receipt_number,
    pr.status AS receipt_status,
    po.purchase_number,
    s.name AS supplier_name,
    pri.purchase_order_item_id,
    poi.product_name,
    poi.variant_sku,
    poi.color_name,
    poi.size_name,
    pri.quantity,
    pri.notes,
    pri.created_at,
    pri.updated_at
  FROM purchase_receipt_items pri
  INNER JOIN purchase_receipts pr
    ON pr.id = pri.purchase_receipt_id
  INNER JOIN purchase_orders po
    ON po.id = pr.purchase_order_id
  INNER JOIN suppliers s
    ON s.id = po.supplier_id
  INNER JOIN purchase_order_items poi
    ON poi.id = pri.purchase_order_item_id
  ORDER BY pr.received_at DESC, pri.id DESC;
`).all();

console.log("\nItens dos recebimentos das compras:");

if (itensRecebimentosCompra.length === 0) {
  console.log("Nenhum item de recebimento cadastrado.");
} else {
  console.table(itensRecebimentosCompra);
}

// ======================================================
// 56. HISTÓRICO DOS RECEBIMENTOS DAS COMPRAS
// ======================================================

const historicoRecebimentosCompra = db.prepare(`
  SELECT
    prh.id,
    prh.purchase_receipt_id,
    pr.receipt_number,
    po.purchase_number,
    s.name AS supplier_name,
    prh.event_type,
    prh.old_status,
    prh.new_status,
    prh.description,
    prh.changed_by,
    prh.created_at
  FROM purchase_receipt_history prh
  INNER JOIN purchase_receipts pr
    ON pr.id = prh.purchase_receipt_id
  INNER JOIN purchase_orders po
    ON po.id = pr.purchase_order_id
  INNER JOIN suppliers s
    ON s.id = po.supplier_id
  ORDER BY prh.created_at DESC, prh.id DESC;
`).all();

console.log("\nHistórico dos recebimentos das compras:");

if (historicoRecebimentosCompra.length === 0) {
  console.log("Nenhum histórico de recebimento cadastrado.");
} else {
  console.table(historicoRecebimentosCompra);
}

// ======================================================
// 57. VÍNCULOS ENTRE ITENS DE COMPRA E ITENS DE VENDA
// ======================================================

const vinculosCompraVenda = db.prepare(`
  SELECT
    allocation.id,
    allocation.purchase_order_item_id,
    po.purchase_number,
    poi.product_name,
    poi.variant_sku,
    allocation.order_item_id,
    allocation.quantity,
    allocation.notes,
    allocation.created_at,
    allocation.updated_at
  FROM purchase_order_item_allocations allocation
  INNER JOIN purchase_order_items poi
    ON poi.id = allocation.purchase_order_item_id
  INNER JOIN purchase_orders po
    ON po.id = poi.purchase_order_id
  ORDER BY allocation.created_at DESC, allocation.id DESC;
`).all();

console.log("\nVínculos entre itens de compra e itens de venda:");

if (vinculosCompraVenda.length === 0) {
  console.log("Nenhum vínculo entre compra e venda cadastrado.");
} else {
  console.table(vinculosCompraVenda);
}

// ======================================================
// 58. OBSERVAÇÕES DOS FORNECEDORES
// ======================================================

const observacoesFornecedores = db.prepare(`
  SELECT
    sn.id,
    sn.supplier_id,
    s.name AS supplier_name,
    sn.note,
    sn.created_by,
    sn.created_at
  FROM supplier_notes sn
  INNER JOIN suppliers s
    ON s.id = sn.supplier_id
  ORDER BY sn.created_at DESC, sn.id DESC;
`).all();

console.log("\nObservações dos fornecedores:");

if (observacoesFornecedores.length === 0) {
  console.log("Nenhuma observação de fornecedor cadastrada.");
} else {
  console.table(observacoesFornecedores);
}

// ======================================================
// 59. CONTATOS REALIZADOS COM OS FORNECEDORES
// ======================================================

const contatosFornecedores = db.prepare(`
  SELECT
    si.id,
    si.supplier_id,
    s.name AS supplier_name,
    si.purchase_order_id,
    po.purchase_number,
    si.channel,
    si.direction,
    si.subject,
    si.description,
    si.handled_by,
    si.occurred_at,
    si.created_at
  FROM supplier_interactions si
  INNER JOIN suppliers s
    ON s.id = si.supplier_id
  LEFT JOIN purchase_orders po
    ON po.id = si.purchase_order_id
  ORDER BY si.occurred_at DESC, si.id DESC;
`).all();

console.log("\nContatos realizados com os fornecedores:");

if (contatosFornecedores.length === 0) {
  console.log("Nenhum contato com fornecedor cadastrado.");
} else {
  console.table(contatosFornecedores);
}
// ======================================================
// 60. TAREFAS DOS FORNECEDORES
// ======================================================

const tarefasFornecedores = db.prepare(`
  SELECT
    st.id,
    st.supplier_id,
    s.name AS supplier_name,
    st.title,
    st.description,
    st.assigned_to,
    st.status,
    st.priority,
    st.due_at,
    st.completed_at,
    st.created_at,
    st.updated_at
  FROM supplier_tasks st
  INNER JOIN suppliers s
    ON s.id = st.supplier_id
  ORDER BY
    st.due_at IS NULL,
    st.due_at ASC,
    st.id DESC;
`).all();

console.log("\nTarefas dos fornecedores:");

if (tarefasFornecedores.length === 0) {
  console.log("Nenhuma tarefa de fornecedor cadastrada.");
} else {
  console.table(tarefasFornecedores);
}

// ======================================================
// 61. HISTÓRICO DE ALTERAÇÕES DOS FORNECEDORES
// ======================================================

const historicoFornecedores = db.prepare(`
  SELECT
    sh.id,
    sh.supplier_id,
    s.name AS supplier_name,
    sh.event_type,
    sh.field_name,
    sh.old_value,
    sh.new_value,
    sh.description,
    sh.changed_by,
    sh.created_at
  FROM supplier_history sh
  INNER JOIN suppliers s
    ON s.id = sh.supplier_id
  ORDER BY sh.created_at DESC, sh.id DESC;
`).all();

console.log("\nHistórico de alterações dos fornecedores:");

if (historicoFornecedores.length === 0) {
  console.log("Nenhum histórico de fornecedor cadastrado.");
} else {
  console.table(historicoFornecedores);
}

// ======================================================
// 62. PESSOAS DE CONTATO DOS FORNECEDORES
// ======================================================

const pessoasContatoFornecedores = db.prepare(`
  SELECT
    sc.id,
    sc.supplier_id,
    s.name AS supplier_name,
    sc.name AS contact_name,
    sc.role,
    sc.phone,
    sc.whatsapp,
    sc.email,
    sc.is_primary,
    sc.status,
    sc.notes,
    sc.created_at,
    sc.updated_at
  FROM supplier_contacts sc
  INNER JOIN suppliers s
    ON s.id = sc.supplier_id
  ORDER BY
    s.name ASC,
    sc.is_primary DESC,
    sc.name ASC,
    sc.id ASC;
`).all();

console.log("\nPessoas de contato dos fornecedores:");

if (pessoasContatoFornecedores.length === 0) {
  console.log("Nenhuma pessoa de contato cadastrada.");
} else {
  console.table(pessoasContatoFornecedores);
}

// ======================================================
// 63. ENDEREÇOS DOS FORNECEDORES
// ======================================================

const enderecosFornecedores = db.prepare(`
  SELECT
    sa.id,
    sa.supplier_id,
    s.name AS supplier_name,
    sa.label,
    sa.address_type,
    sa.postal_code,
    sa.street,
    sa.number,
    sa.complement,
    sa.neighborhood,
    sa.city,
    sa.state,
    sa.country_code,
    sa.is_primary,
    sa.status,
    sa.notes,
    sa.created_at,
    sa.updated_at
  FROM supplier_addresses sa
  INNER JOIN suppliers s
    ON s.id = sa.supplier_id
  ORDER BY
    s.name ASC,
    sa.address_type ASC,
    sa.is_primary DESC,
    sa.id ASC;
`).all();

console.log("\nEndereços dos fornecedores:");

if (enderecosFornecedores.length === 0) {
  console.log("Nenhum endereço de fornecedor cadastrado.");
} else {
  console.table(enderecosFornecedores);
}

// ======================================================
// 64. HORÁRIOS DOS FORNECEDORES
// ======================================================

const horariosFornecedores = db.prepare(`
  SELECT
    sbh.id,
    sbh.supplier_address_id,
    s.name AS supplier_name,
    sa.label AS address_label,
    CASE sbh.weekday
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Segunda-feira'
      WHEN 2 THEN 'Terça-feira'
      WHEN 3 THEN 'Quarta-feira'
      WHEN 4 THEN 'Quinta-feira'
      WHEN 5 THEN 'Sexta-feira'
      WHEN 6 THEN 'Sábado'
    END AS weekday_name,
    sbh.service_type,
    sbh.opens_at,
    sbh.closes_at,
    sbh.notes,
    sbh.created_at,
    sbh.updated_at
  FROM supplier_business_hours sbh
  INNER JOIN supplier_addresses sa
    ON sa.id = sbh.supplier_address_id
  INNER JOIN suppliers s
    ON s.id = sa.supplier_id
  ORDER BY
    s.name ASC,
    sa.id ASC,
    sbh.weekday ASC,
    sbh.service_type ASC,
    sbh.opens_at ASC;
`).all();

console.log("\nHorários dos fornecedores:");

if (horariosFornecedores.length === 0) {
  console.log("Nenhum horário de fornecedor cadastrado.");
} else {
  console.table(horariosFornecedores);
}

// ======================================================
// 65. PERÍODOS DE FECHAMENTO DOS FORNECEDORES
// ======================================================

const fechamentosFornecedores = db.prepare(`
  SELECT
    sc.id,
    sc.supplier_address_id,
    s.name AS supplier_name,
    sa.label AS address_label,
    sc.starts_at,
    sc.ends_at,
    sc.reason,
    sc.created_by,
    sc.created_at,
    sc.updated_at
  FROM supplier_closures sc
  INNER JOIN supplier_addresses sa
    ON sa.id = sc.supplier_address_id
  INNER JOIN suppliers s
    ON s.id = sa.supplier_id
  ORDER BY sc.starts_at DESC, sc.id DESC;
`).all();

console.log("\nPeríodos de fechamento dos fornecedores:");

if (fechamentosFornecedores.length === 0) {
  console.log("Nenhum período de fechamento cadastrado.");
} else {
  console.table(fechamentosFornecedores);
}

// ======================================================
// 66. AGENDAMENTOS DE RETIRADA NOS FORNECEDORES
// ======================================================

const agendamentosRetirada = db.prepare(`
  SELECT
    spa.id,
    spa.purchase_order_id,
    po.purchase_number,
    s.name AS supplier_name,
    spa.supplier_address_id,
    sa.label AS pickup_address_label,
    sa.city,
    sa.state,
    spa.scheduled_at,
    spa.assigned_to,
    spa.status,
    spa.completed_at,
    spa.notes,
    spa.created_by,
    spa.created_at,
    spa.updated_at
  FROM supplier_pickup_appointments spa
  INNER JOIN purchase_orders po
    ON po.id = spa.purchase_order_id
  INNER JOIN suppliers s
    ON s.id = po.supplier_id
  INNER JOIN supplier_addresses sa
    ON sa.id = spa.supplier_address_id
  ORDER BY spa.scheduled_at ASC, spa.id ASC;
`).all();

console.log("\nAgendamentos de retirada nos fornecedores:");

if (agendamentosRetirada.length === 0) {
  console.log("Nenhum agendamento de retirada cadastrado.");
} else {
  console.table(agendamentosRetirada);
}

// ======================================================
// 67. HISTÓRICO DOS AGENDAMENTOS DE RETIRADA
// ======================================================

const historicoAgendamentosRetirada = db.prepare(`
  SELECT
    sph.id,
    sph.pickup_appointment_id,
    po.purchase_number,
    s.name AS supplier_name,
    sph.event_type,
    sph.old_status,
    sph.new_status,
    sph.old_scheduled_at,
    sph.new_scheduled_at,
    sph.description,
    sph.changed_by,
    sph.created_at
  FROM supplier_pickup_history sph
  INNER JOIN supplier_pickup_appointments spa
    ON spa.id = sph.pickup_appointment_id
  INNER JOIN purchase_orders po
    ON po.id = spa.purchase_order_id
  INNER JOIN suppliers s
    ON s.id = po.supplier_id
  ORDER BY sph.created_at DESC, sph.id DESC;
`).all();

console.log("\nHistórico dos agendamentos de retirada:");

if (historicoAgendamentosRetirada.length === 0) {
  console.log("Nenhum histórico de agendamento cadastrado.");
} else {
  console.table(historicoAgendamentosRetirada);
}

// ======================================================
// 68. DOCUMENTOS DOS FORNECEDORES
// ======================================================

const documentosFornecedores = db.prepare(`
  SELECT
    sd.id,
    sd.supplier_id,
    s.name AS supplier_name,
    sd.document_type,
    sd.title,
    sd.original_filename,
    sd.storage_key,
    sd.mime_type,
    sd.file_size_bytes,
    sd.status,
    sd.notes,
    sd.uploaded_by,
    sd.created_at,
    sd.updated_at
  FROM supplier_documents sd
  INNER JOIN suppliers s
    ON s.id = sd.supplier_id
  ORDER BY sd.created_at DESC, sd.id DESC;
`).all();

console.log("\nDocumentos dos fornecedores:");

if (documentosFornecedores.length === 0) {
  console.log("Nenhum documento de fornecedor cadastrado.");
} else {
  console.table(documentosFornecedores);
}

// ======================================================
// 69. LINKS E REDES SOCIAIS DOS FORNECEDORES
// ======================================================

const linksFornecedores = db.prepare(`
  SELECT
    ssl.id,
    ssl.supplier_id,
    s.name AS supplier_name,
    ssl.platform,
    ssl.label,
    ssl.url,
    ssl.status,
    ssl.created_at,
    ssl.updated_at
  FROM supplier_social_links ssl
  INNER JOIN suppliers s
    ON s.id = ssl.supplier_id
  ORDER BY
    s.name ASC,
    ssl.platform ASC,
    ssl.id ASC;
`).all();

console.log("\nLinks e redes sociais dos fornecedores:");

if (linksFornecedores.length === 0) {
  console.log("Nenhum link de fornecedor cadastrado.");
} else {
  console.table(linksFornecedores);
}

// ======================================================
// 70. DOCUMENTOS DOS PEDIDOS DE COMPRA
// ======================================================

const documentosPedidosCompra = db.prepare(`
  SELECT
    pod.id,
    pod.purchase_order_id,
    po.purchase_number,
    s.name AS supplier_name,
    pod.document_type,
    pod.title,
    pod.original_filename,
    pod.storage_key,
    pod.mime_type,
    pod.file_size_bytes,
    pod.status,
    pod.notes,
    pod.uploaded_by,
    pod.created_at,
    pod.updated_at
  FROM purchase_order_documents pod
  INNER JOIN purchase_orders po
    ON po.id = pod.purchase_order_id
  INNER JOIN suppliers s
    ON s.id = po.supplier_id
  ORDER BY pod.created_at DESC, pod.id DESC;
`).all();

console.log("\nDocumentos dos pedidos de compra:");

if (documentosPedidosCompra.length === 0) {
  console.log("Nenhum documento de pedido de compra cadastrado.");
} else {
  console.table(documentosPedidosCompra);
}

// ======================================================
// 71. OBSERVAÇÕES DOS PEDIDOS DE COMPRA
// ======================================================

const observacoesPedidosCompra = db.prepare(`
  SELECT
    pon.id,
    pon.purchase_order_id,
    po.purchase_number,
    pon.note,
    pon.created_by,
    pon.created_at
  FROM purchase_order_notes AS pon
  INNER JOIN purchase_orders AS po
    ON po.id = pon.purchase_order_id
  ORDER BY pon.created_at DESC, pon.id DESC
`).all();

console.log("\n=== OBSERVAÇÕES DOS PEDIDOS DE COMPRA ===");

if (observacoesPedidosCompra.length === 0) {
  console.log("Nenhuma observação de pedido de compra cadastrada.");
} else {
  console.table(observacoesPedidosCompra);
}

// ======================================================
// 72. USUÁRIOS ADMINISTRATIVOS
// ======================================================

const usuariosAdministrativos = db.prepare(`
  SELECT
    id,
    name,
    email,
    status,
    created_at,
    updated_at
  FROM admin_users
  ORDER BY name, id
`).all();

console.log("\n=== USUÁRIOS ADMINISTRATIVOS ===");

if (usuariosAdministrativos.length === 0) {
  console.log("Nenhum usuário administrativo cadastrado.");
} else {
  console.table(usuariosAdministrativos);
}

// ======================================================
// 73. AUTENTICAÇÃO DOS USUÁRIOS ADMINISTRATIVOS
// ======================================================

const autenticacoesAdministrativas = db.prepare(`
  SELECT
    aa.id,
    aa.admin_user_id,
    au.name AS admin_name,
    au.email,
    au.status AS admin_status,
    aa.password_changed_at,
    aa.failed_login_attempts,
    aa.locked_until,
    aa.last_login_at,
    aa.created_at,
    aa.updated_at
  FROM admin_auth AS aa
  INNER JOIN admin_users AS au
    ON au.id = aa.admin_user_id
  ORDER BY au.name, aa.id
`).all();

console.log("\n=== AUTENTICAÇÃO DOS USUÁRIOS ADMINISTRATIVOS ===");

if (autenticacoesAdministrativas.length === 0) {
  console.log("Nenhuma autenticação administrativa cadastrada.");
} else {
  console.table(autenticacoesAdministrativas);
}

// ======================================================
// 74. SESSÕES DOS USUÁRIOS ADMINISTRATIVOS
// ======================================================

const sessoesAdministrativas = db.prepare(`
  SELECT
    ads.id,
    ads.admin_user_id,
    au.name AS admin_name,
    au.email,
    au.status AS admin_status,
    ads.ip_address,
    ads.user_agent,
    ads.expires_at,
    ads.revoked_at,
    ads.last_activity_at,
    ads.created_at
  FROM admin_sessions AS ads
  INNER JOIN admin_users AS au
    ON au.id = ads.admin_user_id
  ORDER BY ads.created_at DESC, ads.id DESC
`).all();

console.log("\n=== SESSÕES DOS USUÁRIOS ADMINISTRATIVOS ===");

if (sessoesAdministrativas.length === 0) {
  console.log("Nenhuma sessão administrativa cadastrada.");
} else {
  console.table(sessoesAdministrativas);
}

// ======================================================
// 75. RECUPERAÇÃO DE SENHA DOS USUÁRIOS ADMINISTRATIVOS
// ======================================================

const recuperacoesSenhaAdministrativas = db.prepare(`
  SELECT
    apr.id,
    apr.admin_user_id,
    au.name AS admin_name,
    au.email,
    apr.expires_at,
    apr.used_at,
    apr.revoked_at,
    apr.requested_ip,
    apr.created_at
  FROM admin_password_resets AS apr
  INNER JOIN admin_users AS au
    ON au.id = apr.admin_user_id
  ORDER BY apr.created_at DESC, apr.id DESC
`).all();

console.log("\n=== RECUPERAÇÃO DE SENHA DOS USUÁRIOS ADMINISTRATIVOS ===");

if (recuperacoesSenhaAdministrativas.length === 0) {
  console.log("Nenhuma recuperação de senha administrativa cadastrada.");
} else {
  console.table(recuperacoesSenhaAdministrativas);
}

// ======================================================
// 76. PERFIS DE ACESSO ADMINISTRATIVO
// ======================================================

const perfisAdministrativos = db.prepare(`
  SELECT
    id,
    name,
    code,
    description,
    status,
    created_at,
    updated_at
  FROM admin_roles
  ORDER BY name, id
`).all();

console.log("\n=== PERFIS DE ACESSO ADMINISTRATIVO ===");

if (perfisAdministrativos.length === 0) {
  console.log("Nenhum perfil de acesso administrativo cadastrado.");
} else {
  console.table(perfisAdministrativos);
}

// ======================================================
// 77. VÍNCULOS ENTRE USUÁRIOS E PERFIS ADMINISTRATIVOS
// ======================================================

const vinculosUsuariosPerfis = db.prepare(`
  SELECT
    aur.id,
    aur.admin_user_id,
    au.name AS admin_name,
    au.email,
    au.status AS admin_status,
    aur.admin_role_id,
    ar.name AS role_name,
    ar.code AS role_code,
    ar.status AS role_status,
    aur.created_at
  FROM admin_user_roles AS aur
  INNER JOIN admin_users AS au
    ON au.id = aur.admin_user_id
  INNER JOIN admin_roles AS ar
    ON ar.id = aur.admin_role_id
  ORDER BY au.name, ar.name, aur.id
`).all();

console.log("\n=== VÍNCULOS ENTRE USUÁRIOS E PERFIS ADMINISTRATIVOS ===");

if (vinculosUsuariosPerfis.length === 0) {
  console.log("Nenhum vínculo entre usuário e perfil cadastrado.");
} else {
  console.table(vinculosUsuariosPerfis);
}

// ======================================================
// 78. PERMISSÕES ADMINISTRATIVAS
// ======================================================

const permissoesAdministrativas = db.prepare(`
  SELECT
    id,
    name,
    code,
    description,
    created_at,
    updated_at
  FROM admin_permissions
  ORDER BY code, id
`).all();

console.log("\n=== PERMISSÕES ADMINISTRATIVAS ===");

if (permissoesAdministrativas.length === 0) {
  console.log("Nenhuma permissão administrativa cadastrada.");
} else {
  console.table(permissoesAdministrativas);
}

// ======================================================
// 79. VÍNCULOS ENTRE PERFIS E PERMISSÕES
// ======================================================

const vinculosPerfisPermissoes = db.prepare(`
  SELECT
    arp.id,
    arp.admin_role_id,
    ar.name AS role_name,
    ar.code AS role_code,
    ar.status AS role_status,
    arp.admin_permission_id,
    ap.name AS permission_name,
    ap.code AS permission_code,
    arp.created_at
  FROM admin_role_permissions AS arp
  INNER JOIN admin_roles AS ar
    ON ar.id = arp.admin_role_id
  INNER JOIN admin_permissions AS ap
    ON ap.id = arp.admin_permission_id
  ORDER BY ar.name, ap.code, arp.id
`).all();

console.log("\n=== VÍNCULOS ENTRE PERFIS E PERMISSÕES ===");

if (vinculosPerfisPermissoes.length === 0) {
  console.log("Nenhum vínculo entre perfil e permissão cadastrado.");
} else {
  console.table(vinculosPerfisPermissoes);
}

// ======================================================
// 80. REGISTROS DE AUDITORIA ADMINISTRATIVA
// ======================================================

const registrosAuditoriaAdministrativa = db.prepare(`
  SELECT
    id,
    admin_user_id,
    actor_name,
    action,
    entity_type,
    entity_id,
    description,
    ip_address,
    created_at
  FROM admin_audit_logs
  ORDER BY created_at DESC, id DESC
`).all();

console.log("\n=== REGISTROS DE AUDITORIA ADMINISTRATIVA ===");

if (registrosAuditoriaAdministrativa.length === 0) {
  console.log("Nenhum registro de auditoria administrativa cadastrado.");
} else {
  console.table(registrosAuditoriaAdministrativa);
}

// ======================================================
// 81. CONFIGURAÇÕES GERAIS DA LOJA
// ======================================================

const configuracoesLoja = db.prepare(`
  SELECT
    ss.id,
    ss.setting_key,
    ss.setting_value,
    ss.description,
    ss.updated_by,
    au.name AS updated_by_name,
    ss.created_at,
    ss.updated_at
  FROM store_settings AS ss
  LEFT JOIN admin_users AS au
    ON au.id = ss.updated_by
  ORDER BY ss.setting_key
`).all();

console.log("\n=== CONFIGURAÇÕES GERAIS DA LOJA ===");

if (configuracoesLoja.length === 0) {
  console.log("Nenhuma configuração da loja cadastrada.");
} else {
  console.table(configuracoesLoja);
}

// ======================================================
// 82. PÁGINAS INSTITUCIONAIS DA LOJA
// ======================================================

const paginasLoja = db.prepare(`
  SELECT
    sp.id,
    sp.title,
    sp.slug,
    sp.status,
    sp.published_at,
    sp.updated_by,
    au.name AS updated_by_name,
    sp.created_at,
    sp.updated_at
  FROM store_pages AS sp
  LEFT JOIN admin_users AS au
    ON au.id = sp.updated_by
  ORDER BY sp.title, sp.id
`).all();

console.log("\n=== PÁGINAS INSTITUCIONAIS DA LOJA ===");

if (paginasLoja.length === 0) {
  console.log("Nenhuma página institucional cadastrada.");
} else {
  console.table(paginasLoja);
}

// ======================================================
// 83. PERGUNTAS FREQUENTES DA LOJA
// ======================================================

const perguntasFrequentesLoja = db.prepare(`
  SELECT
    sf.id,
    sf.question,
    sf.answer,
    sf.status,
    sf.sort_order,
    sf.updated_by,
    au.name AS updated_by_name,
    sf.created_at,
    sf.updated_at
  FROM store_faqs AS sf
  LEFT JOIN admin_users AS au
    ON au.id = sf.updated_by
  ORDER BY sf.sort_order, sf.id
`).all();

console.log("\n=== PERGUNTAS FREQUENTES DA LOJA ===");

if (perguntasFrequentesLoja.length === 0) {
  console.log("Nenhuma pergunta frequente cadastrada.");
} else {
  console.table(perguntasFrequentesLoja);
}

// ======================================================
// 84. BANNERS DA LOJA
// ======================================================

const bannersLoja = db.prepare(`
  SELECT
    sb.id,
    sb.title,
    sb.image_storage_key,
    sb.alt_text,
    sb.destination_url,
    sb.placement,
    sb.status,
    sb.sort_order,
    sb.starts_at,
    sb.ends_at,
    sb.updated_by,
    au.name AS updated_by_name,
    sb.created_at,
    sb.updated_at
  FROM store_banners AS sb
  LEFT JOIN admin_users AS au
    ON au.id = sb.updated_by
  ORDER BY sb.placement, sb.sort_order, sb.id
`).all();

console.log("\n=== BANNERS DA LOJA ===");

if (bannersLoja.length === 0) {
  console.log("Nenhum banner da loja cadastrado.");
} else {
  console.table(bannersLoja);
}

// ======================================================
// 85. LINKS E REDES SOCIAIS DA LOJA
// ======================================================

const linksRedesSociaisLoja = db.prepare(`
  SELECT
    ssl.id,
    ssl.platform,
    ssl.label,
    ssl.url,
    ssl.status,
    ssl.sort_order,
    ssl.updated_by,
    au.name AS updated_by_name,
    ssl.created_at,
    ssl.updated_at
  FROM store_social_links AS ssl
  LEFT JOIN admin_users AS au
    ON au.id = ssl.updated_by
  ORDER BY ssl.sort_order, ssl.id
`).all();

console.log("\n=== LINKS E REDES SOCIAIS DA LOJA ===");

if (linksRedesSociaisLoja.length === 0) {
  console.log("Nenhum link de rede social da loja cadastrado.");
} else {
  console.table(linksRedesSociaisLoja);
}

// ======================================================
// 86. CANAIS DE ATENDIMENTO DA LOJA
// ======================================================

const canaisAtendimentoLoja = db.prepare(`
  SELECT
    scc.id,
    scc.channel_type,
    scc.label,
    scc.contact_value,
    scc.status,
    scc.sort_order,
    scc.updated_by,
    au.name AS updated_by_name,
    scc.created_at,
    scc.updated_at
  FROM store_contact_channels AS scc
  LEFT JOIN admin_users AS au
    ON au.id = scc.updated_by
  ORDER BY scc.sort_order, scc.id
`).all();

console.log("\n=== CANAIS DE ATENDIMENTO DA LOJA ===");

if (canaisAtendimentoLoja.length === 0) {
  console.log("Nenhum canal de atendimento da loja cadastrado.");
} else {
  console.table(canaisAtendimentoLoja);
}

// ======================================================
// 87. HORÁRIOS DE ATENDIMENTO DA LOJA
// ======================================================

const horariosAtendimentoLoja = db.prepare(`
  SELECT
    sbh.id,
    sbh.weekday,
    CASE sbh.weekday
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Segunda-feira'
      WHEN 2 THEN 'Terça-feira'
      WHEN 3 THEN 'Quarta-feira'
      WHEN 4 THEN 'Quinta-feira'
      WHEN 5 THEN 'Sexta-feira'
      WHEN 6 THEN 'Sábado'
    END AS weekday_name,
    sbh.opens_at,
    sbh.closes_at,
    sbh.notes,
    sbh.updated_by,
    au.name AS updated_by_name,
    sbh.created_at,
    sbh.updated_at
  FROM store_business_hours AS sbh
  LEFT JOIN admin_users AS au
    ON au.id = sbh.updated_by
  ORDER BY sbh.weekday, sbh.opens_at
`).all();

console.log("\n=== HORÁRIOS DE ATENDIMENTO DA LOJA ===");

if (horariosAtendimentoLoja.length === 0) {
  console.log("Nenhum horário de atendimento da loja cadastrado.");
} else {
  console.table(horariosAtendimentoLoja);
}

// ======================================================
// 88. PERÍODOS SEM ATENDIMENTO DA LOJA
// ======================================================

const fechamentosLoja = db.prepare(`
  SELECT
    sc.id,
    sc.starts_at,
    sc.ends_at,
    sc.reason,
    sc.created_by,
    au.name AS created_by_name,
    sc.created_at
  FROM store_closures AS sc
  LEFT JOIN admin_users AS au
    ON au.id = sc.created_by
  ORDER BY sc.starts_at, sc.id
`).all();

console.log("\n=== PERÍODOS SEM ATENDIMENTO DA LOJA ===");

if (fechamentosLoja.length === 0) {
  console.log("Nenhum período sem atendimento cadastrado.");
} else {
  console.table(fechamentosLoja);
}

// ======================================================
// 89. FORMAS DE RECEBIMENTO DOS PEDIDOS
// ======================================================

const formasRecebimento = db.prepare(`
  SELECT
    sm.id,
    sm.name,
    sm.code,
    sm.method_type,
    sm.description,
    sm.estimated_min_days,
    sm.estimated_max_days,
    sm.status,
    sm.sort_order,
    sm.updated_by,
    au.name AS updated_by_name,
    sm.created_at,
    sm.updated_at
  FROM shipping_methods AS sm
  LEFT JOIN admin_users AS au
    ON au.id = sm.updated_by
  ORDER BY sm.sort_order, sm.id
`).all();

console.log("\n=== FORMAS DE RECEBIMENTO DOS PEDIDOS ===");

if (formasRecebimento.length === 0) {
  console.log("Nenhuma forma de recebimento cadastrada.");
} else {
  console.table(formasRecebimento);
}

// ======================================================
// 90. TARIFAS DE FRETE POR FAIXA DE CEP
// ======================================================

const tarifasFrete = db.prepare(`
  SELECT
    smr.id,
    smr.shipping_method_id,
    sm.name AS shipping_method_name,
    sm.method_type,
    sm.status AS shipping_method_status,
    smr.name,
    smr.postal_code_start,
    smr.postal_code_end,
    smr.price_cents,
    smr.status,
    smr.updated_by,
    au.name AS updated_by_name,
    smr.created_at,
    smr.updated_at
  FROM shipping_method_rates AS smr
  INNER JOIN shipping_methods AS sm
    ON sm.id = smr.shipping_method_id
  LEFT JOIN admin_users AS au
    ON au.id = smr.updated_by
  ORDER BY
    smr.shipping_method_id,
    smr.postal_code_start,
    smr.id
`).all();

console.log("\n=== TARIFAS DE FRETE POR FAIXA DE CEP ===");

if (tarifasFrete.length === 0) {
  console.log("Nenhuma tarifa de frete cadastrada.");
} else {
  console.table(tarifasFrete);
}

// ======================================================
// 91. PONTOS DE RETIRADA DOS PEDIDOS
// ======================================================

const pontosRetirada = db.prepare(`
  SELECT
    pp.id,
    pp.name,
    pp.code,
    pp.shipping_method_id,
    sm.name AS shipping_method_name,
    sm.method_type,
    sm.status AS shipping_method_status,
    pp.postal_code,
    pp.street,
    pp.street_number,
    pp.complement,
    pp.neighborhood,
    pp.city,
    pp.state,
    pp.instructions,
    pp.status,
    pp.updated_by,
    au.name AS updated_by_name,
    pp.created_at,
    pp.updated_at
  FROM pickup_points AS pp
  INNER JOIN shipping_methods AS sm
    ON sm.id = pp.shipping_method_id
  LEFT JOIN admin_users AS au
    ON au.id = pp.updated_by
  ORDER BY pp.name, pp.id
`).all();

console.log("\n=== PONTOS DE RETIRADA DOS PEDIDOS ===");

if (pontosRetirada.length === 0) {
  console.log("Nenhum ponto de retirada cadastrado.");
} else {
  console.table(pontosRetirada);
}

// ======================================================
// 92. HORÁRIOS DOS PONTOS DE RETIRADA
// ======================================================

const horariosPontosRetirada = db.prepare(`
  SELECT
    pph.id,
    pph.pickup_point_id,
    pp.name AS pickup_point_name,
    pp.status AS pickup_point_status,
    pph.weekday,
    CASE pph.weekday
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Segunda-feira'
      WHEN 2 THEN 'Terça-feira'
      WHEN 3 THEN 'Quarta-feira'
      WHEN 4 THEN 'Quinta-feira'
      WHEN 5 THEN 'Sexta-feira'
      WHEN 6 THEN 'Sábado'
    END AS weekday_name,
    pph.opens_at,
    pph.closes_at,
    pph.notes,
    pph.updated_by,
    au.name AS updated_by_name,
    pph.created_at,
    pph.updated_at
  FROM pickup_point_hours AS pph
  INNER JOIN pickup_points AS pp
    ON pp.id = pph.pickup_point_id
  LEFT JOIN admin_users AS au
    ON au.id = pph.updated_by
  ORDER BY
    pph.pickup_point_id,
    pph.weekday,
    pph.opens_at
`).all();

console.log("\n=== HORÁRIOS DOS PONTOS DE RETIRADA ===");

if (horariosPontosRetirada.length === 0) {
  console.log("Nenhum horário de ponto de retirada cadastrado.");
} else {
  console.table(horariosPontosRetirada);
}

// ======================================================
// 93. FECHAMENTOS DOS PONTOS DE RETIRADA
// ======================================================

const fechamentosPontosRetirada = db.prepare(`
  SELECT
    ppc.id,
    ppc.pickup_point_id,
    pp.name AS pickup_point_name,
    pp.status AS pickup_point_status,
    ppc.starts_at,
    ppc.ends_at,
    ppc.reason,
    ppc.created_by,
    au.name AS created_by_name,
    ppc.created_at
  FROM pickup_point_closures AS ppc
  INNER JOIN pickup_points AS pp
    ON pp.id = ppc.pickup_point_id
  LEFT JOIN admin_users AS au
    ON au.id = ppc.created_by
  ORDER BY
    ppc.pickup_point_id,
    ppc.starts_at,
    ppc.id
`).all();

console.log("\n=== FECHAMENTOS DOS PONTOS DE RETIRADA ===");

if (fechamentosPontosRetirada.length === 0) {
  console.log("Nenhum fechamento de ponto de retirada cadastrado.");
} else {
  console.table(fechamentosPontosRetirada);
}

// ======================================================
// 94. RETIRADAS DOS PEDIDOS PELOS CLIENTES
// ======================================================

const retiradasPedidos = db.prepare(`
  SELECT
    op.id,
    op.order_id,
    op.pickup_point_id,
    pp.name AS pickup_point_name,
    op.status,
    op.ready_at,
    op.collected_at,
    op.collected_by_name,
    op.notes,
    op.updated_by,
    au.name AS updated_by_name,
    op.created_at,
    op.updated_at
  FROM order_pickups AS op
  INNER JOIN pickup_points AS pp
    ON pp.id = op.pickup_point_id
  LEFT JOIN admin_users AS au
    ON au.id = op.updated_by
  ORDER BY op.created_at DESC, op.id DESC
`).all();

console.log("\n=== RETIRADAS DOS PEDIDOS PELOS CLIENTES ===");

if (retiradasPedidos.length === 0) {
  console.log("Nenhuma retirada de pedido cadastrada.");
} else {
  console.table(retiradasPedidos);
}

// ======================================================
// 95. HISTÓRICO DAS RETIRADAS DOS PEDIDOS
// ======================================================

const historicoRetiradasPedidos = db.prepare(`
  SELECT
    oph.id,
    oph.order_pickup_id,
    op.order_id,
    oph.event_type,
    oph.previous_status,
    oph.new_status,
    oph.description,
    oph.actor_name,
    oph.created_by,
    au.name AS admin_current_name,
    oph.created_at
  FROM order_pickup_history AS oph
  INNER JOIN order_pickups AS op
    ON op.id = oph.order_pickup_id
  LEFT JOIN admin_users AS au
    ON au.id = oph.created_by
  ORDER BY oph.created_at DESC, oph.id DESC
`).all();

console.log("\n=== HISTÓRICO DAS RETIRADAS DOS PEDIDOS ===");

if (historicoRetiradasPedidos.length === 0) {
  console.log("Nenhum histórico de retirada cadastrado.");
} else {
  console.table(historicoRetiradasPedidos);
}

// ======================================================
// 96. OBSERVAÇÕES INTERNAS DOS PEDIDOS
// ======================================================

const observacoesPedidos = db.prepare(`
  SELECT
    onote.id,
    onote.order_id,
    onote.note,
    onote.author_name,
    onote.created_by,
    au.name AS admin_current_name,
    onote.created_at
  FROM order_notes AS onote
  LEFT JOIN admin_users AS au
    ON au.id = onote.created_by
  ORDER BY onote.created_at DESC, onote.id DESC
`).all();

console.log("\n=== OBSERVAÇÕES INTERNAS DOS PEDIDOS ===");

if (observacoesPedidos.length === 0) {
  console.log("Nenhuma observação interna de pedido cadastrada.");
} else {
  console.table(observacoesPedidos);
}

// ======================================================
// 97. DOCUMENTOS DOS PEDIDOS
// ======================================================

const documentosPedidos = db.prepare(`
  SELECT
    od.id,
    od.order_id,
    od.document_type,
    od.title,
    od.original_filename,
    od.storage_key,
    od.mime_type,
    od.file_size_bytes,
    od.status,
    od.uploaded_by,
    au.name AS uploaded_by_name,
    od.created_at,
    od.updated_at
  FROM order_documents AS od
  LEFT JOIN admin_users AS au
    ON au.id = od.uploaded_by
  ORDER BY od.created_at DESC, od.id DESC
`).all();

console.log("\n=== DOCUMENTOS DOS PEDIDOS ===");

if (documentosPedidos.length === 0) {
  console.log("Nenhum documento de pedido cadastrado.");
} else {
  console.table(documentosPedidos);
}

// ======================================================
// 98. TAREFAS DOS PEDIDOS
// ======================================================

const tarefasPedidos = db.prepare(`
  SELECT
    ot.id,
    ot.order_id,
    ot.title,
    ot.description,
    ot.status,
    ot.priority,
    ot.assigned_to,
    assigned.name AS assigned_to_name,
    ot.due_at,
    ot.completed_at,
    ot.created_by,
    creator.name AS created_by_name,
    ot.created_at,
    ot.updated_at
  FROM order_tasks AS ot
  LEFT JOIN admin_users AS assigned
    ON assigned.id = ot.assigned_to
  LEFT JOIN admin_users AS creator
    ON creator.id = ot.created_by
  ORDER BY ot.created_at DESC, ot.id DESC
`).all();

console.log("\n=== TAREFAS DOS PEDIDOS ===");

if (tarefasPedidos.length === 0) {
  console.log("Nenhuma tarefa de pedido cadastrada.");
} else {
  console.table(tarefasPedidos);
}

// ======================================================
// 99. HISTÓRICO DAS TAREFAS DOS PEDIDOS
// ======================================================

const historicoTarefasPedidos = db.prepare(`
  SELECT
    oth.id,
    oth.order_task_id,
    ot.order_id,
    ot.title AS task_title,
    oth.event_type,
    oth.previous_status,
    oth.new_status,
    oth.description,
    oth.actor_name,
    oth.created_by,
    au.name AS admin_current_name,
    oth.created_at
  FROM order_task_history AS oth
  INNER JOIN order_tasks AS ot
    ON ot.id = oth.order_task_id
  LEFT JOIN admin_users AS au
    ON au.id = oth.created_by
  ORDER BY oth.created_at DESC, oth.id DESC
`).all();

console.log("\n=== HISTÓRICO DAS TAREFAS DOS PEDIDOS ===");

if (historicoTarefasPedidos.length === 0) {
  console.log("Nenhum histórico de tarefa de pedido cadastrado.");
} else {
  console.table(historicoTarefasPedidos);
}

// ======================================================
// 100. CHAMADOS DE ATENDIMENTO
// ======================================================

const chamadosAtendimento = db.prepare(`
  SELECT
    st.id,
    st.ticket_number,
    st.customer_id,
    st.order_id,
    st.contact_name,
    st.contact_email,
    st.subject,
    st.status,
    st.priority,
    st.assigned_to,
    au.name AS assigned_to_name,
    st.closed_at,
    st.created_at,
    st.updated_at
  FROM support_tickets AS st
  LEFT JOIN admin_users AS au
    ON au.id = st.assigned_to
  ORDER BY st.created_at DESC, st.id DESC
`).all();

console.log("\n=== CHAMADOS DE ATENDIMENTO ===");

if (chamadosAtendimento.length === 0) {
  console.log("Nenhum chamado de atendimento cadastrado.");
} else {
  console.table(chamadosAtendimento);
}

// ======================================================
// 101. MENSAGENS DOS CHAMADOS DE ATENDIMENTO
// ======================================================

const mensagensAtendimento = db.prepare(`
  SELECT
    sm.id,
    sm.support_ticket_id,
    st.ticket_number,
    sm.sender_type,
    sm.sender_name,
    sm.admin_user_id,
    au.name AS admin_current_name,
    sm.message,
    sm.visibility,
    sm.created_at
  FROM support_messages AS sm
  INNER JOIN support_tickets AS st
    ON st.id = sm.support_ticket_id
  LEFT JOIN admin_users AS au
    ON au.id = sm.admin_user_id
  ORDER BY
    sm.support_ticket_id,
    sm.created_at,
    sm.id
`).all();

console.log("\n=== MENSAGENS DOS CHAMADOS DE ATENDIMENTO ===");

if (mensagensAtendimento.length === 0) {
  console.log("Nenhuma mensagem de atendimento cadastrada.");
} else {
  console.table(mensagensAtendimento);
}

// ======================================================
// 102. ANEXOS DAS MENSAGENS DE ATENDIMENTO
// ======================================================

const anexosMensagensAtendimento = db.prepare(`
  SELECT
    sma.id,
    sma.support_message_id,
    sm.support_ticket_id,
    st.ticket_number,
    sm.visibility AS message_visibility,
    sma.original_filename,
    sma.storage_key,
    sma.mime_type,
    sma.file_size_bytes,
    sma.status,
    sma.created_at,
    sma.updated_at
  FROM support_message_attachments AS sma
  INNER JOIN support_messages AS sm
    ON sm.id = sma.support_message_id
  INNER JOIN support_tickets AS st
    ON st.id = sm.support_ticket_id
  ORDER BY sma.created_at DESC, sma.id DESC
`).all();

console.log("\n=== ANEXOS DAS MENSAGENS DE ATENDIMENTO ===");

if (anexosMensagensAtendimento.length === 0) {
  console.log("Nenhum anexo de mensagem de atendimento cadastrado.");
} else {
  console.table(anexosMensagensAtendimento);
}

// ======================================================
// 103. HISTÓRICO DOS CHAMADOS DE ATENDIMENTO
// ======================================================

const historicoChamadosAtendimento = db.prepare(`
  SELECT
    sth.id,
    sth.support_ticket_id,
    st.ticket_number,
    sth.event_type,
    sth.previous_status,
    sth.new_status,
    sth.description,
    sth.actor_name,
    sth.created_by,
    au.name AS admin_current_name,
    sth.created_at
  FROM support_ticket_history AS sth
  INNER JOIN support_tickets AS st
    ON st.id = sth.support_ticket_id
  LEFT JOIN admin_users AS au
    ON au.id = sth.created_by
  ORDER BY sth.created_at DESC, sth.id DESC
`).all();

console.log("\n=== HISTÓRICO DOS CHAMADOS DE ATENDIMENTO ===");

if (historicoChamadosAtendimento.length === 0) {
  console.log("Nenhum histórico de chamado de atendimento cadastrado.");
} else {
  console.table(historicoChamadosAtendimento);
}

// ======================================================
// 104. RESPOSTAS SALVAS PARA ATENDIMENTO
// ======================================================

const respostasSalvasAtendimento = db.prepare(`
  SELECT
    ssr.id,
    ssr.title,
    ssr.shortcut,
    ssr.content,
    ssr.status,
    ssr.updated_by,
    au.name AS updated_by_name,
    ssr.created_at,
    ssr.updated_at
  FROM support_saved_replies AS ssr
  LEFT JOIN admin_users AS au
    ON au.id = ssr.updated_by
  ORDER BY ssr.title, ssr.id
`).all();

console.log("\n=== RESPOSTAS SALVAS PARA ATENDIMENTO ===");

if (respostasSalvasAtendimento.length === 0) {
  console.log("Nenhuma resposta salva para atendimento cadastrada.");
} else {
  console.table(respostasSalvasAtendimento);
}

// ======================================================
// 105. AVALIAÇÕES DOS CHAMADOS DE ATENDIMENTO
// ======================================================

const avaliacoesAtendimento = db.prepare(`
  SELECT
    str.id,
    str.support_ticket_id,
    st.ticket_number,
    st.status AS ticket_status,
    str.rating,
    str.comment,
    str.created_at
  FROM support_ticket_ratings AS str
  INNER JOIN support_tickets AS st
    ON st.id = str.support_ticket_id
  ORDER BY str.created_at DESC, str.id DESC
`).all();

console.log("\n=== AVALIAÇÕES DOS CHAMADOS DE ATENDIMENTO ===");

if (avaliacoesAtendimento.length === 0) {
  console.log("Nenhuma avaliação de atendimento cadastrada.");
} else {
  console.table(avaliacoesAtendimento);
}

// ======================================================
// 106. ETIQUETAS DE ATENDIMENTO
// ======================================================

const etiquetasAtendimento = db.prepare(`
  SELECT
    st.id,
    st.name,
    st.description,
    st.status,
    st.updated_by,
    au.name AS updated_by_name,
    st.created_at,
    st.updated_at
  FROM support_tags AS st
  LEFT JOIN admin_users AS au
    ON au.id = st.updated_by
  ORDER BY st.name, st.id
`).all();

console.log("\n=== ETIQUETAS DE ATENDIMENTO ===");

if (etiquetasAtendimento.length === 0) {
  console.log("Nenhuma etiqueta de atendimento cadastrada.");
} else {
  console.table(etiquetasAtendimento);
}

// ======================================================
// 107. ETIQUETAS DOS CHAMADOS DE ATENDIMENTO
// ======================================================

const etiquetasChamadosAtendimento = db.prepare(`
  SELECT
    stt.id,
    stt.support_ticket_id,
    st.ticket_number,
    st.subject,
    stt.support_tag_id,
    tag.name AS tag_name,
    tag.status AS tag_status,
    stt.created_by,
    au.name AS created_by_name,
    stt.created_at
  FROM support_ticket_tags AS stt
  INNER JOIN support_tickets AS st
    ON st.id = stt.support_ticket_id
  INNER JOIN support_tags AS tag
    ON tag.id = stt.support_tag_id
  LEFT JOIN admin_users AS au
    ON au.id = stt.created_by
  ORDER BY stt.support_ticket_id, tag.name, stt.id
`).all();

console.log("\n=== ETIQUETAS DOS CHAMADOS DE ATENDIMENTO ===");

if (etiquetasChamadosAtendimento.length === 0) {
  console.log("Nenhuma etiqueta vinculada aos chamados de atendimento.");
} else {
  console.table(etiquetasChamadosAtendimento);
}

// ======================================================
// 108. LOOKS DA LOJA
// ======================================================

const looksLoja = db.prepare(`
  SELECT
    l.id,
    l.title,
    l.slug,
    l.description,
    l.status,
    l.sort_order,
    l.updated_by,
    au.name AS updated_by_name,
    l.created_at,
    l.updated_at
  FROM looks AS l
  LEFT JOIN admin_users AS au
    ON au.id = l.updated_by
  ORDER BY l.sort_order, l.title, l.id
`).all();

console.log("\n=== LOOKS DA LOJA ===");

if (looksLoja.length === 0) {
  console.log("Nenhum look cadastrado.");
} else {
  console.table(looksLoja);
}

// ======================================================
// 109. PRODUTOS DOS LOOKS
// ======================================================

const produtosLooks = db.prepare(`
  SELECT
    li.id,
    li.look_id,
    l.title AS look_title,
    li.product_id,
    p.name AS product_name,
    li.quantity,
    li.sort_order,
    li.notes,
    li.updated_by,
    au.name AS updated_by_name,
    li.created_at,
    li.updated_at
  FROM look_items AS li
  INNER JOIN looks AS l
    ON l.id = li.look_id
  INNER JOIN products AS p
    ON p.id = li.product_id
  LEFT JOIN admin_users AS au
    ON au.id = li.updated_by
  ORDER BY li.look_id, li.sort_order, li.id
`).all();

console.log("\n=== PRODUTOS DOS LOOKS ===");

if (produtosLooks.length === 0) {
  console.log("Nenhum produto vinculado aos looks.");
} else {
  console.table(produtosLooks);
}

// ======================================================
// 110. OCASIÕES DOS LOOKS
// ======================================================

const ocasioesLooks = db.prepare(`
  SELECT
    lo.id,
    lo.name,
    lo.slug,
    lo.description,
    lo.status,
    lo.sort_order,
    lo.updated_by,
    au.name AS updated_by_name,
    lo.created_at,
    lo.updated_at
  FROM look_occasions AS lo
  LEFT JOIN admin_users AS au
    ON au.id = lo.updated_by
  ORDER BY lo.sort_order, lo.name, lo.id
`).all();

console.log("\n=== OCASIÕES DOS LOOKS ===");

if (ocasioesLooks.length === 0) {
  console.log("Nenhuma ocasião de look cadastrada.");
} else {
  console.table(ocasioesLooks);
}

// ======================================================
// 111. VÍNCULOS DOS LOOKS COM AS OCASIÕES
// ======================================================

const vinculosLooksOcasioes = db.prepare(`
  SELECT
    lol.id,
    lol.look_id,
    l.title AS look_title,
    l.status AS look_status,
    lol.look_occasion_id,
    lo.name AS occasion_name,
    lo.status AS occasion_status,
    lol.created_by,
    au.name AS created_by_name,
    lol.created_at
  FROM look_occasion_links AS lol
  INNER JOIN looks AS l
    ON l.id = lol.look_id
  INNER JOIN look_occasions AS lo
    ON lo.id = lol.look_occasion_id
  LEFT JOIN admin_users AS au
    ON au.id = lol.created_by
  ORDER BY lo.name, l.title, lol.id
`).all();

console.log("\n=== VÍNCULOS DOS LOOKS COM AS OCASIÕES ===");

if (vinculosLooksOcasioes.length === 0) {
  console.log("Nenhum look vinculado às ocasiões.");
} else {
  console.table(vinculosLooksOcasioes);
}

// ======================================================
// 112. IMAGENS DOS LOOKS
// ======================================================

const imagensLooks = db.prepare(`
  SELECT
    lm.id,
    lm.look_id,
    l.title AS look_title,
    lm.file_name,
    lm.storage_key,
    lm.mime_type,
    lm.file_size_bytes,
    lm.alt_text,
    lm.sort_order,
    lm.status,
    lm.uploaded_by,
    au.name AS uploaded_by_name,
    lm.created_at,
    lm.updated_at
  FROM look_media AS lm
  INNER JOIN looks AS l
    ON l.id = lm.look_id
  LEFT JOIN admin_users AS au
    ON au.id = lm.uploaded_by
  ORDER BY lm.look_id, lm.sort_order, lm.id
`).all();

console.log("\n=== IMAGENS DOS LOOKS ===");

if (imagensLooks.length === 0) {
  console.log("Nenhuma imagem de look cadastrada.");
} else {
  console.table(imagensLooks);
}

// ======================================================
// 113. LOOKS SALVOS PELOS CLIENTES
// ======================================================

const looksSalvosClientes = db.prepare(`
  SELECT
    csl.id,
    csl.customer_id,
    csl.look_id,
    l.title AS look_title,
    l.slug AS look_slug,
    l.status AS look_status,
    csl.created_at
  FROM customer_saved_looks AS csl
  INNER JOIN looks AS l
    ON l.id = csl.look_id
  ORDER BY csl.customer_id, csl.created_at DESC, csl.id DESC
`).all();

console.log("\n=== LOOKS SALVOS PELOS CLIENTES ===");

if (looksSalvosClientes.length === 0) {
  console.log("Nenhum look salvo pelos clientes.");
} else {
  console.table(looksSalvosClientes);
}

// ======================================================
// 114. COMBINAÇÕES CRIADAS PELOS CLIENTES
// ======================================================

const combinacoesClientes = db.prepare(`
  SELECT
    id,
    customer_id,
    title,
    notes,
    status,
    created_at,
    updated_at
  FROM customer_outfits
  ORDER BY customer_id, created_at DESC, id DESC
`).all();

console.log("\n=== COMBINAÇÕES CRIADAS PELOS CLIENTES ===");

if (combinacoesClientes.length === 0) {
  console.log("Nenhuma combinação criada pelos clientes.");
} else {
  console.table(combinacoesClientes);
}

// ======================================================
// 115. PRODUTOS DAS COMBINAÇÕES DOS CLIENTES
// ======================================================

const produtosCombinacoesClientes = db.prepare(`
  SELECT
    coi.id,
    coi.customer_outfit_id,
    co.customer_id,
    co.title AS outfit_title,
    coi.product_id,
    p.name AS product_name,
    coi.quantity,
    coi.sort_order,
    coi.notes,
    coi.created_at,
    coi.updated_at
  FROM customer_outfit_items AS coi
  INNER JOIN customer_outfits AS co
    ON co.id = coi.customer_outfit_id
  INNER JOIN products AS p
    ON p.id = coi.product_id
  ORDER BY coi.customer_outfit_id, coi.sort_order, coi.id
`).all();

console.log("\n=== PRODUTOS DAS COMBINAÇÕES DOS CLIENTES ===");

if (produtosCombinacoesClientes.length === 0) {
  console.log("Nenhum produto vinculado às combinações dos clientes.");
} else {
  console.table(produtosCombinacoesClientes);
}

// ======================================================
// 116. OCASIÕES DAS COMBINAÇÕES DOS CLIENTES
// ======================================================

const ocasioesCombinacoesClientes = db.prepare(`
  SELECT
    coo.id,
    coo.customer_outfit_id,
    co.customer_id,
    co.title AS outfit_title,
    coo.look_occasion_id,
    lo.name AS occasion_name,
    lo.status AS occasion_status,
    coo.created_at
  FROM customer_outfit_occasions AS coo
  INNER JOIN customer_outfits AS co
    ON co.id = coo.customer_outfit_id
  INNER JOIN look_occasions AS lo
    ON lo.id = coo.look_occasion_id
  ORDER BY co.customer_id, coo.customer_outfit_id, lo.name, coo.id
`).all();

console.log("\n=== OCASIÕES DAS COMBINAÇÕES DOS CLIENTES ===");

if (ocasioesCombinacoesClientes.length === 0) {
  console.log("Nenhuma ocasião vinculada às combinações dos clientes.");
} else {
  console.table(ocasioesCombinacoesClientes);
}

// ======================================================
// 117. PEÇAS DO GUARDA-ROUPA DOS CLIENTES
// ======================================================

const pecasGuardaRoupaClientes = db.prepare(`
  SELECT
    id,
    customer_id,
    title,
    description,
    color,
    size,
    brand,
    status,
    created_at,
    updated_at
  FROM customer_wardrobe_items
  ORDER BY customer_id, title, id
`).all();

console.log("\n=== PEÇAS DO GUARDA-ROUPA DOS CLIENTES ===");

if (pecasGuardaRoupaClientes.length === 0) {
  console.log("Nenhuma peça cadastrada no guarda-roupa dos clientes.");
} else {
  console.table(pecasGuardaRoupaClientes);
}

// ======================================================
// 118. IMAGENS DAS PEÇAS DO GUARDA-ROUPA
// ======================================================

const imagensGuardaRoupaClientes = db.prepare(`
  SELECT
    cwm.id,
    cwm.customer_wardrobe_item_id,
    cwi.customer_id,
    cwi.title AS item_title,
    cwm.file_name,
    cwm.storage_key,
    cwm.mime_type,
    cwm.file_size_bytes,
    cwm.alt_text,
    cwm.sort_order,
    cwm.status,
    cwm.created_at,
    cwm.updated_at
  FROM customer_wardrobe_media AS cwm
  INNER JOIN customer_wardrobe_items AS cwi
    ON cwi.id = cwm.customer_wardrobe_item_id
  ORDER BY
    cwi.customer_id,
    cwm.customer_wardrobe_item_id,
    cwm.sort_order,
    cwm.id
`).all();

console.log("\n=== IMAGENS DAS PEÇAS DO GUARDA-ROUPA ===");

if (imagensGuardaRoupaClientes.length === 0) {
  console.log("Nenhuma imagem de peça do guarda-roupa cadastrada.");
} else {
  console.table(imagensGuardaRoupaClientes);
}

// ======================================================
// 119. PEÇAS DO GUARDA-ROUPA NAS COMBINAÇÕES
// ======================================================

const pecasGuardaRoupaCombinacoes = db.prepare(`
  SELECT
    cowi.id,
    cowi.customer_id,
    cowi.customer_outfit_id,
    co.title AS outfit_title,
    cowi.customer_wardrobe_item_id,
    cwi.title AS wardrobe_item_title,
    cwi.status AS wardrobe_item_status,
    cowi.quantity,
    cowi.sort_order,
    cowi.notes,
    cowi.created_at,
    cowi.updated_at
  FROM customer_outfit_wardrobe_items AS cowi
  INNER JOIN customer_outfits AS co
    ON co.id = cowi.customer_outfit_id
    AND co.customer_id = cowi.customer_id
  INNER JOIN customer_wardrobe_items AS cwi
    ON cwi.id = cowi.customer_wardrobe_item_id
    AND cwi.customer_id = cowi.customer_id
  ORDER BY
    cowi.customer_id,
    cowi.customer_outfit_id,
    cowi.sort_order,
    cowi.id
`).all();

console.log("\n=== PEÇAS DO GUARDA-ROUPA NAS COMBINAÇÕES ===");

if (pecasGuardaRoupaCombinacoes.length === 0) {
  console.log("Nenhuma peça do guarda-roupa vinculada às combinações.");
} else {
  console.table(pecasGuardaRoupaCombinacoes);
}

// ======================================================
// 120. PLANEJAMENTO DAS COMBINAÇÕES DOS CLIENTES
// ======================================================

const planejamentoCombinacoesClientes = db.prepare(`
  SELECT
    cop.id,
    cop.customer_id,
    cop.customer_outfit_id,
    co.title AS outfit_title,
    cop.planned_date,
    cop.event_name,
    cop.notes,
    cop.status,
    cop.created_at,
    cop.updated_at
  FROM customer_outfit_plans AS cop
  INNER JOIN customer_outfits AS co
    ON co.id = cop.customer_outfit_id
    AND co.customer_id = cop.customer_id
  ORDER BY cop.customer_id, cop.planned_date, cop.id
`).all();

console.log("\n=== PLANEJAMENTO DAS COMBINAÇÕES DOS CLIENTES ===");

if (planejamentoCombinacoesClientes.length === 0) {
  console.log("Nenhuma combinação agendada pelos clientes.");
} else {
  console.table(planejamentoCombinacoesClientes);
}

// ======================================================
// 121. RESUMO
// ======================================================

console.log("\nResumo do banco Neumam:");

console.table([
  {
    item: "Categorias",
    total: categorias.length,
  },

  {    item: "Coleções",
    total: colecoes.length,
  },
  {
    item: "Produtos",
    total: produtos.length,
  },
  {
    item: "Variantes",
    total: variantes.length,
  },
  {
    item: "Preços de variantes",
    total: precosVariantes.length,
  },
  {
    item: "Dados comerciais das variantes",
    total: dadosComerciaisVariantes.length,
  },
  {
    item: "Disponibilidade de variantes",
    total: disponibilidadeVariantes.length,
  },
  {
    item: "Fornecedores",
    total: fornecedores.length,
  },
  {
    item: "Vínculos fornecedor-variante",
    total: fornecedoresVariantes.length,
  },
  {
    item: "Mídias de produtos",
    total: midiasProdutos.length,
  },
  {
    item: "Dados de frete das variantes",
    total: fretesVariantes.length,
  },
  {
    item: "SEO dos produtos",
    total: seoProdutos.length,
  },
  {
    item: "Atributos",
    total: atributos.length,
  },
  {
    item: "Valores de atributos",
    total: valoresAtributos.length,
  },
  {
    item: "Atributos associados aos produtos",
    total: atributosProdutos.length,
  },
  {
    item: "Publicações de produtos",
    total: publicacoesProdutos.length,
  },
  {
    item: "Histórico de produtos",
    total: historicoProdutos.length,
  },
  {
    item: "Tags",
    total: tags.length,
  },
  {
    item: "Tags associadas aos produtos",
    total: tagsProdutos.length,
  },
  {
    item: "Relacionamentos entre produtos",
    total: relacionamentosProdutos.length,
  },
  {
    item: "Clientes",
    total: clientes.length,
  },
  {
    item: "Endereços de clientes",
    total: enderecosClientes.length,
  },
  {
    item: "Pedidos",
    total: pedidos.length,
  },
  {
    item: "Itens dos pedidos",
    total: itensPedidos.length,
  },
  {
  item: "Pagamentos",
  total: pagamentos.length,
},
{
  item: "Entregas dos pedidos",
  total: entregasPedidos.length,
},
{
  item: "Cupons",
  total: cupons.length,
},
{
  item: "Usos de cupons",
  total: usosCupons.length,
},
{
  item: "Carrinhos",
  total: carrinhos.length,
},
{
  item: "Itens do carrinho",
  total: itensCarrinho.length,
},
{
  item: "Listas de desejos",
  total: listasDesejos.length,
},
{
  item: "Itens das listas de desejos",
  total: itensListasDesejos.length,
},
{
  item: "Avaliações de produtos",
  total: avaliacoesProdutos.length,
},
{
  item: "Perguntas sobre produtos",
  total: perguntasProdutos.length,
},
{
  item: "Notificações",
  total: notificacoes.length,
},
{
  item: "Devoluções e trocas",
  total: devolucoesTrocas.length,
},
{
  item: "Histórico de devoluções e trocas",
  total: historicoDevolucoesTrocas.length,
},
{
  item: "Movimentações de estoque",
  total: movimentacoesEstoque.length,
},
{
  item: "Histórico dos pedidos",
  total: historicoPedidos.length,
},
{
  item: "Eventos das entregas",
  total: eventosEntregas.length,
},
{
  item: "Autenticações dos clientes",
  total: autenticacoesClientes.length,
},
{
  item: "Recuperações de senha dos clientes",
  total: recuperacoesSenhaClientes.length,
},
{
  item: "Verificações de e-mail dos clientes",
  total: verificacoesEmailClientes.length,
},
{
  item: "Sessões dos clientes",
  total: sessoesClientes.length,
},
{
  item: "Observações dos clientes",
  total: observacoesClientes.length,
},
{
  item: "Atendimentos dos clientes",
  total: atendimentosClientes.length,
},
{
  item: "Tarefas dos clientes",
  total: tarefasClientes.length,
},
{
  item: "Grupos de clientes",
  total: gruposClientes.length,
},
{
  item: "Vínculos entre clientes e grupos",
  total: clientesGrupos.length,
},
{
  item: "Histórico de alterações dos clientes",
  total: historicoClientes.length,
},
{
  item: "Pedidos de compra aos fornecedores",
  total: pedidosCompra.length,
},
{
  item: "Itens dos pedidos de compra",
  total: itensPedidosCompra.length,
},
{
  item: "Histórico dos pedidos de compra",
  total: historicoPedidosCompra.length,
},
  {
    item: "Recebimentos das compras",
    total: recebimentosCompra.length,
  },
  {
    item: "Itens dos recebimentos das compras",
    total: itensRecebimentosCompra.length,
  },
  {
    item: "Histórico dos recebimentos das compras",
    total: historicoRecebimentosCompra.length,
  },
  {
    item: "Vínculos entre compras e vendas",
    total: vinculosCompraVenda.length,
  },
  {
    item: "Observações dos fornecedores",
    total: observacoesFornecedores.length,
  },
  {
    item: "Contatos com os fornecedores",
    total: contatosFornecedores.length,
  },
   {
    item: "Tarefas dos fornecedores",
    total: tarefasFornecedores.length,
  },
  {
    item: "Histórico de alterações dos fornecedores",
    total: historicoFornecedores.length,
  },
  {
    item: "Pessoas de contato dos fornecedores",
    total: pessoasContatoFornecedores.length,
  },
  {
    item: "Endereços dos fornecedores",
    total: enderecosFornecedores.length,
  },
   {
    item: "Horários dos fornecedores",
    total: horariosFornecedores.length,
  },
  {
    item: "Fechamentos dos fornecedores",
    total: fechamentosFornecedores.length,
  },
  {
    item: "Agendamentos de retirada nos fornecedores",
    total: agendamentosRetirada.length,
  },
  {
    item: "Histórico dos agendamentos de retirada",
    total: historicoAgendamentosRetirada.length,
  },
   {
    item: "Documentos dos fornecedores",
    total: documentosFornecedores.length,
  },
   {
    item: "Links e redes sociais dos fornecedores",
    total: linksFornecedores.length,
  },
    {
    item: "Documentos dos pedidos de compra",
    total: documentosPedidosCompra.length,
  },
  {
    item: "Observações dos pedidos de compra",
    total: observacoesPedidosCompra.length,
  },
  {
    item: "Usuários administrativos",
    total: usuariosAdministrativos.length,
  },
   {
    item: "Autenticação dos usuários administrativos",
    total: autenticacoesAdministrativas.length,
  },
  {
    item: "Sessões dos usuários administrativos",
    total: sessoesAdministrativas.length,
  },
   {
    item: "Recuperação de senha dos administradores",
    total: recuperacoesSenhaAdministrativas.length,
  },
    {
    item: "Perfis de acesso administrativo",
    total: perfisAdministrativos.length,
  },
  {
    item: "Vínculos entre usuários e perfis",
    total: vinculosUsuariosPerfis.length,
  },
  {
    item: "Permissões administrativas",
    total: permissoesAdministrativas.length,
  },
    {
    item: "Vínculos entre perfis e permissões",
    total: vinculosPerfisPermissoes.length,
  },
  {
    item: "Registros de auditoria administrativa",
    total: registrosAuditoriaAdministrativa.length,
  },
  {
    item: "Configurações gerais da loja",
    total: configuracoesLoja.length,
  },
    {
    item: "Páginas institucionais da loja",
    total: paginasLoja.length,
  },
  {
    item: "Perguntas frequentes da loja",
    total: perguntasFrequentesLoja.length,
  },
  {
    item: "Banners da loja",
    total: bannersLoja.length,
  },
  {
    item: "Links e redes sociais da loja",
    total: linksRedesSociaisLoja.length,
  },
  {
    item: "Canais de atendimento da loja",
    total: canaisAtendimentoLoja.length,
  },
  {
    item: "Horários de atendimento da loja",
    total: horariosAtendimentoLoja.length,
  },
  {
    item: "Períodos sem atendimento da loja",
    total: fechamentosLoja.length,
  },
   {
    item: "Formas de recebimento dos pedidos",
    total: formasRecebimento.length,
  },
  {
    item: "Tarifas de frete por faixa de CEP",
    total: tarifasFrete.length,
  },
   {
    item: "Pontos de retirada dos pedidos",
    total: pontosRetirada.length,
  },
   {
    item: "Horários dos pontos de retirada",
    total: horariosPontosRetirada.length,
  },
  {
    item: "Fechamentos dos pontos de retirada",
    total: fechamentosPontosRetirada.length,
  },
   {
    item: "Retiradas dos pedidos pelos clientes",
    total: retiradasPedidos.length,
  },
    {
    item: "Histórico das retiradas dos pedidos",
    total: historicoRetiradasPedidos.length,
  },
  {
    item: "Observações internas dos pedidos",
    total: observacoesPedidos.length,
  },
  {
    item: "Documentos dos pedidos",
    total: documentosPedidos.length,
  },
    {
    item: "Tarefas dos pedidos",
    total: tarefasPedidos.length,
  },
  {
    item: "Histórico das tarefas dos pedidos",
    total: historicoTarefasPedidos.length,
  },
  {
    item: "Chamados de atendimento",
    total: chamadosAtendimento.length,
  },
  {
    item: "Mensagens dos chamados de atendimento",
    total: mensagensAtendimento.length,
  },
    {
    item: "Anexos das mensagens de atendimento",
    total: anexosMensagensAtendimento.length,
  },
  {
    item: "Histórico dos chamados de atendimento",
    total: historicoChamadosAtendimento.length,
  },
   {
    item: "Respostas salvas para atendimento",
    total: respostasSalvasAtendimento.length,
  },
  {
    item: "Avaliações dos chamados de atendimento",
    total: avaliacoesAtendimento.length,
  },
   {
    item: "Etiquetas de atendimento",
    total: etiquetasAtendimento.length,
  },
  {
    item: "Etiquetas dos chamados de atendimento",
    total: etiquetasChamadosAtendimento.length,
  },
  {
    item: "Looks da loja",
    total: looksLoja.length,
  },
  {
    item: "Produtos dos looks",
    total: produtosLooks.length,
  },
   {
    item: "Ocasiões dos looks",
    total: ocasioesLooks.length,
  },
  {
    item: "Vínculos dos looks com as ocasiões",
    total: vinculosLooksOcasioes.length,
  },
  {
    item: "Imagens dos looks",
    total: imagensLooks.length,
  },
   {
    item: "Looks salvos pelos clientes",
    total: looksSalvosClientes.length,
  },
   {
    item: "Combinações criadas pelos clientes",
    total: combinacoesClientes.length,
  },
   {
    item: "Produtos das combinações dos clientes",
    total: produtosCombinacoesClientes.length,
  },
   {
    item: "Ocasiões das combinações dos clientes",
    total: ocasioesCombinacoesClientes.length,
  },
  {
    item: "Peças do guarda-roupa dos clientes",
    total: pecasGuardaRoupaClientes.length,
  },
   {
    item: "Imagens das peças do guarda-roupa",
    total: imagensGuardaRoupaClientes.length,
  },
   {
    item: "Peças do guarda-roupa nas combinações",
    total: pecasGuardaRoupaCombinacoes.length,
  },
  {
    item: "Planejamento das combinações dos clientes",
    total: planejamentoCombinacoesClientes.length,
  },
]);