const db = require("./connection");

// ======================================================
// 1. CATEGORIAS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER,

    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive'
        )
      ),

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (parent_id)
      REFERENCES categories(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela categories criada com sucesso!");

// ======================================================
// 2. COLEÇÕES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,

    start_date DATE,
    end_date DATE,

    status TEXT NOT NULL DEFAULT 'planning'
      CHECK (
        status IN (
          'planning',
          'active',
          'closed',
          'archived'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("Tabela collections criada com sucesso!");

// ======================================================
// 3. PRODUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sku_base TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,

    brand TEXT NOT NULL DEFAULT 'Neumam Modas',

    category_id INTEGER,
    collection_id INTEGER,

    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (
        status IN (
          'draft',
          'active',
          'inactive',
          'blocked',
          'archived'
        )
      ),

    lifecycle_stage TEXT NOT NULL DEFAULT 'idea'
      CHECK (
        lifecycle_stage IN (
          'idea',
          'development',
          'planned',
          'launch',
          'growth',
          'core',
          'maturity',
          'decline',
          'exit'
        )
      ),

    short_description TEXT,
    description TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id)
      REFERENCES categories(id)
      ON DELETE SET NULL,

    FOREIGN KEY (collection_id)
      REFERENCES collections(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela products criada com sucesso!");

// ======================================================
// 4. VARIANTES DOS PRODUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id INTEGER NOT NULL,

    sku TEXT NOT NULL UNIQUE,
    ean TEXT UNIQUE,

    color_name TEXT,
    color_code TEXT,

    size_name TEXT,
    size_code TEXT,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive',
          'blocked',
          'archived'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela product_variants criada com sucesso!");

// ======================================================
// 5. PREÇOS DAS VARIANTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS variant_pricing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    variant_id INTEGER NOT NULL,

    cost_price_cents INTEGER
      CHECK (
        cost_price_cents IS NULL
        OR (
          typeof(cost_price_cents) = 'integer'
          AND cost_price_cents BETWEEN 0 AND 9007199254740991
        )
      ),

    sale_price_cents INTEGER NOT NULL
      CHECK (
        typeof(sale_price_cents) = 'integer'
        AND sale_price_cents BETWEEN 0 AND 9007199254740991
      ),

    promotional_price_cents INTEGER
      CHECK (
        promotional_price_cents IS NULL
        OR (
          typeof(promotional_price_cents) = 'integer'
          AND promotional_price_cents BETWEEN 0 AND 9007199254740991
        )
      ),

    currency TEXT NOT NULL DEFAULT 'BRL',

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'scheduled',
          'inactive',
          'archived'
        )
      ),

    valid_from DATETIME,
    valid_until DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE CASCADE,

    CHECK (
      promotional_price_cents IS NULL
      OR promotional_price_cents <= sale_price_cents
    ),

    CHECK (
      valid_until IS NULL
      OR valid_from IS NULL
      OR valid_until >= valid_from
    )
  );
`);

console.log("Tabela variant_pricing criada com sucesso!");

// ======================================================
// 6. INFORMAÇÕES COMERCIAIS DAS VARIANTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS variant_commercial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    variant_id INTEGER NOT NULL UNIQUE,

    minimum_price_cents INTEGER
      CHECK (
        minimum_price_cents IS NULL
        OR (
          typeof(minimum_price_cents) = 'integer'
          AND minimum_price_cents BETWEEN 0 AND 9007199254740991
        )
      ),

    target_margin_percent REAL,
    target_markup_percent REAL,

    commission_percent REAL NOT NULL DEFAULT 0,

    operational_cost_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(operational_cost_cents) = 'integer'
        AND operational_cost_cents BETWEEN 0 AND 9007199254740991
      ),

    tax_percent REAL NOT NULL DEFAULT 0,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive',
          'archived'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE CASCADE,

    CHECK (
      target_margin_percent IS NULL
      OR (
        target_margin_percent >= 0
        AND target_margin_percent <= 100
      )
    ),

    CHECK (
      target_markup_percent IS NULL
      OR target_markup_percent >= 0
    ),

    CHECK (
      commission_percent >= 0
      AND commission_percent <= 100
    ),

    CHECK (
      tax_percent >= 0
      AND tax_percent <= 100
    )
  );
`);

console.log("Tabela variant_commercial criada com sucesso!");

// ======================================================
// 7. FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    legal_name TEXT,

    document TEXT,

    contact_name TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    website TEXT,

    address_line TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT NOT NULL DEFAULT 'Brasil',

    default_lead_time_days INTEGER NOT NULL DEFAULT 5
      CHECK (
        default_lead_time_days >= 0
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive',
          'blocked',
          'archived'
        )
      ),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("Tabela suppliers criada com sucesso!");

// ======================================================
// 8. FORNECEDORES DAS VARIANTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    supplier_id INTEGER NOT NULL,
    variant_id INTEGER NOT NULL,

    supplier_sku TEXT,

       supplier_cost_cents INTEGER
      CHECK (
        supplier_cost_cents IS NULL
        OR (
          typeof(supplier_cost_cents) = 'integer'
          AND supplier_cost_cents BETWEEN 0 AND 9007199254740991
        )
      ),

    available_quantity INTEGER NOT NULL DEFAULT 0
      CHECK (
        available_quantity >= 0
      ),

    availability_status TEXT NOT NULL DEFAULT 'available'
      CHECK (
        availability_status IN (
          'available',
          'low_stock',
          'out_of_stock',
          'preorder',
          'unavailable'
        )
      ),

    lead_time_days INTEGER NOT NULL DEFAULT 5
      CHECK (
        lead_time_days >= 0
      ),

    is_preferred INTEGER NOT NULL DEFAULT 0
      CHECK (
        is_preferred IN (0, 1)
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive',
          'blocked',
          'archived'
        )
      ),

    last_checked_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
      REFERENCES suppliers(id)
      ON DELETE CASCADE,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE CASCADE,

    UNIQUE (
      supplier_id,
      variant_id
    )
  );
`);

console.log("Tabela supplier_variants criada com sucesso!");

// ======================================================
// 9. DISPONIBILIDADE CONSOLIDADA DAS VARIANTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS variant_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    variant_id INTEGER NOT NULL,

    source_type TEXT NOT NULL DEFAULT 'supplier'
      CHECK (
        source_type IN (
          'supplier',
          'own_stock',
          'dropship'
        )
      ),

    available_quantity INTEGER NOT NULL DEFAULT 0
      CHECK (
        available_quantity >= 0
      ),

    availability_status TEXT NOT NULL DEFAULT 'available'
      CHECK (
        availability_status IN (
          'available',
          'low_stock',
          'out_of_stock',
          'preorder',
          'unavailable'
        )
      ),

    lead_time_days INTEGER NOT NULL DEFAULT 5
      CHECK (
        lead_time_days >= 0
      ),

    last_checked_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE CASCADE,

    UNIQUE (variant_id)
  );
`);

console.log("Tabela variant_inventory criada com sucesso!");

// ======================================================
// 10. MÍDIAS DOS PRODUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS product_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id INTEGER NOT NULL,
    variant_id INTEGER,

    media_type TEXT NOT NULL DEFAULT 'image'
      CHECK (
        media_type IN (
          'image',
          'video'
        )
      ),

    url TEXT NOT NULL,

    alt_text TEXT,
    title TEXT,

    is_primary INTEGER NOT NULL DEFAULT 0
      CHECK (
        is_primary IN (0, 1)
      ),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        sort_order >= 0
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive',
          'archived'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela product_media criada com sucesso!");

// ======================================================
// 11. PESO E DIMENSÕES DAS VARIANTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS variant_shipping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    variant_id INTEGER NOT NULL,

    weight REAL
      CHECK (
        weight IS NULL
        OR weight >= 0
      ),

    package_weight REAL
      CHECK (
        package_weight IS NULL
        OR package_weight >= 0
      ),

    height REAL
      CHECK (
        height IS NULL
        OR height >= 0
      ),

    width REAL
      CHECK (
        width IS NULL
        OR width >= 0
      ),

    length REAL
      CHECK (
        length IS NULL
        OR length >= 0
      ),

    weight_unit TEXT NOT NULL DEFAULT 'kg'
      CHECK (
        weight_unit IN (
          'kg',
          'g'
        )
      ),

    dimension_unit TEXT NOT NULL DEFAULT 'cm'
      CHECK (
        dimension_unit IN (
          'cm',
          'm'
        )
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive',
          'archived'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE CASCADE,

    UNIQUE (variant_id)
  );
`);

console.log("Tabela variant_shipping criada com sucesso!");

// ======================================================
// 12. SEO DOS PRODUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS product_seo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id INTEGER NOT NULL,

    seo_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,

    canonical_url TEXT,

    robots_index INTEGER NOT NULL DEFAULT 1
      CHECK (
        robots_index IN (0, 1)
      ),

    robots_follow INTEGER NOT NULL DEFAULT 1
      CHECK (
        robots_follow IN (0, 1)
      ),

    og_title TEXT,
    og_description TEXT,
    og_image_url TEXT,

    schema_type TEXT NOT NULL DEFAULT 'Product',

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive',
          'archived'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE,

    UNIQUE (product_id)
  );
`);

console.log("Tabela product_seo criada com sucesso!");

// ======================================================
// 13. ATRIBUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,

    type TEXT NOT NULL
      CHECK (
        type IN (
          'text',
          'number',
          'boolean',
          'select',
          'multiselect',
          'date'
        )
      ),

    is_filterable INTEGER NOT NULL DEFAULT 0
      CHECK (
        is_filterable IN (0, 1)
      ),

    is_required INTEGER NOT NULL DEFAULT 0
      CHECK (
        is_required IN (0, 1)
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("Tabela attributes criada com sucesso!");

// ======================================================
// 14. VALORES DOS ATRIBUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS attribute_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    attribute_id INTEGER NOT NULL,

    value TEXT NOT NULL,
    code TEXT,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (attribute_id)
      REFERENCES attributes(id)
      ON DELETE CASCADE,

    UNIQUE (
      attribute_id,
      value
    )
  );
`);

console.log("Tabela attribute_values criada com sucesso!");

// ======================================================
// 15. ATRIBUTOS DOS PRODUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS product_attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id INTEGER NOT NULL,
    attribute_id INTEGER NOT NULL,
    attribute_value_id INTEGER,

    value_text TEXT,
    value_number REAL,

    value_boolean INTEGER
      CHECK (
        value_boolean IS NULL
        OR value_boolean IN (0, 1)
      ),

    value_date DATE,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE,

    FOREIGN KEY (attribute_id)
      REFERENCES attributes(id)
      ON DELETE CASCADE,

    FOREIGN KEY (attribute_value_id)
      REFERENCES attribute_values(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela product_attributes criada com sucesso!");

// ======================================================
// 16. PUBLICAÇÃO DOS PRODUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS product_publication (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id INTEGER NOT NULL,

    channel TEXT NOT NULL DEFAULT 'online_store'
      CHECK (
        channel IN (
          'online_store',
          'marketplace',
          'social_commerce',
          'physical_store'
        )
      ),

    is_published INTEGER NOT NULL DEFAULT 0
      CHECK (
        is_published IN (0, 1)
      ),

    is_visible INTEGER NOT NULL DEFAULT 1
      CHECK (
        is_visible IN (0, 1)
      ),

    is_featured INTEGER NOT NULL DEFAULT 0
      CHECK (
        is_featured IN (0, 1)
      ),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        sort_order >= 0
      ),

    published_at DATETIME,
    unpublished_at DATETIME,

    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (
        status IN (
          'draft',
          'scheduled',
          'published',
          'unpublished',
          'archived'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE,

    UNIQUE (
      product_id,
      channel
    ),

    CHECK (
      unpublished_at IS NULL
      OR published_at IS NULL
      OR unpublished_at >= published_at
    )
  );
`);

console.log("Tabela product_publication criada com sucesso!");

// ======================================================
// 17. HISTÓRICO DOS PRODUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS product_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id INTEGER NOT NULL,

    event_type TEXT NOT NULL
      CHECK (
        event_type IN (
          'created',
          'updated',
          'status_changed',
          'lifecycle_changed',
          'published',
          'unpublished',
          'archived',
          'reactivated',
          'other'
        )
      ),

    field_name TEXT,

    old_value TEXT,
    new_value TEXT,

    description TEXT,

    changed_by TEXT NOT NULL DEFAULT 'system',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE,

    CHECK (
      old_value IS NULL
      OR new_value IS NULL
      OR old_value <> new_value
    )
  );
`);

console.log("Tabela product_history criada com sucesso!");

// ======================================================
// 18. TAGS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,

    description TEXT,

    tag_type TEXT NOT NULL DEFAULT 'general'
      CHECK (
        tag_type IN (
          'general',
          'style',
          'campaign',
          'collection',
          'highlight',
          'audience',
          'occasion'
        )
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive',
          'archived'
        )
      ),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        sort_order >= 0
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("Tabela tags criada com sucesso!");

// ======================================================
// 19. TAGS DOS PRODUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS product_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE,

    FOREIGN KEY (tag_id)
      REFERENCES tags(id)
      ON DELETE CASCADE,

    UNIQUE (
      product_id,
      tag_id
    )
  );
`);

console.log("Tabela product_tags criada com sucesso!");

