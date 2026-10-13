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

function falhar(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  throw erro;
}

function texto(valor, nome, limite, obrigatorio = false, multilinha = false) {
  if (valor === undefined || valor === null) {
    if (obrigatorio) {
      falhar(400, `Informe ${nome}.`);
    }
    return null;
  }

  if (typeof valor !== "string") {
    falhar(400, `Informe um valor válido para ${nome}.`);
  }

  const resultado = valor.trim();

  if (!resultado) {
    if (obrigatorio) {
      falhar(400, `Informe ${nome}.`);
    }
    return null;
  }

  const controleInvalido = Array.from(resultado).some((caractere) => {
    const codigo = caractere.charCodeAt(0);
    const permitido = multilinha && [9, 10, 13].includes(codigo);
    return codigo === 127 || (codigo < 32 && !permitido);
  });

  if (resultado.length > limite || controleInvalido) {
    falhar(400, `Confira ${nome}. Limite: ${limite} caracteres.`);
  }

  return resultado;
}

function idOpcional(valor, nome) {
  if (valor === undefined || valor === null) {
    return null;
  }

  if (!Number.isSafeInteger(valor) || valor < 1) {
    falhar(400, `Informe um identificador válido para ${nome}.`);
  }

  return valor;
}

router.get("/options", exigirPermissao("products.read"), (req, res) => {
  try {
    const consultar = db.transaction(() => ({
      categorias: db.prepare(`
        SELECT id, parent_id, name, slug
        FROM categories
        WHERE status = 'active'
        ORDER BY name, id
      `).all(),
      colecoes: db.prepare(`
        SELECT id, name, slug, status
        FROM collections
        WHERE status IN ('planning', 'active')
        ORDER BY name, id
      `).all(),
    }));

    res.json(consultar());
  } catch (erro) {
    console.error("Erro ao consultar opções de produtos:", erro);
    res.status(500).json({
      mensagem: "Não foi possível consultar categorias e coleções.",
    });
  }
});

router.post(
  "/",
  protegerAlteracao,
  exigirPermissao("products.create"),
  (req, res) => {
    try {
      const corpo = req.body;

      if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
        falhar(400, "Informe os dados do produto.");
      }

      const camposPermitidos = [
        "sku_base",
        "name",
        "slug",
        "brand",
        "category_id",
        "collection_id",
        "short_description",
        "description",
      ];

      if (
        Object.keys(corpo).some(
          (campo) => !camposPermitidos.includes(campo)
        )
      ) {
        falhar(400, "O cadastro contém campos não permitidos.");
      }

      const dados = {
        sku_base: texto(corpo.sku_base, "o código do produto", 100, true),
        name: texto(corpo.name, "o nome do produto", 120, true),
        slug: texto(corpo.slug, "o endereço do produto", 160, true),
        brand: texto(corpo.brand, "a marca", 100) || "Neumam Modas",
        category_id: idOpcional(corpo.category_id, "categoria"),
        collection_id: idOpcional(corpo.collection_id, "coleção"),
        short_description: texto(
          corpo.short_description,
          "a descrição curta",
          500
        ),
        description: texto(
          corpo.description,
          "a descrição",
          10000,
          false,
          true
        ),
      };

      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(dados.sku_base)) {
        falhar(
          400,
          "Use letras sem acentos, números, ponto, hífen ou sublinhado no código."
        );
      }

      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dados.slug)) {
        falhar(
          400,
          "Use letras minúsculas sem acentos, números e hífens no endereço."
        );
      }

      const criar = db.transaction(() => {
        if (
          dados.category_id !== null &&
          !db.prepare(`
            SELECT id FROM categories
            WHERE id = ? AND status = 'active'
          `).get(dados.category_id)
        ) {
          falhar(400, "A categoria selecionada não está disponível.");
        }

        if (
          dados.collection_id !== null &&
          !db.prepare(`
            SELECT id FROM collections
            WHERE id = ? AND status IN ('planning', 'active')
          `).get(dados.collection_id)
        ) {
          falhar(400, "A coleção selecionada não está disponível.");
        }

        if (
          db.prepare("SELECT id FROM products WHERE sku_base = ?")
            .get(dados.sku_base)
        ) {
          falhar(409, "Já existe um produto com esse código.");
        }

        if (
          db.prepare("SELECT id FROM products WHERE slug = ?")
            .get(dados.slug)
        ) {
          falhar(409, "Já existe um produto com esse endereço.");
        }

        const resultado = db.prepare(`
          INSERT INTO products (
            sku_base, name, slug, brand,
            category_id, collection_id,
            status, lifecycle_stage,
            short_description, description
          )
          VALUES (
            @sku_base, @name, @slug, @brand,
            @category_id, @collection_id,
            'draft', 'idea',
            @short_description, @description
          )
        `).run(dados);

        const id = Number(resultado.lastInsertRowid);

        if (!Number.isSafeInteger(id) || id < 1) {
          falhar(500, "Não foi possível identificar o produto criado.");
        }

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
          "products.create",
          "products",
          id,
          JSON.stringify({
            sku_base: dados.sku_base,
            name: dados.name,
            slug: dados.slug,
            status: "draft",
            lifecycle_stage: "idea",
            category_id: dados.category_id,
            collection_id: dados.collection_id,
          }),
          req.ip || null
        );

        return db.prepare(`
          SELECT
            id, sku_base, name, slug, brand,
            category_id, collection_id,
            status, lifecycle_stage,
            short_description, description,
            created_at, updated_at
          FROM products
          WHERE id = ?
        `).get(id);
      });

      const produto = criar.immediate();

      res.status(201).json({
        mensagem: "Produto cadastrado como rascunho.",
        produto,
      });
    } catch (erro) {
      if (erro.status && erro.status < 500) {
        return res.status(erro.status).json({
          mensagem: erro.message,
        });
      }

      console.error("Erro ao cadastrar produto:", erro);
      res.status(500).json({
        mensagem: "Não foi possível cadastrar o produto.",
      });
    }
  }
);

module.exports = router;