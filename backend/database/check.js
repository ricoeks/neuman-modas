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
      vp.cost_price,
      vp.sale_price,
      vp.promotional_price,
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
      vc.minimum_price,
      vc.target_margin_percent,
      vc.target_markup_percent,
      vc.commission_percent,
      vc.operational_cost,
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
      sv.supplier_cost,
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
      o.subtotal,
      o.discount_total,
      o.shipping_total,
      o.tax_total,
      o.total,
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
      oi.unit_price,
      oi.discount_total,
      oi.tax_total,
      oi.line_total,
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
      pay.amount,
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
      s.shipping_cost,
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
      discount_value,
      minimum_order_value,
      maximum_discount_value,
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
      cu.discount_value,
      cu.discount_amount,
      cu.order_subtotal,
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
      c.subtotal,
      c.discount_total,
      c.shipping_total,
      c.total,
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
      ci.unit_price,
      ci.discount_total,
      ci.line_total,
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
// 34. RESUMO
// ======================================================

console.log("\nResumo do banco Neumam:");

console.table([
  {
    item: "Categorias",
    total: categorias.length,
  },
  {
    item: "Coleções",
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
]);