// ======================================================
// 20. RELACIONAMENTOS ENTRE PRODUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS product_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id INTEGER NOT NULL,
    related_product_id INTEGER NOT NULL,

    relation_type TEXT NOT NULL
      CHECK (
        relation_type IN (
          'similar',
          'complete_look',
          'cross_sell',
          'upsell',
          'accessory',
          'alternative'
        )
      ),

    description TEXT,

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        sort_order >= 0
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive',
          'archived'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE,

    FOREIGN KEY (related_product_id)
      REFERENCES products(id)
      ON DELETE CASCADE,

    UNIQUE (
      product_id,
      related_product_id,
      relation_type
    ),

    CHECK (
      product_id <> related_product_id
    )
  );
`);

console.log("Tabela product_relations criada com sucesso!");

// ======================================================
// 21. CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    first_name TEXT NOT NULL,
    last_name TEXT,

    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    whatsapp TEXT,

    document TEXT UNIQUE,

    birth_date DATE,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive',
          'blocked',
          'archived'
        )
      ),

    accepts_marketing INTEGER NOT NULL DEFAULT 0
      CHECK (
        accepts_marketing IN (0, 1)
      ),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("Tabela customers criada com sucesso!");

// ======================================================
// 22. ENDEREÇOS DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    label TEXT,

    address_type TEXT NOT NULL DEFAULT 'shipping'
      CHECK (
        address_type IN (
          'shipping',
          'billing',
          'residential',
          'other'
        )
      ),

    recipient_name TEXT,

    postal_code TEXT NOT NULL,
    street TEXT NOT NULL,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'Brasil',

    is_default INTEGER NOT NULL DEFAULT 0
      CHECK (
        is_default IN (0, 1)
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive',
          'archived'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela customer_addresses criada com sucesso!");

// ======================================================
// 23. PEDIDOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_number TEXT NOT NULL UNIQUE,

    customer_id INTEGER,

    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN (
          'pending',
          'confirmed',
          'processing',
          'ready',
          'shipped',
          'delivered',
          'cancelled',
          'refunded'
        )
      ),

    payment_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        payment_status IN (
          'pending',
          'authorized',
          'paid',
          'partially_refunded',
          'refunded',
          'failed',
          'cancelled'
        )
      ),

    fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled'
      CHECK (
        fulfillment_status IN (
          'unfulfilled',
          'processing',
          'partially_fulfilled',
          'fulfilled',
          'cancelled'
        )
      ),

    shipping_status TEXT NOT NULL DEFAULT 'not_requested'
      CHECK (
        shipping_status IN (
          'not_requested',
          'awaiting_quote',
          'quoted'
        )
      ),

    subtotal_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(subtotal_cents) = 'integer'
        AND subtotal_cents BETWEEN 0 AND 9007199254740991
      ),

    discount_total_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(discount_total_cents) = 'integer'
        AND discount_total_cents BETWEEN 0 AND 9007199254740991
      ),

    shipping_total_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(shipping_total_cents) = 'integer'
        AND shipping_total_cents BETWEEN 0 AND 9007199254740991
      ),

    tax_total_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(tax_total_cents) = 'integer'
        AND tax_total_cents BETWEEN 0 AND 9007199254740991
      ),

    total_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(total_cents) = 'integer'
        AND total_cents BETWEEN 0 AND 9007199254740991
      ),

    currency TEXT NOT NULL DEFAULT 'BRL',

    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,

    shipping_postal_code TEXT,
    shipping_street TEXT,
    shipping_number TEXT,
    shipping_complement TEXT,
    shipping_neighborhood TEXT,
    shipping_city TEXT,
    shipping_state TEXT,
    shipping_country TEXT NOT NULL DEFAULT 'Brasil',

    notes TEXT,

    placed_at DATETIME,
    confirmed_at DATETIME,
    cancelled_at DATETIME,
    completed_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE SET NULL,

    CHECK (
      discount_total_cents <= subtotal_cents
    ),

    CHECK (
      total_cents =
        subtotal_cents
        - discount_total_cents
        + shipping_total_cents
        + tax_total_cents
    )
  );
`);

console.log("Tabela orders criada com sucesso!");

// ======================================================
// 24. ITENS DOS PEDIDOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_id INTEGER NOT NULL,

    product_id INTEGER,
    variant_id INTEGER,

    product_name TEXT NOT NULL,
    product_sku TEXT,
    variant_sku TEXT,

    color_name TEXT,
    size_name TEXT,

       quantity INTEGER NOT NULL DEFAULT 1
      CHECK (
        typeof(quantity) = 'integer'
        AND quantity BETWEEN 1 AND 9007199254740991
      ),

    unit_price_cents INTEGER NOT NULL
      CHECK (
        typeof(unit_price_cents) = 'integer'
        AND unit_price_cents BETWEEN 0 AND 9007199254740991
      ),

    discount_total_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(discount_total_cents) = 'integer'
        AND discount_total_cents BETWEEN 0 AND 9007199254740991
      ),

    tax_total_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(tax_total_cents) = 'integer'
        AND tax_total_cents BETWEEN 0 AND 9007199254740991
      ),

    line_total_cents INTEGER NOT NULL
      CHECK (
        typeof(line_total_cents) = 'integer'
        AND line_total_cents BETWEEN 0 AND 9007199254740991
      ),

    currency TEXT NOT NULL DEFAULT 'BRL',

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'cancelled',
          'refunded'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE CASCADE,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE SET NULL,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE SET NULL,
    CHECK (
      unit_price_cents <= 9007199254740991 / quantity
    ),

    CHECK (
      discount_total_cents <= (unit_price_cents * quantity)
    ),

    CHECK (
      tax_total_cents <=
        9007199254740991
        - (unit_price_cents * quantity - discount_total_cents)
    ),

    CHECK (
      line_total_cents =
        unit_price_cents * quantity
        - discount_total_cents
        + tax_total_cents
    )

      );
`);

console.log("Tabela order_items criada com sucesso!");

// ======================================================
// 25. PAGAMENTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_id INTEGER NOT NULL,

    payment_method TEXT NOT NULL
      CHECK (
        payment_method IN (
          'pix',
          'credit_card',
          'debit_card',
          'boleto',
          'wallet',
          'bank_transfer',
          'cash',
          'other'
        )
      ),

    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN (
          'pending',
          'authorized',
          'paid',
          'failed',
          'cancelled',
          'partially_refunded',
          'refunded'
        )
      ),

       amount_cents INTEGER NOT NULL
      CHECK (
        typeof(amount_cents) = 'integer'
        AND amount_cents BETWEEN 0 AND 9007199254740991
      ),

    currency TEXT NOT NULL DEFAULT 'BRL',

        installments INTEGER NOT NULL DEFAULT 1
      CHECK (
        typeof(installments) = 'integer'
        AND installments BETWEEN 1 AND 9007199254740991
      ),

    provider TEXT,

    external_transaction_id TEXT,

    authorization_code TEXT,

    pix_transaction_id TEXT,
    pix_copy_paste TEXT,

    boleto_barcode TEXT,
    boleto_due_date DATE,

    card_brand TEXT,
    card_last_four TEXT,

    authorized_at DATETIME,
    paid_at DATETIME,
    failed_at DATETIME,
    cancelled_at DATETIME,
    refunded_at DATETIME,

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela payments criada com sucesso!");

// ======================================================
// 26. ENTREGAS DOS PEDIDOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_id INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN (
          'pending',
          'processing',
          'ready_to_ship',
          'shipped',
          'in_transit',
          'out_for_delivery',
          'delivered',
          'failed',
          'returned',
          'cancelled'
        )
      ),

    shipping_method TEXT,

    carrier TEXT,

    service_name TEXT,

    tracking_code TEXT,

    tracking_url TEXT,

        shipping_cost_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(shipping_cost_cents) = 'integer'
        AND shipping_cost_cents BETWEEN 0 AND 9007199254740991
      ),

    recipient_name TEXT,

    postal_code TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    country TEXT NOT NULL DEFAULT 'Brasil',

    estimated_delivery_date DATE,

    shipped_at DATETIME,
    delivered_at DATETIME,
    failed_at DATETIME,
    returned_at DATETIME,
    cancelled_at DATETIME,

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela shipments criada com sucesso!");

// ======================================================
// 27. CUPONS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    code TEXT NOT NULL UNIQUE,

    name TEXT,
    description TEXT,

    discount_type TEXT NOT NULL
      CHECK (
        discount_type IN (
          'percentage',
          'fixed_amount',
          'free_shipping'
        )
      ),

    discount_percent REAL
      CHECK (
        discount_percent IS NULL
        OR (
          typeof(discount_percent) IN ('integer', 'real')
          AND discount_percent BETWEEN 0 AND 100
        )
      ),

    discount_amount_cents INTEGER
      CHECK (
        discount_amount_cents IS NULL
        OR (
          typeof(discount_amount_cents) = 'integer'
          AND discount_amount_cents BETWEEN 0 AND 9007199254740991
        )
      ),

    minimum_order_value_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(minimum_order_value_cents) = 'integer'
        AND minimum_order_value_cents BETWEEN 0 AND 9007199254740991
      ),

    maximum_discount_value_cents INTEGER
      CHECK (
        maximum_discount_value_cents IS NULL
        OR (
          typeof(maximum_discount_value_cents) = 'integer'
          AND maximum_discount_value_cents BETWEEN 0 AND 9007199254740991
        )
      ),

    usage_limit INTEGER
      CHECK (
        usage_limit IS NULL
        OR (
          typeof(usage_limit) = 'integer'
          AND usage_limit BETWEEN 1 AND 9007199254740991
        )
      ),

    usage_limit_per_customer INTEGER
      CHECK (
        usage_limit_per_customer IS NULL
        OR (
          typeof(usage_limit_per_customer) = 'integer'
          AND usage_limit_per_customer BETWEEN 1 AND 9007199254740991
        )
      ),

    usage_count INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(usage_count) = 'integer'
        AND usage_count BETWEEN 0 AND 9007199254740991
      ),

    starts_at DATETIME,
    expires_at DATETIME,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive',
          'expired'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      (
        discount_type = 'percentage'
        AND discount_percent IS NOT NULL
        AND discount_amount_cents IS NULL
      )
      OR (
        discount_type = 'fixed_amount'
        AND discount_amount_cents IS NOT NULL
        AND discount_percent IS NULL
      )
      OR (
        discount_type = 'free_shipping'
        AND discount_percent IS NULL
        AND discount_amount_cents IS NULL
      )
    ),

    CHECK (
      expires_at IS NULL
      OR starts_at IS NULL
      OR expires_at >= starts_at
    )
  );
`);

console.log("Tabela coupons criada com sucesso!");

// ======================================================
// 28. USO DE CUPONS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS coupon_usages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    coupon_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    customer_id INTEGER,

    coupon_code TEXT NOT NULL,

    discount_type TEXT NOT NULL
      CHECK (
        discount_type IN (
          'percentage',
          'fixed_amount',
          'free_shipping'
        )
      ),

    discount_percent REAL
      CHECK (
        discount_percent IS NULL
        OR (
          typeof(discount_percent) IN ('integer', 'real')
          AND discount_percent BETWEEN 0 AND 100
        )
      ),

    discount_value_cents INTEGER
      CHECK (
        discount_value_cents IS NULL
        OR (
          typeof(discount_value_cents) = 'integer'
          AND discount_value_cents BETWEEN 0 AND 9007199254740991
        )
      ),

    discount_amount_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(discount_amount_cents) = 'integer'
        AND discount_amount_cents BETWEEN 0 AND 9007199254740991
      ),

    order_subtotal_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(order_subtotal_cents) = 'integer'
        AND order_subtotal_cents BETWEEN 0 AND 9007199254740991
      ),

    used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    status TEXT NOT NULL DEFAULT 'applied'
      CHECK (
        status IN (
          'applied',
          'cancelled',
          'refunded'
        )
      ),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (coupon_id)
      REFERENCES coupons(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE CASCADE,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE SET NULL,

    UNIQUE (
      coupon_id,
      order_id
    ),

    CHECK (
      (
        discount_type = 'percentage'
        AND discount_percent IS NOT NULL
        AND discount_value_cents IS NULL
      )
      OR (
        discount_type = 'fixed_amount'
        AND discount_value_cents IS NOT NULL
        AND discount_percent IS NULL
      )
      OR (
        discount_type = 'free_shipping'
        AND discount_percent IS NULL
        AND discount_value_cents IS NULL
      )
    ),

    CHECK (
      discount_type = 'free_shipping'
      OR discount_amount_cents <= order_subtotal_cents
    )
  );
