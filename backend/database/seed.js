const db = require("./connection");

// ======================================================
// 1. CATEGORIAS
// ======================================================

const inserirCategoria = db.prepare(`
  INSERT OR IGNORE INTO categories (
    parent_id,
    name,
    slug,
    description,
    status,
    sort_order
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

inserirCategoria.run(
  null,
  "Feminino",
  "feminino",
  "Moda feminina Neumam Modas",
  "active",
  1
);

const categoriaFeminino = db
  .prepare(`
    SELECT id
    FROM categories
    WHERE slug = ?
  `)
  .get("feminino");

inserirCategoria.run(
  categoriaFeminino.id,
  "Roupas",
  "roupas-femininas",
  "Roupas femininas Neumam Modas",
  "active",
  1
);

db.prepare(`
  UPDATE categories
  SET parent_id = ?
  WHERE slug = ?
`).run(
  categoriaFeminino.id,
  "roupas-femininas"
);

const categoriaRoupas = db
  .prepare(`
    SELECT id
    FROM categories
    WHERE slug = ?
  `)
  .get("roupas-femininas");

inserirCategoria.run(
  categoriaRoupas.id,
  "Blazers",
  "blazers-femininos",
  "Blazers femininos Neumam Modas",
  "active",
  1
);

const categoriaBlazers = db
  .prepare(`
    SELECT id
    FROM categories
    WHERE slug = ?
  `)
  .get("blazers-femininos");

// ======================================================
// 2. COLEÇÕES
// ======================================================

const inserirColecao = db.prepare(`
  INSERT OR IGNORE INTO collections (
    name,
    slug,
    description,
    start_date,
    end_date,
    status
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

inserirColecao.run(
  "Coleção Essência Premium",
  "colecao-essencia-premium",
  "Coleção premium da Neumam Modas com peças elegantes, sofisticadas e versáteis.",
  "2026-08-19",
  null,
  "active"
);

const colecaoEssenciaPremium = db
  .prepare(`
    SELECT id
    FROM collections
    WHERE slug = ?
  `)
  .get("colecao-essencia-premium");

// ======================================================
// 3. PRODUTO
// ======================================================

const inserirProduto = db.prepare(`
  INSERT OR IGNORE INTO products (
    sku_base,
    name,
    slug,
    brand,
    category_id,
    collection_id,
    status,
    lifecycle_stage,
    short_description,
    description
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

inserirProduto.run(
  "BLZ-PRM-001",
  "Blazer Premium NM",
  "blazer-premium-nm",
  "Neumam Modas",
  categoriaBlazers.id,
  colecaoEssenciaPremium.id,
  "active",
  "growth",
  "Blazer premium feminino da Neumam Modas.",
  "Blazer Premium NM com proposta elegante e moderna, cadastrado como produto principal do catálogo Neumam."
);

const produtoBlazerPremium = db
  .prepare(`
    SELECT id
    FROM products
    WHERE slug = ?
  `)
  .get("blazer-premium-nm");

// Garante categoria e coleção corretas
// caso o produto já exista.

db.prepare(`
  UPDATE products
  SET
    category_id = ?,
    collection_id = ?,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`).run(
  categoriaBlazers.id,
  colecaoEssenciaPremium.id,
  produtoBlazerPremium.id
);

// ======================================================
// 4. VARIANTES
// ======================================================

const inserirVariante = db.prepare(`
  INSERT OR IGNORE INTO product_variants (
    product_id,
    sku,
    ean,
    color_name,
    color_code,
    size_name,
    size_code,
    status
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const cores = [
  {
    nome: "Preto",
    codigo: "PRETO",
    sku: "PRETO",
  },
  {
    nome: "Bege",
    codigo: "BEGE",
    sku: "BEGE",
  },
];

const tamanhos = ["PP", "P", "M", "G", "GG"];

for (const cor of cores) {
  for (const tamanho of tamanhos) {
    inserirVariante.run(
      produtoBlazerPremium.id,
      `BLZ-PRM-001-${cor.sku}-${tamanho}`,
      null,
      cor.nome,
      cor.codigo,
      tamanho,
      tamanho,
      "active"
    );
  }
}

const variantesBlazerPremium = db
  .prepare(`
    SELECT
      id,
      sku
    FROM product_variants
    WHERE product_id = ?
    ORDER BY id
  `)
  .all(produtoBlazerPremium.id);

// ======================================================
// 5. PREÇOS DAS VARIANTES
// ======================================================

db.prepare(`
  DELETE FROM variant_pricing
  WHERE variant_id IN (
    SELECT id
    FROM product_variants
    WHERE product_id = ?
  )
`).run(produtoBlazerPremium.id);

const inserirPrecoVariante = db.prepare(`
  INSERT INTO variant_pricing (
    variant_id,
    cost_price,
    sale_price,
    promotional_price,
    currency,
    status,
    valid_from,
    valid_until
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const variante of variantesBlazerPremium) {
  inserirPrecoVariante.run(
    variante.id,
    149.90,
    299.90,
    null,
    "BRL",
    "active",
    "2026-08-19",
    null
  );
}

// ======================================================
// 6. DADOS COMERCIAIS DAS VARIANTES
// ======================================================

db.prepare(`
  DELETE FROM variant_commercial
  WHERE variant_id IN (
    SELECT id
    FROM product_variants
    WHERE product_id = ?
  )
`).run(produtoBlazerPremium.id);

const inserirComercialVariante = db.prepare(`
  INSERT INTO variant_commercial (
    variant_id,
    minimum_price,
    target_margin_percent,
    target_markup_percent,
    commission_percent,
    operational_cost,
    tax_percent,
    status
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const variante of variantesBlazerPremium) {
  inserirComercialVariante.run(
    variante.id,
    249.90,
    40,
    100,
    5,
    20.00,
    8,
    "active"
  );
}

// ======================================================
// 6. DISPONIBILIDADE DAS VARIANTES
// ======================================================

db.prepare(`
  DELETE FROM variant_inventory
  WHERE variant_id IN (
    SELECT id
    FROM product_variants
    WHERE product_id = ?
  )
`).run(produtoBlazerPremium.id);

const inserirInventarioVariante = db.prepare(`
  INSERT INTO variant_inventory (
    variant_id,
    source_type,
    available_quantity,
    availability_status,
    lead_time_days,
    last_checked_at
  )
  VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

for (const variante of variantesBlazerPremium) {
  inserirInventarioVariante.run(
    variante.id,
    "supplier",
    10,
    "available",
    5
  );
}

// ======================================================
// 7. FORNECEDOR
// ======================================================

const inserirFornecedor = db.prepare(`
  INSERT OR IGNORE INTO suppliers (
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
    notes
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

inserirFornecedor.run(
  "FORN-001",
  "Fornecedor Piloto NM",
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  "São Paulo",
  "SP",
  null,
  "Brasil",
  5,
  "active",
  "Fornecedor fictício utilizado para validação inicial do Product Master."
);

const fornecedorPiloto = db
  .prepare(`
    SELECT id
    FROM suppliers
    WHERE code = ?
  `)
  .get("FORN-001");

db.prepare(`
  UPDATE suppliers
  SET
    name = ?,
    city = ?,
    state = ?,
    country = ?,
    default_lead_time_days = ?,
    status = ?,
    notes = ?,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`).run(
  "Fornecedor Piloto NM",
  "São Paulo",
  "SP",
  "Brasil",
  5,
  "active",
  "Fornecedor fictício utilizado para validação inicial do Product Master.",
  fornecedorPiloto.id
);

// ======================================================
// 8. FORNECEDOR X VARIANTES
// ======================================================

db.prepare(`
  DELETE FROM supplier_variants
  WHERE supplier_id = ?
    AND variant_id IN (
      SELECT id
      FROM product_variants
      WHERE product_id = ?
    )
`).run(
  fornecedorPiloto.id,
  produtoBlazerPremium.id
);

const inserirFornecedorVariante = db.prepare(`
  INSERT INTO supplier_variants (
    supplier_id,
    variant_id,
    supplier_sku,
    supplier_cost,
    available_quantity,
    availability_status,
    lead_time_days,
    is_preferred,
    status,
    last_checked_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

for (const variante of variantesBlazerPremium) {
  inserirFornecedorVariante.run(
    fornecedorPiloto.id,
    variante.id,
    `FORN-001-${variante.sku}`,
    149.90,
    10,
    "available",
    5,
    1,
    "active"
  );
}

// ======================================================
// 9. MÍDIAS DO PRODUTO
// ======================================================

db.prepare(`
  DELETE FROM product_media
  WHERE product_id = ?
    AND url = ?
`).run(
  produtoBlazerPremium.id,
  "/images/products/blazer-premium-nm/principal.jpg"
);

const inserirMidiaProduto = db.prepare(`
  INSERT INTO product_media (
    product_id,
    variant_id,
    media_type,
    url,
    alt_text,
    title,
    is_primary,
    sort_order,
    status
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

inserirMidiaProduto.run(
  produtoBlazerPremium.id,
  null,
  "image",
  "/images/products/blazer-premium-nm/principal.jpg",
  "Blazer Premium NM feminino da Neumam Modas",
  "Blazer Premium NM - Imagem principal",
  1,
  1,
  "active"
);

// ======================================================
// 10. DADOS DE FRETE DAS VARIANTES
// ======================================================

db.prepare(`
  DELETE FROM variant_shipping
  WHERE variant_id IN (
    SELECT id
    FROM product_variants
    WHERE product_id = ?
  )
`).run(produtoBlazerPremium.id);

const inserirFreteVariante = db.prepare(`
  INSERT INTO variant_shipping (
    variant_id,
    weight,
    package_weight,
    height,
    width,
    length,
    weight_unit,
    dimension_unit,
    status
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const variante of variantesBlazerPremium) {
  inserirFreteVariante.run(
    variante.id,
    0.75,
    0.90,
    8,
    30,
    40,
    "kg",
    "cm",
    "active"
  );
}

// ======================================================
// 11. SEO DO PRODUTO
// ======================================================

// O produto possui apenas um registro SEO.
// O registro é recriado para manter o seed idempotente.

db.prepare(`
  DELETE FROM product_seo
  WHERE product_id = ?
`).run(produtoBlazerPremium.id);

const inserirSeoProduto = db.prepare(`
  INSERT INTO product_seo (
    product_id,
    seo_title,
    meta_description,
    meta_keywords,
    canonical_url,
    robots_index,
    robots_follow,
    og_title,
    og_description,
    og_image_url,
    schema_type,
    status
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

inserirSeoProduto.run(
  produtoBlazerPremium.id,
  "Blazer Premium Feminino NM | Neumam Modas",
  "Blazer Premium NM feminino com caimento slim, estilo elegante e proposta moderna. Disponível nas cores preto e bege.",
  "blazer feminino, blazer premium, blazer elegante, blazer preto, blazer bege, Neumam Modas",
  "/produtos/blazer-premium-nm",
  1,
  1,
  "Blazer Premium Feminino NM | Neumam Modas",
  "Conheça o Blazer Premium NM feminino da Neumam Modas, com estilo elegante, caimento slim e opções nas cores preto e bege.",
  "/images/products/blazer-premium-nm/principal.jpg",
  "Product",
  "active"
);

// ======================================================
// 12. ATRIBUTOS
// ======================================================

const inserirAtributo = db.prepare(`
  INSERT OR IGNORE INTO attributes (
    name,
    code,
    type,
    is_filterable,
    is_required
  )
  VALUES (?, ?, ?, ?, ?)
`);

inserirAtributo.run(
  "Material",
  "material",
  "text",
  1,
  0
);

inserirAtributo.run(
  "Estilo",
  "estilo",
  "select",
  1,
  0
);

inserirAtributo.run(
  "Ocasião",
  "ocasiao",
  "select",
  1,
  0
);

inserirAtributo.run(
  "Caimento",
  "caimento",
  "select",
  1,
  0
);

// ======================================================
// 13. VALORES DOS ATRIBUTOS
// ======================================================

const inserirValorAtributo = db.prepare(`
  INSERT OR IGNORE INTO attribute_values (
    attribute_id,
    value,
    code,
    sort_order
  )
  VALUES (?, ?, ?, ?)
`);

const atributoMaterial = db
  .prepare(`
    SELECT id
    FROM attributes
    WHERE code = ?
  `)
  .get("material");

const atributoEstilo = db
  .prepare(`
    SELECT id
    FROM attributes
    WHERE code = ?
  `)
  .get("estilo");

const atributoOcasiao = db
  .prepare(`
    SELECT id
    FROM attributes
    WHERE code = ?
  `)
  .get("ocasiao");

const atributoCaimento = db
  .prepare(`
    SELECT id
    FROM attributes
    WHERE code = ?
  `)
  .get("caimento");

const estilos = [
  ["Elegante", "elegante", 1],
  ["Moderno", "moderno", 2],
  ["Clássico", "classico", 3],
  ["Casual", "casual", 4],
];

for (const [valor, codigo, ordem] of estilos) {
  inserirValorAtributo.run(
    atributoEstilo.id,
    valor,
    codigo,
    ordem
  );
}

const ocasioes = [
  ["Trabalho", "trabalho", 1],
  ["Social", "social", 2],
  ["Casual", "casual", 3],
  ["Evento", "evento", 4],
];

for (const [valor, codigo, ordem] of ocasioes) {
  inserirValorAtributo.run(
    atributoOcasiao.id,
    valor,
    codigo,
    ordem
  );
}

const caimentos = [
  ["Slim", "slim", 1],
  ["Regular", "regular", 2],
  ["Oversized", "oversized", 3],
];

for (const [valor, codigo, ordem] of caimentos) {
  inserirValorAtributo.run(
    atributoCaimento.id,
    valor,
    codigo,
    ordem
  );
}

// ======================================================
// 14. VALORES SELECIONADOS PARA O PRODUTO
// ======================================================

const valorEstiloElegante = db
  .prepare(`
    SELECT id
    FROM attribute_values
    WHERE attribute_id = ?
      AND code = ?
  `)
  .get(
    atributoEstilo.id,
    "elegante"
  );

const valorOcasiaoTrabalho = db
  .prepare(`
    SELECT id
    FROM attribute_values
    WHERE attribute_id = ?
      AND code = ?
  `)
  .get(
    atributoOcasiao.id,
    "trabalho"
  );

const valorCaimentoSlim = db
  .prepare(`
    SELECT id
    FROM attribute_values
    WHERE attribute_id = ?
      AND code = ?
  `)
  .get(
    atributoCaimento.id,
    "slim"
  );

// ======================================================
// 15. ATRIBUTOS ASSOCIADOS AO PRODUTO
// ======================================================

db.prepare(`
  DELETE FROM product_attributes
  WHERE product_id = ?
    AND attribute_id IN (?, ?, ?, ?)
`).run(
  produtoBlazerPremium.id,
  atributoMaterial.id,
  atributoEstilo.id,
  atributoOcasiao.id,
  atributoCaimento.id
);

const inserirAtributoProduto = db.prepare(`
  INSERT INTO product_attributes (
    product_id,
    attribute_id,
    attribute_value_id,
    value_text
  )
  VALUES (?, ?, ?, ?)
`);

inserirAtributoProduto.run(
  produtoBlazerPremium.id,
  atributoMaterial.id,
  null,
  "72% Poliéster / 24% Viscose / 4% Elastano"
);

inserirAtributoProduto.run(
  produtoBlazerPremium.id,
  atributoEstilo.id,
  valorEstiloElegante.id,
  null
);

inserirAtributoProduto.run(
  produtoBlazerPremium.id,
  atributoOcasiao.id,
  valorOcasiaoTrabalho.id,
  null
);

inserirAtributoProduto.run(
  produtoBlazerPremium.id,
  atributoCaimento.id,
  valorCaimentoSlim.id,
  null
);

// ======================================================
// 16. PUBLICAÇÃO DO PRODUTO
// ======================================================

// Mantém uma única publicação do produto por canal.
// O registro é recriado para manter o seed idempotente.

db.prepare(`
  DELETE FROM product_publication
  WHERE product_id = ?
    AND channel = ?
`).run(
  produtoBlazerPremium.id,
  "online_store"
);

const inserirPublicacaoProduto = db.prepare(`
  INSERT INTO product_publication (
    product_id,
    channel,
    is_published,
    is_visible,
    is_featured,
    sort_order,
    published_at,
    unpublished_at,
    status
  )
  VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
`);

inserirPublicacaoProduto.run(
  produtoBlazerPremium.id,
  "online_store",
  1,
  1,
  1,
  1,
  null,
  "published"
);

// ======================================================
// 17. HISTÓRICO DO PRODUTO
// ======================================================

// Mantém o evento inicial controlado pelo seed sem duplicação.
// O histórico real da aplicação não deverá ser apagado;
// removemos somente este evento específico de demonstração.

db.prepare(`
  DELETE FROM product_history
  WHERE product_id = ?
    AND event_type = ?
    AND field_name = ?
    AND old_value = ?
    AND new_value = ?
    AND changed_by = ?
`).run(
  produtoBlazerPremium.id,
  "lifecycle_changed",
  "lifecycle_stage",
  "launch",
  "growth",
  "system"
);

const inserirHistoricoProduto = db.prepare(`
  INSERT INTO product_history (
    product_id,
    event_type,
    field_name,
    old_value,
    new_value,
    description,
    changed_by
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

inserirHistoricoProduto.run(
  produtoBlazerPremium.id,
  "lifecycle_changed",
  "lifecycle_stage",
  "launch",
  "growth",
  "Produto avançou do estágio de lançamento para crescimento.",
  "system"
);

// ======================================================
// 18. TAGS
// ======================================================

const inserirTag = db.prepare(`
  INSERT OR IGNORE INTO tags (
    name,
    slug,
    description,
    tag_type,
    status,
    sort_order
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

inserirTag.run(
  "Premium",
  "premium",
  "Produtos de posicionamento premium da Neumam Modas.",
  "highlight",
  "active",
  1
);

inserirTag.run(
  "Elegante",
  "elegante",
  "Produtos com proposta elegante.",
  "style",
  "active",
  2
);

inserirTag.run(
  "Destaque",
  "destaque",
  "Produtos em destaque no catálogo.",
  "highlight",
  "active",
  3
);

inserirTag.run(
  "Trabalho",
  "trabalho",
  "Produtos indicados para uso profissional e ambiente de trabalho.",
  "occasion",
  "active",
  4
);

// ======================================================
// 19. TAGS DO PRODUTO
// ======================================================

const tagsBlazerPremium = db.prepare(`
  SELECT
    id,
    slug
  FROM tags
  WHERE slug IN (
    'premium',
    'elegante',
    'destaque',
    'trabalho'
  )
  ORDER BY sort_order
`).all();

db.prepare(`
  DELETE FROM product_tags
  WHERE product_id = ?
    AND tag_id IN (
      SELECT id
      FROM tags
      WHERE slug IN (
        'premium',
        'elegante',
        'destaque',
        'trabalho'
      )
    )
`).run(produtoBlazerPremium.id);

const inserirTagProduto = db.prepare(`
  INSERT INTO product_tags (
    product_id,
    tag_id
  )
  VALUES (?, ?)
`);

for (const tag of tagsBlazerPremium) {
  inserirTagProduto.run(
    produtoBlazerPremium.id,
    tag.id
  );
}

// ======================================================
// 20. FINALIZAÇÃO
// ======================================================

console.log(
  "Categorias, coleção, produto, variantes, preços, dados comerciais, disponibilidades, fornecedor, vínculos fornecedor-variante, mídia, frete, SEO, atributos, valores, atributos do produto, publicação, histórico, tags e tags do produto cadastrados com sucesso!"
);