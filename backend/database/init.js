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

    cost_price REAL,
    sale_price REAL NOT NULL,
    promotional_price REAL,

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
      cost_price IS NULL
      OR cost_price >= 0
    ),

    CHECK (
      sale_price >= 0
    ),

    CHECK (
      promotional_price IS NULL
      OR promotional_price >= 0
    ),

    CHECK (
      promotional_price IS NULL
      OR promotional_price <= sale_price
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

    minimum_price REAL,
    target_margin_percent REAL,
    target_markup_percent REAL,
    commission_percent REAL NOT NULL DEFAULT 0,
    operational_cost REAL NOT NULL DEFAULT 0,
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
      minimum_price IS NULL
      OR minimum_price >= 0
    ),

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
      operational_cost >= 0
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

    supplier_cost REAL
      CHECK (
        supplier_cost IS NULL
        OR supplier_cost >= 0
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

    subtotal REAL NOT NULL DEFAULT 0
      CHECK (
        subtotal >= 0
      ),

    discount_total REAL NOT NULL DEFAULT 0
      CHECK (
        discount_total >= 0
      ),

    shipping_total REAL NOT NULL DEFAULT 0
      CHECK (
        shipping_total >= 0
      ),

    tax_total REAL NOT NULL DEFAULT 0
      CHECK (
        tax_total >= 0
      ),

    total REAL NOT NULL DEFAULT 0
      CHECK (
        total >= 0
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
      discount_total <= subtotal
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
        quantity > 0
      ),

    unit_price REAL NOT NULL
      CHECK (
        unit_price >= 0
      ),

    discount_total REAL NOT NULL DEFAULT 0
      CHECK (
        discount_total >= 0
      ),

    tax_total REAL NOT NULL DEFAULT 0
      CHECK (
        tax_total >= 0
      ),

    line_total REAL NOT NULL
      CHECK (
        line_total >= 0
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
      discount_total <= (unit_price * quantity)
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

    amount REAL NOT NULL
      CHECK (
        amount >= 0
      ),

    currency TEXT NOT NULL DEFAULT 'BRL',

    installments INTEGER NOT NULL DEFAULT 1
      CHECK (
        installments >= 1
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

    shipping_cost REAL NOT NULL DEFAULT 0
      CHECK (
        shipping_cost >= 0
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

    discount_value REAL NOT NULL DEFAULT 0
      CHECK (
        discount_value >= 0
      ),

    minimum_order_value REAL NOT NULL DEFAULT 0
      CHECK (
        minimum_order_value >= 0
      ),

    maximum_discount_value REAL
      CHECK (
        maximum_discount_value IS NULL
        OR maximum_discount_value >= 0
      ),

    usage_limit INTEGER
      CHECK (
        usage_limit IS NULL
        OR usage_limit >= 1
      ),

    usage_limit_per_customer INTEGER
      CHECK (
        usage_limit_per_customer IS NULL
        OR usage_limit_per_customer >= 1
      ),

    usage_count INTEGER NOT NULL DEFAULT 0
      CHECK (
        usage_count >= 0
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
      discount_type <> 'percentage'
      OR discount_value <= 100
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

    discount_value REAL NOT NULL DEFAULT 0
      CHECK (
        discount_value >= 0
      ),

    discount_amount REAL NOT NULL DEFAULT 0
      CHECK (
        discount_amount >= 0
      ),

    order_subtotal REAL NOT NULL DEFAULT 0
      CHECK (
        order_subtotal >= 0
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

    subtotal REAL NOT NULL DEFAULT 0
      CHECK (
        subtotal >= 0
      ),

    discount_total REAL NOT NULL DEFAULT 0
      CHECK (
        discount_total >= 0
      ),

    shipping_total REAL NOT NULL DEFAULT 0
      CHECK (
        shipping_total >= 0
      ),

    total REAL NOT NULL DEFAULT 0
      CHECK (
        total >= 0
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
      discount_total <= subtotal
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
        quantity >= 1
      ),

    unit_price REAL NOT NULL
      CHECK (
        unit_price >= 0
      ),

    discount_total REAL NOT NULL DEFAULT 0
      CHECK (
        discount_total >= 0
      ),

    line_total REAL NOT NULL
      CHECK (
        line_total >= 0
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
      discount_total <= (unit_price * quantity)
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