`);

console.log("Tabela coupon_usages criada com sucesso!");

// ======================================================
// 29. CARRINHOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER,

    session_token TEXT UNIQUE,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'converted',
          'abandoned',
          'expired'
        )
      ),

    currency TEXT NOT NULL DEFAULT 'BRL',

        subtotal_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(subtotal_cents) = 'integer'
        AND subtotal_cents BETWEEN 0 AND 9007199254740991
      ),

    discount_total_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(discount_total_cents) = 'integer'
        AND discount_total_cents BETWEEN 0 AND 9007199254740991
      ),

    shipping_total_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(shipping_total_cents) = 'integer'
        AND shipping_total_cents BETWEEN 0 AND 9007199254740991
      ),

    total_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(total_cents) = 'integer'
        AND total_cents BETWEEN 0 AND 9007199254740991
      ),

    coupon_code TEXT,

    expires_at DATETIME,

    converted_order_id INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE SET NULL,

    FOREIGN KEY (converted_order_id)
      REFERENCES orders(id)
      ON DELETE SET NULL,

       CHECK (
      discount_total_cents <= subtotal_cents
    ),

    CHECK (
      shipping_total_cents <=
        9007199254740991 - (subtotal_cents - discount_total_cents)
    ),

    CHECK (
      total_cents =
        subtotal_cents - discount_total_cents + shipping_total_cents
    ),
    CHECK (
      customer_id IS NOT NULL
      OR session_token IS NOT NULL
    )
  );
`);

console.log("Tabela carts criada com sucesso!");

// ======================================================
// 30. ITENS DO CARRINHO
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    cart_id INTEGER NOT NULL,

    product_id INTEGER NOT NULL,

    variant_id INTEGER NOT NULL,

    product_name TEXT NOT NULL,

    product_sku TEXT,

    variant_sku TEXT NOT NULL,

    color_name TEXT,

    size_name TEXT,

        quantity INTEGER NOT NULL DEFAULT 1
      CHECK (
        typeof(quantity) = 'integer'
        AND quantity BETWEEN 1 AND 9007199254740991
      ),

    unit_price_cents INTEGER NOT NULL
      CHECK (
        typeof(unit_price_cents) = 'integer'
        AND unit_price_cents BETWEEN 0 AND 9007199254740991
      ),

    discount_total_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(discount_total_cents) = 'integer'
        AND discount_total_cents BETWEEN 0 AND 9007199254740991
      ),

    line_total_cents INTEGER NOT NULL
      CHECK (
        typeof(line_total_cents) = 'integer'
        AND line_total_cents BETWEEN 0 AND 9007199254740991
      ),

    currency TEXT NOT NULL DEFAULT 'BRL',

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'removed',
          'unavailable'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cart_id)
      REFERENCES carts(id)
      ON DELETE CASCADE,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE CASCADE,

    UNIQUE (
      cart_id,
      variant_id
    ),

        CHECK (
      unit_price_cents <= 9007199254740991 / quantity
    ),

    CHECK (
      discount_total_cents <= (unit_price_cents * quantity)
    ),

    CHECK (
      line_total_cents =
        unit_price_cents * quantity - discount_total_cents
    )
  );
`);

console.log("Tabela cart_items criada com sucesso!");

// ======================================================
// 31. LISTA DE DESEJOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS wishlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    name TEXT NOT NULL DEFAULT 'Minha lista',

    description TEXT,

    is_default INTEGER NOT NULL DEFAULT 1
      CHECK (
        is_default IN (0, 1)
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'archived'
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela wishlists criada com sucesso!");

// ======================================================
// 32. ITENS DA LISTA DE DESEJOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS wishlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    wishlist_id INTEGER NOT NULL,

    product_id INTEGER NOT NULL,

    variant_id INTEGER,

    product_name TEXT NOT NULL,

    product_sku TEXT,

    variant_sku TEXT,

    color_name TEXT,

    size_name TEXT,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'removed',
          'unavailable'
        )
      ),

    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (wishlist_id)
      REFERENCES wishlists(id)
      ON DELETE CASCADE,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE SET NULL,

    UNIQUE (
      wishlist_id,
      product_id,
      variant_id
    )
  );
`);

console.log("Tabela wishlist_items criada com sucesso!");

// ======================================================
// 33. AVALIAÇÕES DE PRODUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS product_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    customer_id INTEGER,
    order_id INTEGER,

    rating INTEGER NOT NULL
      CHECK (
        rating BETWEEN 1 AND 5
      ),

    title TEXT,
    comment TEXT,

    customer_name TEXT,

    is_verified_purchase INTEGER NOT NULL DEFAULT 0
      CHECK (
        is_verified_purchase IN (0, 1)
      ),

    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN (
          'pending',
          'approved',
          'rejected',
          'hidden'
        )
      ),

    admin_reply TEXT,
    admin_replied_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE SET NULL,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE SET NULL,

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela product_reviews criada com sucesso!");

// ======================================================
// 34. PERGUNTAS SOBRE PRODUTOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS product_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    customer_id INTEGER,

    question TEXT NOT NULL,

    customer_name TEXT,
    customer_email TEXT,

    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN (
          'pending',
          'answered',
          'rejected',
          'hidden'
        )
      ),

    answer TEXT,
    answered_by TEXT,
    answered_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE SET NULL,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela product_questions criada com sucesso!");

// ======================================================
// 35. NOTIFICAÇÕES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER,

    type TEXT NOT NULL
      CHECK (
        type IN (
          'order',
          'payment',
          'shipment',
          'promotion',
          'product',
          'stock',
          'system'
        )
      ),

    title TEXT NOT NULL,
    message TEXT NOT NULL,

    reference_type TEXT,
    reference_id INTEGER,

    channel TEXT NOT NULL DEFAULT 'system'
      CHECK (
        channel IN (
          'system',
          'email',
          'sms',
          'whatsapp',
          'push'
        )
      ),

    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN (
          'pending',
          'sent',
          'read',
          'failed',
          'cancelled'
        )
      ),

    is_read INTEGER NOT NULL DEFAULT 0
      CHECK (
        is_read IN (0, 1)
      ),

    scheduled_at DATETIME,
    sent_at DATETIME,
    read_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela notifications criada com sucesso!");

// ======================================================
// 36. DEVOLUÇÕES E TROCAS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_id INTEGER NOT NULL,
    order_item_id INTEGER,
    customer_id INTEGER,

    type TEXT NOT NULL
      CHECK (
        type IN (
          'return',
          'exchange'
        )
      ),

    reason TEXT NOT NULL,

    reason_details TEXT,

       quantity INTEGER NOT NULL DEFAULT 1
      CHECK (
        typeof(quantity) = 'integer'
        AND quantity BETWEEN 1 AND 9007199254740991
      ),

    status TEXT NOT NULL DEFAULT 'requested'
      CHECK (
        status IN (
          'requested',
          'approved',
          'rejected',
          'awaiting_item',
          'item_received',
          'processing',
          'completed',
          'cancelled'
        )
      ),

    resolution TEXT
      CHECK (
        resolution IS NULL
        OR resolution IN (
          'refund',
          'exchange',
          'store_credit',
          'none'
        )
      ),

        refund_amount_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(refund_amount_cents) = 'integer'
        AND refund_amount_cents BETWEEN 0 AND 9007199254740991
      ),

    tracking_code TEXT,

    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    received_at DATETIME,
    completed_at DATETIME,
    cancelled_at DATETIME,

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE CASCADE,

    FOREIGN KEY (order_item_id)
      REFERENCES order_items(id)
      ON DELETE SET NULL,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela returns criada com sucesso!");

// ======================================================
// 37. HISTÓRICO DE DEVOLUÇÕES E TROCAS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS return_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    return_id INTEGER NOT NULL,

    old_status TEXT
      CHECK (
        old_status IS NULL
        OR old_status IN (
          'requested',
          'approved',
          'rejected',
          'awaiting_item',
          'item_received',
          'processing',
          'completed',
          'cancelled'
        )
      ),

    new_status TEXT NOT NULL
      CHECK (
        new_status IN (
          'requested',
          'approved',
          'rejected',
          'awaiting_item',
          'item_received',
          'processing',
          'completed',
          'cancelled'
        )
      ),

    changed_by TEXT,

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (return_id)
      REFERENCES returns(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela return_history criada com sucesso!");

// ======================================================
// 38. MOVIMENTAÇÕES DE ESTOQUE
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    variant_id INTEGER NOT NULL,

    movement_type TEXT NOT NULL
      CHECK (
        movement_type IN (
          'in',
          'out',
          'reserve',
          'release',
          'return',
          'adjustment'
        )
      ),

    quantity INTEGER NOT NULL
      CHECK (
        quantity > 0
      ),

    quantity_before INTEGER
      CHECK (
        quantity_before IS NULL
        OR quantity_before >= 0
      ),

    quantity_after INTEGER
      CHECK (
        quantity_after IS NULL
        OR quantity_after >= 0
      ),

    reference_type TEXT,

    reference_id INTEGER,

    reason TEXT,

    changed_by TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela inventory_movements criada com sucesso!");

// ======================================================
// 39. HISTÓRICO DOS PEDIDOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS order_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_id INTEGER NOT NULL,

    status_type TEXT NOT NULL
      CHECK (
        status_type IN (
          'status',
          'payment_status',
          'fulfillment_status'
        )
      ),

    old_value TEXT,

    new_value TEXT NOT NULL,

    description TEXT,

    changed_by TEXT NOT NULL DEFAULT 'system',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE CASCADE,

    CHECK (
      old_value IS NULL
      OR old_value <> new_value
    ),

    CHECK (
      (
        status_type = 'status'
        AND new_value IN (
          'pending',
          'confirmed',
          'processing',
          'ready',
          'shipped',
          'delivered',
          'cancelled',
          'refunded'
        )
      )
      OR
      (
        status_type = 'payment_status'
        AND new_value IN (
          'pending',
          'authorized',
          'paid',
          'partially_refunded',
          'refunded',
          'failed',
          'cancelled'
        )
      )
      OR
      (
        status_type = 'fulfillment_status'
        AND new_value IN (
          'unfulfilled',
          'processing',
          'partially_fulfilled',
          'fulfilled',
          'cancelled'
        )
      )
    )
  );
`);

console.log("Tabela order_history criada com sucesso!");

// ======================================================
// 40. EVENTOS DAS ENTREGAS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS shipment_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    shipment_id INTEGER NOT NULL,

    status TEXT NOT NULL
      CHECK (
        status IN (
          'pending',
          'processing',
          'ready_to_ship',
          'shipped',
          'in_transit',
          'out_for_delivery',
          'delivered',
          'failed',
          'returned',
          'cancelled'
        )
      ),

    description TEXT,

    location TEXT,

    carrier_event_code TEXT,

    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (shipment_id)
      REFERENCES shipments(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela shipment_events criada com sucesso!");

// ======================================================
// 41. AUTENTICAÇÃO DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    failed_login_attempts INTEGER NOT NULL DEFAULT 0
      CHECK (
        failed_login_attempts >= 0
      ),

    locked_until DATETIME,

    last_login_at DATETIME,

    password_changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela customer_auth criada com sucesso!");

// ======================================================
// 42. RECUPERAÇÃO DE SENHA DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at DATETIME NOT NULL,

    used_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela customer_password_resets criada com sucesso!");

// ======================================================
// 43. VERIFICAÇÃO DE E-MAIL DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at DATETIME NOT NULL,

    verified_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela customer_email_verifications criada com sucesso!");

// ======================================================
// 44. SESSÕES DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    token_hash TEXT NOT NULL UNIQUE,

    ip_address TEXT,

    user_agent TEXT,

    expires_at DATETIME NOT NULL,

    revoked_at DATETIME,

    last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela customer_sessions criada com sucesso!");

// ======================================================
// 45. HISTÓRICO DE OBSERVAÇÕES DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    note TEXT NOT NULL
      CHECK (length(trim(note)) > 0),

    created_by TEXT NOT NULL
      CHECK (length(trim(created_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_created
    ON customer_notes(customer_id, created_at);
`);

console.log("Tabela customer_notes verificada com sucesso!");

// ======================================================
// 46. HISTÓRICO DE ATENDIMENTOS DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    order_id INTEGER,

    channel TEXT NOT NULL
      CHECK (
        channel IN (
          'whatsapp',
          'email',
          'phone',
          'chat',
          'in_person',
          'other'
        )
      ),

    direction TEXT NOT NULL
      CHECK (direction IN ('inbound', 'outbound')),

    subject TEXT NOT NULL
      CHECK (length(trim(subject)) > 0),

    description TEXT NOT NULL
      CHECK (length(trim(description)) > 0),

    handled_by TEXT NOT NULL
      CHECK (length(trim(handled_by)) > 0),

    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE,

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_date
    ON customer_interactions(customer_id, occurred_at);

  CREATE INDEX IF NOT EXISTS idx_customer_interactions_order
    ON customer_interactions(order_id);
`);

console.log("Tabela customer_interactions verificada com sucesso!");

// ======================================================
// 47. TAREFAS DE ACOMPANHAMENTO DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    title TEXT NOT NULL
      CHECK (length(trim(title)) > 0),

    description TEXT,

    assigned_to TEXT NOT NULL
      CHECK (length(trim(assigned_to)) > 0),

    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN (
          'pending',
          'in_progress',
          'completed',
          'cancelled'
        )
      ),

    priority TEXT NOT NULL DEFAULT 'normal'
      CHECK (priority IN ('low', 'normal', 'high')),

    due_at DATETIME,

    completed_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE,

    CHECK (
      (status = 'completed' AND completed_at IS NOT NULL)
      OR
      (status <> 'completed' AND completed_at IS NULL)
    )
  );

  CREATE INDEX IF NOT EXISTS idx_customer_tasks_customer
    ON customer_tasks(customer_id);

  CREATE INDEX IF NOT EXISTS idx_customer_tasks_status_due
    ON customer_tasks(status, due_at);
`);

console.log("Tabela customer_tasks verificada com sucesso!");

// ======================================================
// 48. GRUPOS DE CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL UNIQUE
      CHECK (length(trim(name)) > 0),

    code TEXT NOT NULL UNIQUE
      CHECK (length(trim(code)) > 0),

    description TEXT,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("Tabela customer_segments verificada com sucesso!");

// ======================================================
// 49. CLIENTES VINCULADOS AOS GRUPOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_segment_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    segment_id INTEGER NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE,

    FOREIGN KEY (segment_id)
      REFERENCES customer_segments(id)
      ON DELETE CASCADE,

    UNIQUE (customer_id, segment_id)
  );

  CREATE INDEX IF NOT EXISTS idx_customer_segment_members_segment
    ON customer_segment_members(segment_id);
`);

console.log("Tabela customer_segment_members verificada com sucesso!");

// ======================================================
// 50. HISTÓRICO DE ALTERAÇÕES DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    event_type TEXT NOT NULL
      CHECK (
        event_type IN (
          'created',
          'updated',
          'status_changed'
        )
      ),

    field_name TEXT,

    old_value TEXT,

    new_value TEXT,

    description TEXT NOT NULL
      CHECK (length(trim(description)) > 0),

    changed_by TEXT NOT NULL
      CHECK (length(trim(changed_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_customer_history_customer_date
    ON customer_history(customer_id, created_at);
`);

console.log("Tabela customer_history verificada com sucesso!");

// ======================================================
// 51. PEDIDOS DE COMPRA AOS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    purchase_number TEXT NOT NULL UNIQUE
      CHECK (length(trim(purchase_number)) > 0),

    supplier_id INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (
        status IN (
          'draft',
          'sent',
          'confirmed',
          'partially_received',
          'received',
          'cancelled'
        )
      ),

    currency TEXT NOT NULL DEFAULT 'BRL',

    subtotal_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(subtotal_cents) = 'integer'
        AND subtotal_cents >= 0
      ),

    discount_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(discount_cents) = 'integer'
        AND discount_cents >= 0
      ),

    shipping_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(shipping_cents) = 'integer'
        AND shipping_cents >= 0
      ),

    total_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(total_cents) = 'integer'
        AND total_cents >= 0
      ),

    expected_delivery_date DATE,

    sent_at DATETIME,

    received_at DATETIME,

    notes TEXT,

    created_by TEXT NOT NULL
      CHECK (length(trim(created_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
      REFERENCES suppliers(id)
      ON DELETE RESTRICT,

    CHECK (discount_cents <= subtotal_cents),

    CHECK (
      total_cents = subtotal_cents
        - discount_cents
        + shipping_cents
    )
  );

  CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier
    ON purchase_orders(supplier_id);

  CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
    ON purchase_orders(status);
`);

console.log("Tabela purchase_orders verificada com sucesso!");

// ======================================================
// 52. ITENS DOS PEDIDOS DE COMPRA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    purchase_order_id INTEGER NOT NULL,

    variant_id INTEGER,

    product_name TEXT NOT NULL
      CHECK (length(trim(product_name)) > 0),

    variant_sku TEXT NOT NULL
      CHECK (length(trim(variant_sku)) > 0),

    supplier_sku TEXT,

    color_name TEXT,

    size_name TEXT,

    quantity INTEGER NOT NULL
      CHECK (
        typeof(quantity) = 'integer'
        AND quantity > 0
      ),

    received_quantity INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(received_quantity) = 'integer'
        AND received_quantity >= 0
        AND received_quantity <= quantity
      ),

    unit_cost_cents INTEGER NOT NULL
      CHECK (
        typeof(unit_cost_cents) = 'integer'
        AND unit_cost_cents >= 0
      ),

    discount_cents INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(discount_cents) = 'integer'
        AND discount_cents >= 0
      ),

    line_total_cents INTEGER NOT NULL
      CHECK (
        typeof(line_total_cents) = 'integer'
        AND line_total_cents >= 0
      ),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id)
      REFERENCES purchase_orders(id)
      ON DELETE CASCADE,

    FOREIGN KEY (variant_id)
      REFERENCES product_variants(id)
      ON DELETE SET NULL,

    CHECK (
      discount_cents <= quantity * unit_cost_cents
    ),

    CHECK (
      line_total_cents =
        quantity * unit_cost_cents - discount_cents
    )
  );

  CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order
    ON purchase_order_items(purchase_order_id);

  CREATE INDEX IF NOT EXISTS idx_purchase_order_items_variant
    ON purchase_order_items(variant_id);
`);

console.log("Tabela purchase_order_items verificada com sucesso!");

// ======================================================
// 53. HISTÓRICO DOS PEDIDOS DE COMPRA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS purchase_order_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    purchase_order_id INTEGER NOT NULL,

    event_type TEXT NOT NULL
      CHECK (
        event_type IN (
          'created',
          'updated',
          'status_changed'
        )
      ),

    old_status TEXT
      CHECK (
        old_status IN (
          'draft',
          'sent',
          'confirmed',
          'partially_received',
          'received',
          'cancelled'
        )
      ),

    new_status TEXT
      CHECK (
        new_status IN (
          'draft',
          'sent',
          'confirmed',
          'partially_received',
          'received',
          'cancelled'
        )
      ),

    description TEXT NOT NULL
      CHECK (length(trim(description)) > 0),

    changed_by TEXT NOT NULL
      CHECK (length(trim(changed_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id)
      REFERENCES purchase_orders(id)
      ON DELETE CASCADE,

    CHECK (
      event_type <> 'status_changed'
      OR (
        old_status IS NOT NULL
        AND new_status IS NOT NULL
        AND old_status <> new_status
      )
    )
  );

  CREATE INDEX IF NOT EXISTS idx_purchase_order_history_order_date
    ON purchase_order_history(purchase_order_id, created_at);
`);

console.log("Tabela purchase_order_history verificada com sucesso!");

// ======================================================
// 54. RECEBIMENTOS DAS COMPRAS AOS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS purchase_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    receipt_number TEXT NOT NULL UNIQUE
      CHECK (length(trim(receipt_number)) > 0),

    purchase_order_id INTEGER NOT NULL,

    receipt_type TEXT NOT NULL
      CHECK (receipt_type IN ('pickup', 'delivery')),

    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'confirmed', 'cancelled')),

    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    received_by TEXT NOT NULL
      CHECK (length(trim(received_by)) > 0),

    supplier_document_number TEXT,

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id)
      REFERENCES purchase_orders(id)
      ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_purchase_receipts_order_date
    ON purchase_receipts(purchase_order_id, received_at);
`);

console.log("Tabela purchase_receipts verificada com sucesso!");

// ======================================================
// 55. ITENS DOS RECEBIMENTOS DAS COMPRAS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS purchase_receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    purchase_receipt_id INTEGER NOT NULL,

    purchase_order_item_id INTEGER NOT NULL,

    quantity INTEGER NOT NULL
      CHECK (
        typeof(quantity) = 'integer'
        AND quantity > 0
      ),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_receipt_id)
      REFERENCES purchase_receipts(id)
      ON DELETE CASCADE,

    FOREIGN KEY (purchase_order_item_id)
      REFERENCES purchase_order_items(id)
      ON DELETE RESTRICT,

    UNIQUE (
      purchase_receipt_id,
      purchase_order_item_id
    )
  );

  CREATE INDEX IF NOT EXISTS idx_purchase_receipt_items_order_item
    ON purchase_receipt_items(purchase_order_item_id);
`);

console.log("Tabela purchase_receipt_items verificada com sucesso!");

// ======================================================
// 56. HISTÓRICO DOS RECEBIMENTOS DAS COMPRAS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS purchase_receipt_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    purchase_receipt_id INTEGER NOT NULL,

    event_type TEXT NOT NULL
      CHECK (
        event_type IN (
          'created',
          'updated',
          'status_changed'
        )
      ),

    old_status TEXT
      CHECK (
        old_status IN (
          'draft',
          'confirmed',
          'cancelled'
        )
      ),

    new_status TEXT
      CHECK (
        new_status IN (
          'draft',
          'confirmed',
          'cancelled'
        )
      ),

    description TEXT NOT NULL
      CHECK (length(trim(description)) > 0),

    changed_by TEXT NOT NULL
      CHECK (length(trim(changed_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_receipt_id)
      REFERENCES purchase_receipts(id)
      ON DELETE CASCADE,

    CHECK (
      event_type <> 'status_changed'
      OR (
        old_status IS NOT NULL
        AND new_status IS NOT NULL
        AND old_status <> new_status
      )
    )
  );

  CREATE INDEX IF NOT EXISTS idx_purchase_receipt_history_receipt_date
    ON purchase_receipt_history(
      purchase_receipt_id,
      created_at
    );
`);

console.log("Tabela purchase_receipt_history verificada com sucesso!");

// ======================================================
// 57. VÍNCULOS ENTRE ITENS DE COMPRA E ITENS DE VENDA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS purchase_order_item_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    purchase_order_item_id INTEGER NOT NULL,

    order_item_id INTEGER NOT NULL,

    quantity INTEGER NOT NULL
      CHECK (
        typeof(quantity) = 'integer'
        AND quantity > 0
      ),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_item_id)
      REFERENCES purchase_order_items(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (order_item_id)
      REFERENCES order_items(id)
      ON DELETE RESTRICT,

    UNIQUE (
      purchase_order_item_id,
      order_item_id
    )
  );

  CREATE INDEX IF NOT EXISTS idx_purchase_allocations_order_item
    ON purchase_order_item_allocations(order_item_id);
`);

console.log("Tabela purchase_order_item_allocations verificada com sucesso!");

// ======================================================
// 58. OBSERVAÇÕES DOS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    supplier_id INTEGER NOT NULL,

    note TEXT NOT NULL
      CHECK (length(trim(note)) > 0),

    created_by TEXT NOT NULL
      CHECK (length(trim(created_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
      REFERENCES suppliers(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_supplier_notes_supplier_date
    ON supplier_notes(supplier_id, created_at);
`);

console.log("Tabela supplier_notes verificada com sucesso!");

// ======================================================
// 59. CONTATOS REALIZADOS COM OS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    supplier_id INTEGER NOT NULL,

    purchase_order_id INTEGER,

    channel TEXT NOT NULL
      CHECK (
        channel IN (
          'whatsapp',
          'email',
          'phone',
          'chat',
          'in_person',
          'other'
        )
      ),

    direction TEXT NOT NULL
      CHECK (
        direction IN (
          'inbound',
          'outbound'
        )
      ),

    subject TEXT NOT NULL
      CHECK (length(trim(subject)) > 0),

    description TEXT NOT NULL
      CHECK (length(trim(description)) > 0),

    handled_by TEXT NOT NULL
      CHECK (length(trim(handled_by)) > 0),

    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
      REFERENCES suppliers(id)
      ON DELETE CASCADE,

    FOREIGN KEY (purchase_order_id)
      REFERENCES purchase_orders(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_supplier_interactions_supplier_date
    ON supplier_interactions(supplier_id, occurred_at);

  CREATE INDEX IF NOT EXISTS idx_supplier_interactions_purchase_order
    ON supplier_interactions(purchase_order_id);
`);

console.log("Tabela supplier_interactions verificada com sucesso!");

// ======================================================
// 60. TAREFAS DOS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    supplier_id INTEGER NOT NULL,

    title TEXT NOT NULL
      CHECK (length(trim(title)) > 0),

    description TEXT,

    assigned_to TEXT NOT NULL
      CHECK (length(trim(assigned_to)) > 0),

    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN (
          'pending',
          'in_progress',
          'completed',
          'cancelled'
        )
      ),

    priority TEXT NOT NULL DEFAULT 'normal'
      CHECK (
        priority IN (
          'low',
          'normal',
          'high'
        )
      ),

    due_at DATETIME,

    completed_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
      REFERENCES suppliers(id)
      ON DELETE CASCADE,

    CHECK (
      (
        status = 'completed'
        AND completed_at IS NOT NULL
      )
      OR (
        status <> 'completed'
        AND completed_at IS NULL
      )
    )
  );

  CREATE INDEX IF NOT EXISTS idx_supplier_tasks_supplier
    ON supplier_tasks(supplier_id);

  CREATE INDEX IF NOT EXISTS idx_supplier_tasks_status_due
    ON supplier_tasks(status, due_at);
`);

console.log("Tabela supplier_tasks verificada com sucesso!");

// ======================================================
// 61. HISTÓRICO DE ALTERAÇÕES DOS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    supplier_id INTEGER NOT NULL,

    event_type TEXT NOT NULL
      CHECK (
        event_type IN (
          'created',
          'updated',
          'status_changed'
        )
      ),

    field_name TEXT,

    old_value TEXT,

    new_value TEXT,

    description TEXT NOT NULL
      CHECK (length(trim(description)) > 0),

    changed_by TEXT NOT NULL
      CHECK (length(trim(changed_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
      REFERENCES suppliers(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_supplier_history_supplier_date
    ON supplier_history(supplier_id, created_at);
`);

console.log("Tabela supplier_history verificada com sucesso!");

// ======================================================
// 62. PESSOAS DE CONTATO DOS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    supplier_id INTEGER NOT NULL,

    name TEXT NOT NULL
      CHECK (length(trim(name)) > 0),

    role TEXT,

    phone TEXT,

    whatsapp TEXT,

    email TEXT,

    is_primary INTEGER NOT NULL DEFAULT 0
      CHECK (is_primary IN (0, 1)),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'inactive'
        )
      ),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
      REFERENCES suppliers(id)
      ON DELETE CASCADE,

    CHECK (
      is_primary = 0
      OR status = 'active'
    )
  );

  CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier
    ON supplier_contacts(supplier_id);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_contacts_primary
    ON supplier_contacts(supplier_id)
    WHERE is_primary = 1;
`);

console.log("Tabela supplier_contacts verificada com sucesso!");

// ======================================================
// 63. ENDEREÇOS DOS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    supplier_id INTEGER NOT NULL,

    label TEXT NOT NULL
      CHECK (length(trim(label)) > 0),

    address_type TEXT NOT NULL
      CHECK (
        address_type IN (
          'pickup',
          'office',
          'billing',
          'other'
        )
      ),

    postal_code TEXT NOT NULL
      CHECK (length(trim(postal_code)) > 0),

    street TEXT NOT NULL
      CHECK (length(trim(street)) > 0),

    number TEXT NOT NULL
      CHECK (length(trim(number)) > 0),

    complement TEXT,

    neighborhood TEXT NOT NULL
      CHECK (length(trim(neighborhood)) > 0),

    city TEXT NOT NULL
      CHECK (length(trim(city)) > 0),

    state TEXT NOT NULL
      CHECK (length(trim(state)) = 2),

    country_code TEXT NOT NULL DEFAULT 'BR'
      CHECK (length(trim(country_code)) = 2),

    is_primary INTEGER NOT NULL DEFAULT 0
      CHECK (is_primary IN (0, 1)),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
      REFERENCES suppliers(id)
      ON DELETE CASCADE,

    CHECK (
      is_primary = 0
      OR status = 'active'
    )
  );

  CREATE INDEX IF NOT EXISTS idx_supplier_addresses_supplier
    ON supplier_addresses(supplier_id);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_addresses_primary_type
    ON supplier_addresses(supplier_id, address_type)
    WHERE is_primary = 1;
`);

console.log("Tabela supplier_addresses verificada com sucesso!");

// ======================================================
// 64. HORÁRIOS DOS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_business_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    supplier_address_id INTEGER NOT NULL,

    weekday INTEGER NOT NULL
      CHECK (
        typeof(weekday) = 'integer'
        AND weekday BETWEEN 0 AND 6
      ),

    service_type TEXT NOT NULL DEFAULT 'pickup'
      CHECK (
        service_type IN (
          'pickup',
          'customer_service'
        )
      ),

    opens_at TEXT NOT NULL
      CHECK (
        opens_at GLOB '[0-2][0-9]:[0-5][0-9]'
        AND substr(opens_at, 1, 2) BETWEEN '00' AND '23'
      ),

    closes_at TEXT NOT NULL
      CHECK (
        closes_at GLOB '[0-2][0-9]:[0-5][0-9]'
        AND substr(closes_at, 1, 2) BETWEEN '00' AND '23'
      ),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_address_id)
      REFERENCES supplier_addresses(id)
      ON DELETE CASCADE,

    CHECK (opens_at < closes_at),

    UNIQUE (
      supplier_address_id,
      weekday,
      service_type,
      opens_at
    )
  );

  CREATE INDEX IF NOT EXISTS idx_supplier_business_hours_address_day
    ON supplier_business_hours(supplier_address_id, weekday);
`);

console.log("Tabela supplier_business_hours verificada com sucesso!");

// ======================================================
// 65. PERÍODOS DE FECHAMENTO DOS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_closures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    supplier_address_id INTEGER NOT NULL,

    starts_at DATETIME NOT NULL
      CHECK (
        datetime(starts_at) IS NOT NULL
        AND starts_at = datetime(starts_at)
      ),

    ends_at DATETIME NOT NULL
      CHECK (
        datetime(ends_at) IS NOT NULL
        AND ends_at = datetime(ends_at)
      ),

    reason TEXT NOT NULL
      CHECK (length(trim(reason)) > 0),

    created_by TEXT NOT NULL
      CHECK (length(trim(created_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_address_id)
      REFERENCES supplier_addresses(id)
      ON DELETE CASCADE,

    CHECK (starts_at < ends_at),

    UNIQUE (
      supplier_address_id,
      starts_at,
      ends_at
    )
  );

  CREATE INDEX IF NOT EXISTS idx_supplier_closures_address_period
    ON supplier_closures(
      supplier_address_id,
      starts_at,
      ends_at
    );
`);

console.log("Tabela supplier_closures verificada com sucesso!");

// ======================================================
// 66. AGENDAMENTOS DE RETIRADA NOS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_pickup_appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    purchase_order_id INTEGER NOT NULL,

    supplier_address_id INTEGER NOT NULL,

    scheduled_at DATETIME NOT NULL
      CHECK (
        datetime(scheduled_at) IS NOT NULL
        AND scheduled_at = datetime(scheduled_at)
      ),

    assigned_to TEXT NOT NULL
      CHECK (length(trim(assigned_to)) > 0),

    status TEXT NOT NULL DEFAULT 'scheduled'
      CHECK (
        status IN (
          'scheduled',
          'confirmed',
          'completed',
          'cancelled'
        )
      ),

    completed_at DATETIME,

    notes TEXT,

    created_by TEXT NOT NULL
      CHECK (length(trim(created_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id)
      REFERENCES purchase_orders(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (supplier_address_id)
      REFERENCES supplier_addresses(id)
      ON DELETE RESTRICT,

    CHECK (
      (
        status = 'completed'
        AND completed_at IS NOT NULL
      )
      OR (
        status <> 'completed'
        AND completed_at IS NULL
      )
    )
  );

  CREATE INDEX IF NOT EXISTS idx_supplier_pickups_order
    ON supplier_pickup_appointments(purchase_order_id);

  CREATE INDEX IF NOT EXISTS idx_supplier_pickups_address_date
    ON supplier_pickup_appointments(
      supplier_address_id,
      scheduled_at
    );

  CREATE INDEX IF NOT EXISTS idx_supplier_pickups_status_date
    ON supplier_pickup_appointments(status, scheduled_at);
`);

console.log("Tabela supplier_pickup_appointments verificada com sucesso!");

// ======================================================
// 67. HISTÓRICO DOS AGENDAMENTOS DE RETIRADA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_pickup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    pickup_appointment_id INTEGER NOT NULL,

    event_type TEXT NOT NULL
      CHECK (
        event_type IN (
          'created',
          'updated',
          'status_changed',
          'rescheduled'
        )
      ),

    old_status TEXT
      CHECK (
        old_status IN (
          'scheduled',
          'confirmed',
          'completed',
          'cancelled'
        )
      ),

    new_status TEXT
      CHECK (
        new_status IN (
          'scheduled',
          'confirmed',
          'completed',
          'cancelled'
        )
      ),

    old_scheduled_at DATETIME
      CHECK (
        old_scheduled_at IS NULL
        OR (
          datetime(old_scheduled_at) IS NOT NULL
          AND old_scheduled_at = datetime(old_scheduled_at)
        )
      ),

    new_scheduled_at DATETIME
      CHECK (
        new_scheduled_at IS NULL
        OR (
          datetime(new_scheduled_at) IS NOT NULL
          AND new_scheduled_at = datetime(new_scheduled_at)
        )
      ),

    description TEXT NOT NULL
      CHECK (length(trim(description)) > 0),

    changed_by TEXT NOT NULL
      CHECK (length(trim(changed_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (pickup_appointment_id)
      REFERENCES supplier_pickup_appointments(id)
      ON DELETE CASCADE,

    CHECK (
      event_type <> 'status_changed'
      OR (
        old_status IS NOT NULL
        AND new_status IS NOT NULL
        AND old_status <> new_status
      )
    ),

    CHECK (
      event_type <> 'rescheduled'
      OR (
        old_scheduled_at IS NOT NULL
        AND new_scheduled_at IS NOT NULL
        AND old_scheduled_at <> new_scheduled_at
      )
    )
  );

  CREATE INDEX IF NOT EXISTS idx_supplier_pickup_history_appointment_date
    ON supplier_pickup_history(
      pickup_appointment_id,
      created_at
    );
`);

console.log("Tabela supplier_pickup_history verificada com sucesso!");

// ======================================================
// 68. DOCUMENTOS DOS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    supplier_id INTEGER NOT NULL,

    document_type TEXT NOT NULL
      CHECK (
        document_type IN (
          'registration',
          'contract',
          'catalog',
          'return_policy',
          'other'
        )
      ),

    title TEXT NOT NULL
      CHECK (length(trim(title)) > 0),

    original_filename TEXT NOT NULL
      CHECK (length(trim(original_filename)) > 0),

    storage_key TEXT NOT NULL UNIQUE
      CHECK (length(trim(storage_key)) > 0),

    mime_type TEXT NOT NULL
      CHECK (length(trim(mime_type)) > 0),

    file_size_bytes INTEGER NOT NULL
      CHECK (
        typeof(file_size_bytes) = 'integer'
        AND file_size_bytes > 0
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (
        status IN (
          'active',
          'archived'
        )
      ),

    notes TEXT,

    uploaded_by TEXT NOT NULL
      CHECK (length(trim(uploaded_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
      REFERENCES suppliers(id)
      ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier_type
    ON supplier_documents(supplier_id, document_type);
`);

console.log("Tabela supplier_documents verificada com sucesso!");

// ======================================================
// 69. LINKS E REDES SOCIAIS DOS FORNECEDORES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_social_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    supplier_id INTEGER NOT NULL,

    platform TEXT NOT NULL
      CHECK (
        platform IN (
          'instagram',
          'facebook',
          'tiktok',
          'youtube',
          'website',
          'other'
        )
      ),

    label TEXT NOT NULL
      CHECK (length(trim(label)) > 0),

    url TEXT NOT NULL
      CHECK (
        url = trim(url)
        AND (
          (
            lower(url) LIKE 'https://%'
            AND length(url) > 8
          )
          OR (
            lower(url) LIKE 'http://%'
            AND length(url) > 7
          )
        )
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id)
      REFERENCES suppliers(id)
      ON DELETE CASCADE,

    UNIQUE (supplier_id, url)
  );

  CREATE INDEX IF NOT EXISTS idx_supplier_social_links_supplier_platform
    ON supplier_social_links(supplier_id, platform);
`);

console.log("Tabela supplier_social_links verificada com sucesso!");

// ======================================================
// 70. DOCUMENTOS DOS PEDIDOS DE COMPRA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS purchase_order_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    purchase_order_id INTEGER NOT NULL,

    document_type TEXT NOT NULL
      CHECK (
        document_type IN (
          'quotation',
          'order_confirmation',
          'payment_receipt',
          'invoice',
          'other'
        )
      ),

    title TEXT NOT NULL
      CHECK (length(trim(title)) > 0),

    original_filename TEXT NOT NULL
      CHECK (length(trim(original_filename)) > 0),

    storage_key TEXT NOT NULL UNIQUE
      CHECK (length(trim(storage_key)) > 0),

    mime_type TEXT NOT NULL
      CHECK (length(trim(mime_type)) > 0),

    file_size_bytes INTEGER NOT NULL
      CHECK (
        typeof(file_size_bytes) = 'integer'
        AND file_size_bytes > 0
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'archived')),

    notes TEXT,

    uploaded_by TEXT NOT NULL
      CHECK (length(trim(uploaded_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id)
      REFERENCES purchase_orders(id)
      ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_purchase_order_documents_order_type
    ON purchase_order_documents(
      purchase_order_id,
      document_type
    );
`);

console.log("Tabela purchase_order_documents verificada com sucesso!");

// ======================================================
// 71. OBSERVAÇÕES DOS PEDIDOS DE COMPRA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS purchase_order_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    purchase_order_id INTEGER NOT NULL,

    note TEXT NOT NULL
      CHECK (length(trim(note)) > 0),

    created_by TEXT NOT NULL
      CHECK (length(trim(created_by)) > 0),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id)
      REFERENCES purchase_orders(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_purchase_order_notes_order_date
    ON purchase_order_notes(purchase_order_id, created_at);
`);

console.log("Tabela purchase_order_notes verificada com sucesso!");

// ======================================================
// 72. USUÁRIOS ADMINISTRATIVOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL
      CHECK (length(trim(name)) > 0),

    email TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        email = trim(email)
        AND length(email) > 0
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("Tabela admin_users verificada com sucesso!");

// ======================================================
// 73. AUTENTICAÇÃO DOS USUÁRIOS ADMINISTRATIVOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    admin_user_id INTEGER NOT NULL UNIQUE,

    password_hash TEXT NOT NULL
      CHECK (length(trim(password_hash)) > 0),

    password_changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    failed_login_attempts INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(failed_login_attempts) = 'integer'
        AND failed_login_attempts >= 0
      ),

    locked_until DATETIME,

    last_login_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (admin_user_id)
      REFERENCES admin_users(id)
      ON DELETE CASCADE
  );
`);

console.log("Tabela admin_auth verificada com sucesso!");

// ======================================================
// 74. SESSÕES DOS USUÁRIOS ADMINISTRATIVOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    admin_user_id INTEGER NOT NULL,

    token_hash TEXT NOT NULL UNIQUE
      CHECK (length(trim(token_hash)) > 0),

    ip_address TEXT,

    user_agent TEXT,

    expires_at DATETIME NOT NULL,

    revoked_at DATETIME,

    last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (admin_user_id)
      REFERENCES admin_users(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_admin_sessions_user
    ON admin_sessions(admin_user_id);

  CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiration
    ON admin_sessions(expires_at);
`);

console.log("Tabela admin_sessions verificada com sucesso!");

// ======================================================
// 75. RECUPERAÇÃO DE SENHA DOS USUÁRIOS ADMINISTRATIVOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    admin_user_id INTEGER NOT NULL,

    token_hash TEXT NOT NULL UNIQUE
      CHECK (length(trim(token_hash)) > 0),

    expires_at DATETIME NOT NULL,

    used_at DATETIME,

    revoked_at DATETIME,

    requested_ip TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (admin_user_id)
      REFERENCES admin_users(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_admin_password_resets_user
    ON admin_password_resets(admin_user_id);

  CREATE INDEX IF NOT EXISTS idx_admin_password_resets_expiration
    ON admin_password_resets(expires_at);
`);

console.log("Tabela admin_password_resets verificada com sucesso!");

// ======================================================
// 76. PERFIS DE ACESSO ADMINISTRATIVO
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL
      CHECK (length(trim(name)) > 0),

    code TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        code = trim(code)
        AND length(code) > 0
      ),

    description TEXT,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("Tabela admin_roles verificada com sucesso!");

// ======================================================
// 77. VÍNCULOS ENTRE USUÁRIOS E PERFIS ADMINISTRATIVOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    admin_user_id INTEGER NOT NULL,

    admin_role_id INTEGER NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (admin_user_id, admin_role_id),

    FOREIGN KEY (admin_user_id)
      REFERENCES admin_users(id)
      ON DELETE CASCADE,

    FOREIGN KEY (admin_role_id)
      REFERENCES admin_roles(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_admin_user_roles_role
    ON admin_user_roles(admin_role_id);
`);

console.log("Tabela admin_user_roles verificada com sucesso!");

// ======================================================
// 78. PERMISSÕES ADMINISTRATIVAS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL
      CHECK (length(trim(name)) > 0),

    code TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        code = trim(code)
        AND length(code) > 0
      ),

    description TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("Tabela admin_permissions verificada com sucesso!");

// ======================================================
// 79. VÍNCULOS ENTRE PERFIS E PERMISSÕES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    admin_role_id INTEGER NOT NULL,

    admin_permission_id INTEGER NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (admin_role_id, admin_permission_id),

    FOREIGN KEY (admin_role_id)
      REFERENCES admin_roles(id)
      ON DELETE CASCADE,

    FOREIGN KEY (admin_permission_id)
      REFERENCES admin_permissions(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_admin_role_permissions_permission
    ON admin_role_permissions(admin_permission_id);
`);

console.log("Tabela admin_role_permissions verificada com sucesso!");

// ======================================================
// 80. REGISTROS DE AUDITORIA ADMINISTRATIVA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    admin_user_id INTEGER,

    actor_name TEXT NOT NULL
      CHECK (length(trim(actor_name)) > 0),

    action TEXT NOT NULL
      CHECK (length(trim(action)) > 0),

    entity_type TEXT NOT NULL
      CHECK (length(trim(entity_type)) > 0),

    entity_id INTEGER
      CHECK (
        entity_id IS NULL
        OR (
          typeof(entity_id) = 'integer'
          AND entity_id > 0
        )
      ),

    description TEXT NOT NULL
      CHECK (length(trim(description)) > 0),

    ip_address TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (admin_user_id)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_user_date
    ON admin_audit_logs(admin_user_id, created_at);

  CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity
    ON admin_audit_logs(entity_type, entity_id);
`);

console.log("Tabela admin_audit_logs verificada com sucesso!");

// ======================================================
// 81. CONFIGURAÇÕES GERAIS DA LOJA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS store_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    setting_key TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        setting_key = trim(setting_key)
        AND length(setting_key) > 0
      ),

    setting_value TEXT NOT NULL,

    description TEXT,

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela store_settings verificada com sucesso!");

// ======================================================
// 82. PÁGINAS INSTITUCIONAIS DA LOJA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS store_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    title TEXT NOT NULL
      CHECK (length(trim(title)) > 0),

    slug TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        slug = trim(slug)
        AND length(slug) > 0
      ),

    content TEXT NOT NULL DEFAULT '',

    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'published', 'archived')),

    published_at DATETIME,

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      status != 'published'
      OR (
        published_at IS NOT NULL
        AND length(trim(content)) > 0
      )
    ),

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela store_pages verificada com sucesso!");

// ======================================================
// 83. PERGUNTAS FREQUENTES DA LOJA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS store_faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    question TEXT NOT NULL
      CHECK (length(trim(question)) > 0),

    answer TEXT NOT NULL
      CHECK (length(trim(answer)) > 0),

    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'published', 'archived')),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(sort_order) = 'integer'
        AND sort_order >= 0
      ),

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela store_faqs verificada com sucesso!");

// ======================================================
// 84. BANNERS DA LOJA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS store_banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    title TEXT NOT NULL
      CHECK (length(trim(title)) > 0),

    image_storage_key TEXT NOT NULL
      CHECK (length(trim(image_storage_key)) > 0),

    alt_text TEXT NOT NULL
      CHECK (length(trim(alt_text)) > 0),

    destination_url TEXT,

    placement TEXT NOT NULL DEFAULT 'home'
      CHECK (placement IN ('home', 'category', 'other')),

    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'published', 'archived')),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(sort_order) = 'integer'
        AND sort_order >= 0
      ),

    starts_at DATETIME,

    ends_at DATETIME,

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      starts_at IS NULL
      OR (
        datetime(starts_at) IS NOT NULL
        AND starts_at = datetime(starts_at)
      )
    ),

    CHECK (
      ends_at IS NULL
      OR (
        datetime(ends_at) IS NOT NULL
        AND ends_at = datetime(ends_at)
      )
    ),

    CHECK (
      starts_at IS NULL
      OR ends_at IS NULL
      OR starts_at < ends_at
    ),

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_store_banners_display
    ON store_banners(placement, status, sort_order);
`);

console.log("Tabela store_banners verificada com sucesso!");

// ======================================================
// 85. LINKS E REDES SOCIAIS DA LOJA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS store_social_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    platform TEXT NOT NULL
      CHECK (
        platform IN (
          'instagram',
          'facebook',
          'tiktok',
          'youtube',
          'whatsapp',
          'website',
          'other'
        )
      ),

    label TEXT NOT NULL
      CHECK (length(trim(label)) > 0),

    url TEXT NOT NULL UNIQUE
      CHECK (
        url = trim(url)
        AND lower(substr(url, 1, 8)) = 'https://'
        AND length(url) > 8
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(sort_order) = 'integer'
        AND sort_order >= 0
      ),

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela store_social_links verificada com sucesso!");

// ======================================================
// 86. CANAIS DE ATENDIMENTO DA LOJA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS store_contact_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    channel_type TEXT NOT NULL
      CHECK (channel_type IN ('email', 'phone', 'whatsapp')),

    label TEXT NOT NULL
      CHECK (length(trim(label)) > 0),

    contact_value TEXT NOT NULL
      CHECK (
        contact_value = trim(contact_value)
        AND length(contact_value) > 0
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(sort_order) = 'integer'
        AND sort_order >= 0
      ),

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (channel_type, contact_value),

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela store_contact_channels verificada com sucesso!");

// ======================================================
// 87. HORÁRIOS DE ATENDIMENTO DA LOJA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS store_business_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    weekday INTEGER NOT NULL
      CHECK (
        typeof(weekday) = 'integer'
        AND weekday BETWEEN 0 AND 6
      ),

    opens_at TEXT NOT NULL
      CHECK (
        opens_at GLOB '[0-2][0-9]:[0-5][0-9]'
        AND substr(opens_at, 1, 2) BETWEEN '00' AND '23'
      ),

    closes_at TEXT NOT NULL
      CHECK (
        closes_at GLOB '[0-2][0-9]:[0-5][0-9]'
        AND substr(closes_at, 1, 2) BETWEEN '00' AND '23'
      ),

    notes TEXT,

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (opens_at < closes_at),

    UNIQUE (weekday, opens_at),

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );
`);

console.log("Tabela store_business_hours verificada com sucesso!");

// ======================================================
// 88. PERÍODOS SEM ATENDIMENTO DA LOJA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS store_closures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    starts_at DATETIME NOT NULL
      CHECK (
        datetime(starts_at) IS NOT NULL
        AND starts_at = datetime(starts_at)
      ),

    ends_at DATETIME NOT NULL
      CHECK (
        datetime(ends_at) IS NOT NULL
        AND ends_at = datetime(ends_at)
      ),

    reason TEXT NOT NULL
      CHECK (length(trim(reason)) > 0),

    created_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (starts_at < ends_at),

    UNIQUE (starts_at, ends_at),

    FOREIGN KEY (created_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_store_closures_period
    ON store_closures(starts_at, ends_at);
`);

console.log("Tabela store_closures verificada com sucesso!");

// ======================================================
// 89. FORMAS DE RECEBIMENTO DOS PEDIDOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS shipping_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL
      CHECK (length(trim(name)) > 0),

    code TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        length(trim(code)) > 0
        AND code = trim(code)
      ),

    method_type TEXT NOT NULL
      CHECK (method_type IN ('delivery', 'pickup')),

    description TEXT,

    estimated_min_days INTEGER
      CHECK (
        estimated_min_days IS NULL
        OR (
          typeof(estimated_min_days) = 'integer'
          AND estimated_min_days >= 0
        )
      ),

    estimated_max_days INTEGER
      CHECK (
        estimated_max_days IS NULL
        OR (
          typeof(estimated_max_days) = 'integer'
          AND estimated_max_days >= 0
        )
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(sort_order) = 'integer'
        AND sort_order >= 0
      ),

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      (
        estimated_min_days IS NULL
        AND estimated_max_days IS NULL
      )
      OR (
        estimated_min_days IS NOT NULL
        AND estimated_max_days IS NOT NULL
        AND estimated_min_days <= estimated_max_days
      )
    ),

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_shipping_methods_status_sort
    ON shipping_methods(status, sort_order);
`);

console.log("Tabela shipping_methods verificada com sucesso!");

// ======================================================
// 90. TARIFAS DE FRETE POR FAIXA DE CEP
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS shipping_method_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    shipping_method_id INTEGER NOT NULL,

    name TEXT NOT NULL
      CHECK (length(trim(name)) > 0),

    postal_code_start TEXT NOT NULL
      CHECK (
        length(postal_code_start) = 8
        AND postal_code_start NOT GLOB '*[^0-9]*'
      ),

    postal_code_end TEXT NOT NULL
      CHECK (
        length(postal_code_end) = 8
        AND postal_code_end NOT GLOB '*[^0-9]*'
      ),

    price_cents INTEGER NOT NULL
      CHECK (
        typeof(price_cents) = 'integer'
        AND price_cents >= 0
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (postal_code_start <= postal_code_end),

    UNIQUE (
      shipping_method_id,
      postal_code_start,
      postal_code_end
    ),

    FOREIGN KEY (shipping_method_id)
      REFERENCES shipping_methods(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_shipping_method_rates_lookup
    ON shipping_method_rates(
      shipping_method_id,
      status,
      postal_code_start,
      postal_code_end
    );
`);

console.log("Tabela shipping_method_rates verificada com sucesso!");

// ======================================================
// 91. PONTOS DE RETIRADA DOS PEDIDOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS pickup_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL
      CHECK (length(trim(name)) > 0),

    code TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        length(trim(code)) > 0
        AND code = trim(code)
      ),

    shipping_method_id INTEGER NOT NULL,

    postal_code TEXT NOT NULL
      CHECK (
        length(postal_code) = 8
        AND postal_code NOT GLOB '*[^0-9]*'
      ),

    street TEXT NOT NULL
      CHECK (length(trim(street)) > 0),

    street_number TEXT NOT NULL
      CHECK (length(trim(street_number)) > 0),

    complement TEXT,

    neighborhood TEXT NOT NULL
      CHECK (length(trim(neighborhood)) > 0),

    city TEXT NOT NULL
      CHECK (length(trim(city)) > 0),

    state TEXT NOT NULL
      CHECK (
        state IN (
          'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF',
          'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
          'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS',
          'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
        )
      ),

    instructions TEXT,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (shipping_method_id)
      REFERENCES shipping_methods(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pickup_points_method_status
    ON pickup_points(shipping_method_id, status);
`);

console.log("Tabela pickup_points verificada com sucesso!");

// ======================================================
// 92. HORÁRIOS DOS PONTOS DE RETIRADA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS pickup_point_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    pickup_point_id INTEGER NOT NULL,

    weekday INTEGER NOT NULL
      CHECK (
        typeof(weekday) = 'integer'
        AND weekday BETWEEN 0 AND 6
      ),

    opens_at TEXT NOT NULL
      CHECK (
        length(opens_at) = 5
        AND opens_at GLOB '[0-2][0-9]:[0-5][0-9]'
        AND substr(opens_at, 1, 2) BETWEEN '00' AND '23'
      ),

    closes_at TEXT NOT NULL
      CHECK (
        length(closes_at) = 5
        AND closes_at GLOB '[0-2][0-9]:[0-5][0-9]'
        AND substr(closes_at, 1, 2) BETWEEN '00' AND '23'
      ),

    notes TEXT,

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (opens_at < closes_at),

    UNIQUE (pickup_point_id, weekday, opens_at),

    FOREIGN KEY (pickup_point_id)
      REFERENCES pickup_points(id)
      ON DELETE CASCADE,

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pickup_point_hours_point_weekday
    ON pickup_point_hours(pickup_point_id, weekday);
`);

console.log("Tabela pickup_point_hours verificada com sucesso!");

// ======================================================
// 93. FECHAMENTOS DOS PONTOS DE RETIRADA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS pickup_point_closures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    pickup_point_id INTEGER NOT NULL,

    starts_at DATETIME NOT NULL
      CHECK (
        datetime(starts_at) IS NOT NULL
        AND starts_at = datetime(starts_at)
      ),

    ends_at DATETIME NOT NULL
      CHECK (
        datetime(ends_at) IS NOT NULL
        AND ends_at = datetime(ends_at)
      ),

    reason TEXT NOT NULL
      CHECK (length(trim(reason)) > 0),

    created_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (starts_at < ends_at),

    UNIQUE (pickup_point_id, starts_at, ends_at),

    FOREIGN KEY (pickup_point_id)
      REFERENCES pickup_points(id)
      ON DELETE CASCADE,

    FOREIGN KEY (created_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pickup_point_closures_period
    ON pickup_point_closures(
      pickup_point_id,
      starts_at,
      ends_at
    );
`);

console.log("Tabela pickup_point_closures verificada com sucesso!");

// ======================================================
// 94. RETIRADAS DOS PEDIDOS PELOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS order_pickups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_id INTEGER NOT NULL UNIQUE,

    pickup_point_id INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN (
          'pending',
          'ready',
          'collected',
          'cancelled'
        )
      ),

    ready_at DATETIME
      CHECK (
        ready_at IS NULL
        OR (
          datetime(ready_at) IS NOT NULL
          AND ready_at = datetime(ready_at)
        )
      ),

    collected_at DATETIME
      CHECK (
        collected_at IS NULL
        OR (
          datetime(collected_at) IS NOT NULL
          AND collected_at = datetime(collected_at)
        )
      ),

    collected_by_name TEXT
      CHECK (
        collected_by_name IS NULL
        OR length(trim(collected_by_name)) > 0
      ),

    notes TEXT,

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      status NOT IN ('ready', 'collected')
      OR ready_at IS NOT NULL
    ),

    CHECK (
      status != 'pending'
      OR ready_at IS NULL
    ),

    CHECK (
      (
        status = 'collected'
        AND collected_at IS NOT NULL
        AND collected_by_name IS NOT NULL
      )
      OR (
        status != 'collected'
        AND collected_at IS NULL
        AND collected_by_name IS NULL
      )
    ),

    CHECK (
      collected_at IS NULL
      OR collected_at >= ready_at
    ),

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (pickup_point_id)
      REFERENCES pickup_points(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_order_pickups_point_status
    ON order_pickups(pickup_point_id, status);
`);

console.log("Tabela order_pickups verificada com sucesso!");

// ======================================================
// 95. HISTÓRICO DAS RETIRADAS DOS PEDIDOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS order_pickup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_pickup_id INTEGER NOT NULL,

    event_type TEXT NOT NULL
      CHECK (
        event_type IN (
          'created',
          'status_changed',
          'note'
        )
      ),

    previous_status TEXT
      CHECK (
        previous_status IS NULL
        OR previous_status IN (
          'pending',
          'ready',
          'collected',
          'cancelled'
        )
      ),

    new_status TEXT
      CHECK (
        new_status IS NULL
        OR new_status IN (
          'pending',
          'ready',
          'collected',
          'cancelled'
        )
      ),

    description TEXT NOT NULL
      CHECK (length(trim(description)) > 0),

    actor_name TEXT NOT NULL
      CHECK (length(trim(actor_name)) > 0),

    created_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      (
        event_type = 'created'
        AND previous_status IS NULL
        AND new_status IS NOT NULL
      )
      OR (
        event_type = 'status_changed'
        AND previous_status IS NOT NULL
        AND new_status IS NOT NULL
        AND previous_status != new_status
      )
      OR (
        event_type = 'note'
        AND previous_status IS NULL
        AND new_status IS NULL
      )
    ),

    FOREIGN KEY (order_pickup_id)
      REFERENCES order_pickups(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (created_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_order_pickup_history_pickup_date
    ON order_pickup_history(
      order_pickup_id,
      created_at,
      id
    );
`);

console.log("Tabela order_pickup_history verificada com sucesso!");

// ======================================================
// 96. OBSERVAÇÕES INTERNAS DOS PEDIDOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS order_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_id INTEGER NOT NULL,

    note TEXT NOT NULL
      CHECK (length(trim(note)) > 0),

    author_name TEXT NOT NULL
      CHECK (length(trim(author_name)) > 0),

    created_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (created_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_order_notes_order_date
    ON order_notes(order_id, created_at, id);
`);

console.log("Tabela order_notes verificada com sucesso!");

// ======================================================
// 97. DOCUMENTOS DOS PEDIDOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS order_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_id INTEGER NOT NULL,

    document_type TEXT NOT NULL
      CHECK (
        document_type IN (
          'invoice',
          'receipt',
          'payment_receipt',
          'delivery_proof',
          'other'
        )
      ),

    title TEXT NOT NULL
      CHECK (length(trim(title)) > 0),

    original_filename TEXT NOT NULL
      CHECK (length(trim(original_filename)) > 0),

    storage_key TEXT NOT NULL UNIQUE
      CHECK (
        length(trim(storage_key)) > 0
        AND storage_key = trim(storage_key)
      ),

    mime_type TEXT NOT NULL
      CHECK (length(trim(mime_type)) > 0),

    file_size_bytes INTEGER NOT NULL
      CHECK (
        typeof(file_size_bytes) = 'integer'
        AND file_size_bytes > 0
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'archived')),

    uploaded_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (uploaded_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_order_documents_order_status
    ON order_documents(order_id, status);
`);

console.log("Tabela order_documents verificada com sucesso!");

// ======================================================
// 98. TAREFAS DOS PEDIDOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS order_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_id INTEGER NOT NULL,

    title TEXT NOT NULL
      CHECK (length(trim(title)) > 0),

    description TEXT,

    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN (
          'pending',
          'in_progress',
          'completed',
          'cancelled'
        )
      ),

    priority TEXT NOT NULL DEFAULT 'normal'
      CHECK (priority IN ('low', 'normal', 'high')),

    assigned_to INTEGER,

    due_at DATETIME
      CHECK (
        due_at IS NULL
        OR (
          datetime(due_at) IS NOT NULL
          AND due_at = datetime(due_at)
        )
      ),

    completed_at DATETIME
      CHECK (
        completed_at IS NULL
        OR (
          datetime(completed_at) IS NOT NULL
          AND completed_at = datetime(completed_at)
        )
      ),

    created_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      (
        status = 'completed'
        AND completed_at IS NOT NULL
      )
      OR (
        status != 'completed'
        AND completed_at IS NULL
      )
    ),

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (assigned_to)
      REFERENCES admin_users(id)
      ON DELETE SET NULL,

    FOREIGN KEY (created_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_order_tasks_order_status
    ON order_tasks(order_id, status);

  CREATE INDEX IF NOT EXISTS idx_order_tasks_assigned_status_due
    ON order_tasks(assigned_to, status, due_at);
`);

console.log("Tabela order_tasks verificada com sucesso!");

// ======================================================
// 99. HISTÓRICO DAS TAREFAS DOS PEDIDOS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS order_task_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_task_id INTEGER NOT NULL,

    event_type TEXT NOT NULL
      CHECK (
        event_type IN (
          'created',
          'status_changed',
          'assigned',
          'note'
        )
      ),

    previous_status TEXT
      CHECK (
        previous_status IS NULL
        OR previous_status IN (
          'pending',
          'in_progress',
          'completed',
          'cancelled'
        )
      ),

    new_status TEXT
      CHECK (
        new_status IS NULL
        OR new_status IN (
          'pending',
          'in_progress',
          'completed',
          'cancelled'
        )
      ),

    description TEXT NOT NULL
      CHECK (length(trim(description)) > 0),

    actor_name TEXT NOT NULL
      CHECK (length(trim(actor_name)) > 0),

    created_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      (
        event_type = 'created'
        AND previous_status IS NULL
        AND new_status IS NOT NULL
      )
      OR (
        event_type = 'status_changed'
        AND previous_status IS NOT NULL
        AND new_status IS NOT NULL
        AND previous_status != new_status
      )
      OR (
        event_type IN ('assigned', 'note')
        AND previous_status IS NULL
        AND new_status IS NULL
      )
    ),

    FOREIGN KEY (order_task_id)
      REFERENCES order_tasks(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (created_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_order_task_history_task_date
    ON order_task_history(order_task_id, created_at, id);
`);

console.log("Tabela order_task_history verificada com sucesso!");

// ======================================================
// 100. CHAMADOS DE ATENDIMENTO
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    ticket_number TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        length(trim(ticket_number)) > 0
        AND ticket_number = trim(ticket_number)
      ),

    customer_id INTEGER,

    order_id INTEGER,

    contact_name TEXT NOT NULL
      CHECK (length(trim(contact_name)) > 0),

    contact_email TEXT NOT NULL COLLATE NOCASE
      CHECK (
        length(trim(contact_email)) > 0
        AND contact_email = trim(contact_email)
      ),

    subject TEXT NOT NULL
      CHECK (length(trim(subject)) > 0),

    status TEXT NOT NULL DEFAULT 'open'
      CHECK (
        status IN (
          'open',
          'in_progress',
          'waiting_customer',
          'closed'
        )
      ),

    priority TEXT NOT NULL DEFAULT 'normal'
      CHECK (priority IN ('low', 'normal', 'high')),

    assigned_to INTEGER,

    closed_at DATETIME
      CHECK (
        closed_at IS NULL
        OR (
          datetime(closed_at) IS NOT NULL
          AND closed_at = datetime(closed_at)
        )
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      (
        status = 'closed'
        AND closed_at IS NOT NULL
      )
      OR (
        status != 'closed'
        AND closed_at IS NULL
      )
    ),

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE SET NULL,

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE SET NULL,

    FOREIGN KEY (assigned_to)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_date
    ON support_tickets(customer_id, created_at);

  CREATE INDEX IF NOT EXISTS idx_support_tickets_order
    ON support_tickets(order_id);

  CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_status
    ON support_tickets(assigned_to, status);
`);

console.log("Tabela support_tickets verificada com sucesso!");

// ======================================================
// 101. MENSAGENS DOS CHAMADOS DE ATENDIMENTO
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    support_ticket_id INTEGER NOT NULL,

    sender_type TEXT NOT NULL
      CHECK (
        sender_type IN (
          'customer',
          'admin',
          'system'
        )
      ),

    sender_name TEXT NOT NULL
      CHECK (length(trim(sender_name)) > 0),

    admin_user_id INTEGER,

    message TEXT NOT NULL
      CHECK (length(trim(message)) > 0),

    visibility TEXT NOT NULL DEFAULT 'public'
      CHECK (visibility IN ('public', 'internal')),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      sender_type = 'admin'
      OR admin_user_id IS NULL
    ),

    CHECK (
      sender_type != 'customer'
      OR visibility = 'public'
    ),

    FOREIGN KEY (support_ticket_id)
      REFERENCES support_tickets(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (admin_user_id)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_date
    ON support_messages(support_ticket_id, created_at, id);
`);

console.log("Tabela support_messages verificada com sucesso!");

// ======================================================
// 102. ANEXOS DAS MENSAGENS DE ATENDIMENTO
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS support_message_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    support_message_id INTEGER NOT NULL,

    original_filename TEXT NOT NULL
      CHECK (length(trim(original_filename)) > 0),

    storage_key TEXT NOT NULL UNIQUE
      CHECK (
        length(trim(storage_key)) > 0
        AND storage_key = trim(storage_key)
      ),

    mime_type TEXT NOT NULL
      CHECK (length(trim(mime_type)) > 0),

    file_size_bytes INTEGER NOT NULL
      CHECK (
        typeof(file_size_bytes) = 'integer'
        AND file_size_bytes > 0
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'archived')),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (support_message_id)
      REFERENCES support_messages(id)
      ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_support_attachments_message_status
    ON support_message_attachments(support_message_id, status);
`);

console.log(
  "Tabela support_message_attachments verificada com sucesso!"
);

// ======================================================
// 103. HISTÓRICO DOS CHAMADOS DE ATENDIMENTO
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS support_ticket_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    support_ticket_id INTEGER NOT NULL,

    event_type TEXT NOT NULL
      CHECK (
        event_type IN (
          'created',
          'status_changed',
          'priority_changed',
          'assigned'
        )
      ),

    previous_status TEXT
      CHECK (
        previous_status IS NULL
        OR previous_status IN (
          'open',
          'in_progress',
          'waiting_customer',
          'closed'
        )
      ),

    new_status TEXT
      CHECK (
        new_status IS NULL
        OR new_status IN (
          'open',
          'in_progress',
          'waiting_customer',
          'closed'
        )
      ),

    description TEXT NOT NULL
      CHECK (length(trim(description)) > 0),

    actor_name TEXT NOT NULL
      CHECK (length(trim(actor_name)) > 0),

    created_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      (
        event_type = 'created'
        AND previous_status IS NULL
        AND new_status IS NOT NULL
      )
      OR (
        event_type = 'status_changed'
        AND previous_status IS NOT NULL
        AND new_status IS NOT NULL
        AND previous_status != new_status
      )
      OR (
        event_type IN ('priority_changed', 'assigned')
        AND previous_status IS NULL
        AND new_status IS NULL
      )
    ),

    FOREIGN KEY (support_ticket_id)
      REFERENCES support_tickets(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (created_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_support_ticket_history_ticket_date
    ON support_ticket_history(
      support_ticket_id,
      created_at,
      id
    );
`);

console.log("Tabela support_ticket_history verificada com sucesso!");

// ======================================================
// 104. RESPOSTAS SALVAS PARA ATENDIMENTO
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS support_saved_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    title TEXT NOT NULL
      CHECK (length(trim(title)) > 0),

    shortcut TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        length(trim(shortcut)) > 0
        AND shortcut = trim(shortcut)
      ),

    content TEXT NOT NULL
      CHECK (length(trim(content)) > 0),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_support_saved_replies_status
    ON support_saved_replies(status);
`);

console.log("Tabela support_saved_replies verificada com sucesso!");

// ======================================================
// 105. AVALIAÇÕES DOS CHAMADOS DE ATENDIMENTO
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS support_ticket_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    support_ticket_id INTEGER NOT NULL UNIQUE,

    rating INTEGER NOT NULL
      CHECK (
        typeof(rating) = 'integer'
        AND rating BETWEEN 1 AND 5
      ),

    comment TEXT
      CHECK (
        comment IS NULL
        OR length(trim(comment)) > 0
      ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (support_ticket_id)
      REFERENCES support_tickets(id)
      ON DELETE RESTRICT
  );
`);

console.log("Tabela support_ticket_ratings verificada com sucesso!");

// ======================================================
// 106. ETIQUETAS DE ATENDIMENTO
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS support_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        length(trim(name)) > 0
        AND name = trim(name)
      ),

    description TEXT,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_support_tags_status
    ON support_tags(status);
`);

console.log("Tabela support_tags verificada com sucesso!");

// ======================================================
// 107. ETIQUETAS DOS CHAMADOS DE ATENDIMENTO
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS support_ticket_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    support_ticket_id INTEGER NOT NULL,

    support_tag_id INTEGER NOT NULL,

    created_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (support_ticket_id, support_tag_id),

    FOREIGN KEY (support_ticket_id)
      REFERENCES support_tickets(id)
      ON DELETE CASCADE,

    FOREIGN KEY (support_tag_id)
      REFERENCES support_tags(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (created_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_support_ticket_tags_tag
    ON support_ticket_tags(support_tag_id);
`);

console.log("Tabela support_ticket_tags verificada com sucesso!");

// ======================================================
// 108. LOOKS DA LOJA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS looks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    title TEXT NOT NULL
      CHECK (length(trim(title)) > 0),

    slug TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        length(trim(slug)) > 0
        AND slug = trim(slug)
      ),

    description TEXT,

    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (
        status IN ('draft', 'published', 'archived')
      ),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(sort_order) = 'integer'
        AND sort_order >= 0
      ),

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_looks_status_sort
    ON looks(status, sort_order);
`);

console.log("Tabela looks verificada com sucesso!");

// ======================================================
// 109. PRODUTOS DOS LOOKS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS look_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    look_id INTEGER NOT NULL,

    product_id INTEGER NOT NULL,

    quantity INTEGER NOT NULL DEFAULT 1
      CHECK (
        typeof(quantity) = 'integer'
        AND quantity > 0
      ),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(sort_order) = 'integer'
        AND sort_order >= 0
      ),

    notes TEXT,

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (look_id, product_id),

    FOREIGN KEY (look_id)
      REFERENCES looks(id)
      ON DELETE CASCADE,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_look_items_product
    ON look_items(product_id);

  CREATE INDEX IF NOT EXISTS idx_look_items_look_sort
    ON look_items(look_id, sort_order);
`);

console.log("Tabela look_items verificada com sucesso!");

// ======================================================
// 110. OCASIÕES DOS LOOKS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS look_occasions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        length(trim(name)) > 0
        AND name = trim(name)
      ),

    slug TEXT NOT NULL COLLATE NOCASE UNIQUE
      CHECK (
        length(trim(slug)) > 0
        AND slug = trim(slug)
      ),

    description TEXT,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive')),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(sort_order) = 'integer'
        AND sort_order >= 0
      ),

    updated_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (updated_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_look_occasions_status_sort
    ON look_occasions(status, sort_order);
`);

console.log("Tabela look_occasions verificada com sucesso!");

// ======================================================
// 111. VÍNCULOS DOS LOOKS COM AS OCASIÕES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS look_occasion_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    look_id INTEGER NOT NULL,

    look_occasion_id INTEGER NOT NULL,

    created_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (look_id, look_occasion_id),

    FOREIGN KEY (look_id)
      REFERENCES looks(id)
      ON DELETE CASCADE,

    FOREIGN KEY (look_occasion_id)
      REFERENCES look_occasions(id)
      ON DELETE RESTRICT,

    FOREIGN KEY (created_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_look_occasion_links_occasion
    ON look_occasion_links(look_occasion_id);
`);

console.log("Tabela look_occasion_links verificada com sucesso!");

// ======================================================
// 112. IMAGENS DOS LOOKS
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS look_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    look_id INTEGER NOT NULL,

    file_name TEXT NOT NULL
      CHECK (length(trim(file_name)) > 0),

    storage_key TEXT NOT NULL UNIQUE
      CHECK (
        length(trim(storage_key)) > 0
        AND storage_key = trim(storage_key)
      ),

    mime_type TEXT NOT NULL
      CHECK (
        mime_type IN (
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/avif'
        )
      ),

    file_size_bytes INTEGER NOT NULL
      CHECK (
        typeof(file_size_bytes) = 'integer'
        AND file_size_bytes > 0
      ),

    alt_text TEXT NOT NULL
      CHECK (length(trim(alt_text)) > 0),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(sort_order) = 'integer'
        AND sort_order >= 0
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'archived')),

    uploaded_by INTEGER,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (look_id)
      REFERENCES looks(id)
      ON DELETE CASCADE,

    FOREIGN KEY (uploaded_by)
      REFERENCES admin_users(id)
      ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_look_media_look_status_sort
    ON look_media(look_id, status, sort_order);
`);

console.log("Tabela look_media verificada com sucesso!");

// ======================================================
// 113. LOOKS SALVOS PELOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_saved_looks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    look_id INTEGER NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (customer_id, look_id),

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE,

    FOREIGN KEY (look_id)
      REFERENCES looks(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_customer_saved_looks_look
    ON customer_saved_looks(look_id);
`);

console.log("Tabela customer_saved_looks verificada com sucesso!");

// ======================================================
// 114. COMBINAÇÕES CRIADAS PELOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_outfits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    title TEXT NOT NULL
      CHECK (length(trim(title)) > 0),

    notes TEXT,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'archived')),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_customer_outfits_customer_status
    ON customer_outfits(customer_id, status);
`);

console.log("Tabela customer_outfits verificada com sucesso!");

// ======================================================
// 115. PRODUTOS DAS COMBINAÇÕES DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_outfit_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_outfit_id INTEGER NOT NULL,

    product_id INTEGER NOT NULL,

    quantity INTEGER NOT NULL DEFAULT 1
      CHECK (
        typeof(quantity) = 'integer'
        AND quantity > 0
      ),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(sort_order) = 'integer'
        AND sort_order >= 0
      ),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (customer_outfit_id, product_id),

    FOREIGN KEY (customer_outfit_id)
      REFERENCES customer_outfits(id)
      ON DELETE CASCADE,

    FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_customer_outfit_items_product
    ON customer_outfit_items(product_id);

  CREATE INDEX IF NOT EXISTS idx_customer_outfit_items_outfit_sort
    ON customer_outfit_items(customer_outfit_id, sort_order);
`);

console.log("Tabela customer_outfit_items verificada com sucesso!");

// ======================================================
// 116. OCASIÕES DAS COMBINAÇÕES DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_outfit_occasions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_outfit_id INTEGER NOT NULL,

    look_occasion_id INTEGER NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (customer_outfit_id, look_occasion_id),

    FOREIGN KEY (customer_outfit_id)
      REFERENCES customer_outfits(id)
      ON DELETE CASCADE,

    FOREIGN KEY (look_occasion_id)
      REFERENCES look_occasions(id)
      ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_customer_outfit_occasions_occasion
    ON customer_outfit_occasions(look_occasion_id);
`);

console.log("Tabela customer_outfit_occasions verificada com sucesso!");

// ======================================================
// 117. PEÇAS DO GUARDA-ROUPA DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_wardrobe_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    title TEXT NOT NULL
      CHECK (length(trim(title)) > 0),

    description TEXT,

    color TEXT,

    size TEXT,

    brand TEXT,

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'archived')),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_customer_wardrobe_items_customer_status
    ON customer_wardrobe_items(customer_id, status);
`);

console.log("Tabela customer_wardrobe_items verificada com sucesso!");

// ======================================================
// 118. IMAGENS DAS PEÇAS DO GUARDA-ROUPA
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_wardrobe_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_wardrobe_item_id INTEGER NOT NULL,

    file_name TEXT NOT NULL
      CHECK (length(trim(file_name)) > 0),

    storage_key TEXT NOT NULL UNIQUE
      CHECK (
        length(trim(storage_key)) > 0
        AND storage_key = trim(storage_key)
      ),

    mime_type TEXT NOT NULL
      CHECK (
        mime_type IN (
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/avif'
        )
      ),

    file_size_bytes INTEGER NOT NULL
      CHECK (
        typeof(file_size_bytes) = 'integer'
        AND file_size_bytes > 0
      ),

    alt_text TEXT NOT NULL
      CHECK (length(trim(alt_text)) > 0),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(sort_order) = 'integer'
        AND sort_order >= 0
      ),

    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'archived')),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_wardrobe_item_id)
      REFERENCES customer_wardrobe_items(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_customer_wardrobe_media_item_status_sort
    ON customer_wardrobe_media(
      customer_wardrobe_item_id,
      status,
      sort_order
    );
`);

console.log("Tabela customer_wardrobe_media verificada com sucesso!");

// ======================================================
// 119. PEÇAS DO GUARDA-ROUPA NAS COMBINAÇÕES
// ======================================================

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_outfits_owner_id
    ON customer_outfits(customer_id, id);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_wardrobe_items_owner_id
    ON customer_wardrobe_items(customer_id, id);

  CREATE TABLE IF NOT EXISTS customer_outfit_wardrobe_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    customer_outfit_id INTEGER NOT NULL,

    customer_wardrobe_item_id INTEGER NOT NULL,

    quantity INTEGER NOT NULL DEFAULT 1
      CHECK (
        typeof(quantity) = 'integer'
        AND quantity > 0
      ),

    sort_order INTEGER NOT NULL DEFAULT 0
      CHECK (
        typeof(sort_order) = 'integer'
        AND sort_order >= 0
      ),

    notes TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (customer_outfit_id, customer_wardrobe_item_id),

    FOREIGN KEY (customer_id, customer_outfit_id)
      REFERENCES customer_outfits(customer_id, id)
      ON DELETE CASCADE,

    FOREIGN KEY (customer_id, customer_wardrobe_item_id)
      REFERENCES customer_wardrobe_items(customer_id, id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_outfit_wardrobe_items_owner_outfit_sort
    ON customer_outfit_wardrobe_items(
      customer_id,
      customer_outfit_id,
      sort_order
    );

  CREATE INDEX IF NOT EXISTS idx_outfit_wardrobe_items_owner_piece
    ON customer_outfit_wardrobe_items(
      customer_id,
      customer_wardrobe_item_id
    );
`);

console.log("Tabela customer_outfit_wardrobe_items verificada com sucesso!");

// ======================================================
// 120. PLANEJAMENTO DAS COMBINAÇÕES DOS CLIENTES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_outfit_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    customer_outfit_id INTEGER NOT NULL,

    planned_date TEXT NOT NULL
      CHECK (
        length(planned_date) = 10
        AND planned_date GLOB
          '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND date(planned_date, '+0 days') IS NOT NULL
        AND planned_date = date(planned_date, '+0 days')
      ),

    event_name TEXT
      CHECK (
        event_name IS NULL
        OR length(trim(event_name)) > 0
      ),

    notes TEXT,

    status TEXT NOT NULL DEFAULT 'planned'
      CHECK (status IN ('planned', 'worn', 'cancelled')),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id, customer_outfit_id)
      REFERENCES customer_outfits(customer_id, id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_customer_outfit_plans_customer_date
    ON customer_outfit_plans(customer_id, planned_date, status);

  CREATE INDEX IF NOT EXISTS idx_customer_outfit_plans_owner_outfit
    ON customer_outfit_plans(customer_id, customer_outfit_id);
`);

console.log("Tabela customer_outfit_plans verificada com sucesso!");