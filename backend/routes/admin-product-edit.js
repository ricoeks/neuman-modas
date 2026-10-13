const express = require("express");
const { createHash } = require("node:crypto");
const db = require("../database/connection");
const {
  exigirAdmin,
  exigirPermissao,
  protegerAlteracao,
} = require("./admin-auth");

const router = express.Router();

const camposEditaveis = [
  "sku_base",
  "name",
  "slug",
  "brand",
  "category_id",
  "collection_id",
  "short_description",
  "description",
];

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

function responderErro(res, erro) {
  if (erro.status && erro.status < 500) {
    return res.status(erro.status).json({ mensagem: erro.message });
  }

  console.error("Erro ao consultar ou editar produto:", erro);
  return res.status(500).json({
    mensagem: "Não foi possível concluir a operação do produto.",
  });
}

function validarId(valor) {
  if (typeof valor !== "string" || !/^[1-9]\d*$/.test(valor)) {
    falhar(400, "Informe um produto válido.");
  }

  const id = Number(valor);

  if (!Number.isSafeInteger(id)) {
    falhar(400, "Informe um produto válido.");
  }

  return id;
}

function consultarProduto(id) {
  const produto = db.prepare(`
    SELECT
      id, sku_base, name, slug, brand,
      category_id, collection_id,
      status, lifecycle_stage,
      short_description, description,
      created_at, updated_at
    FROM products
    WHERE id = ?
  `).get(id);

  if (!produto) {
    falhar(404, "Produto não encontrado.");
  }

  return produto;
}

function versaoProduto(produto) {
  return createHash("sha256")
    .update(JSON.stringify(produto))
    .digest("hex");
}

function texto(valor, nome, limite, obrigatorio = false, multilinha = false) {
  if (valor === null && !obrigatorio) {
    return null;
  }

  if (typeof valor !== "string") {
    falhar(400, `Confira ${nome}.`);
  }

  const resultado = valor.trim();

  if (!resultado) {
    if (obrigatorio) falhar(400, `Informe ${nome}.`);
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
  if (valor === null) return null;

  if (!Number.isSafeInteger(valor) || valor < 1) {
    falhar(400, `Informe um identificador válido para ${nome}.`);
  }

  return valor;
}

router.get("/:id", exigirPermissao("products.read"), (req, res) => {
  try {
    const produto = consultarProduto(validarId(req.params.id));

    res.json({
      produto,
      version: versaoProduto(produto),
    });
  } catch (erro) {
    responderErro(res, erro);
  }
});

router.patch(
  "/:id",
  protegerAlteracao,
  exigirPermissao("products.update"),
  (req, res) => {
    try {
      const id = validarId(req.params.id);
      const corpo = req.body;

      if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
        falhar(400, "Informe os dados da alteração.");
      }

      if (
        typeof corpo.version !== "string" ||
        !/^[a-f0-9]{64}$/.test(corpo.version)
      ) {
        falhar(400, "Carregue o produto antes de editar.");
      }

      if (
        Object.keys(corpo).some(
          (campo) => campo !== "version" && !camposEditaveis.includes(campo)
        )
      ) {
        falhar(400, "A alteração contém campos não permitidos.");
      }

      const informados = camposEditaveis.filter(
        (campo) => Object.hasOwn(corpo, campo)
      );

      if (informados.length === 0) {
        falhar(400, "Informe pelo menos um campo para editar.");
      }

      const dados = {};

      for (const campo of informados) {
        switch (campo) {
          case "sku_base":
            dados[campo] = texto(corpo[campo], "o código", 100, true);
            if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(dados[campo])) {
              falhar(400, "Use letras sem acentos, números, ponto, hífen ou sublinhado no código.");
            }
            break;

          case "name":
            dados[campo] = texto(corpo[campo], "o nome", 120, true);
            break;

          case "slug":
            dados[campo] = texto(corpo[campo], "o endereço", 160, true);
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dados[campo])) {
              falhar(400, "Use letras minúsculas sem acentos, números e hífens no endereço.");
            }
            break;

          case "brand":
            dados[campo] = texto(corpo[campo], "a marca", 100, true);
            break;

          case "category_id":
            dados[campo] = idOpcional(corpo[campo], "categoria");
            break;

          case "collection_id":
            dados[campo] = idOpcional(corpo[campo], "coleção");
            break;

          case "short_description":
            dados[campo] = texto(corpo[campo], "a descrição curta", 500);
            break;

          case "description":
            dados[campo] = texto(corpo[campo], "a descrição", 10000, false, true);
            break;
        }
      }

      const editar = db.transaction(() => {
        const anterior = consultarProduto(id);

        if (versaoProduto(anterior) !== corpo.version) {
          falhar(
            409,
            "O produto foi alterado desde a consulta. Recarregue os dados antes de salvar."
          );
        }

        const proximo = { ...anterior, ...dados };

        if (
          proximo.category_id !== anterior.category_id &&
          proximo.category_id !== null &&
          !db.prepare(`
            SELECT id FROM categories
            WHERE id = ? AND status = 'active'
          `).get(proximo.category_id)
        ) {
          falhar(400, "A categoria selecionada não está disponível.");
        }

        if (
          proximo.collection_id !== anterior.collection_id &&
          proximo.collection_id !== null &&
          !db.prepare(`
            SELECT id FROM collections
            WHERE id = ? AND status IN ('planning', 'active')
          `).get(proximo.collection_id)
        ) {
          falhar(400, "A coleção selecionada não está disponível.");
        }

        if (
          db.prepare(`
            SELECT id FROM products WHERE sku_base = ? AND id <> ?
          `).get(proximo.sku_base, id)
        ) {
          falhar(409, "Já existe outro produto com esse código.");
        }

        if (
          db.prepare(`
            SELECT id FROM products WHERE slug = ? AND id <> ?
          `).get(proximo.slug, id)
        ) {
          falhar(409, "Já existe outro produto com esse endereço.");
        }

        const alterados = informados.filter(
          (campo) => anterior[campo] !== proximo[campo]
        );

        if (alterados.length === 0) {
          return {
            mensagem: "Nenhuma alteração necessária.",
            produto: anterior,
            version: versaoProduto(anterior),
          };
        }

        db.prepare(`
          UPDATE products
          SET
            sku_base = @sku_base,
            name = @name,
            slug = @slug,
            brand = @brand,
            category_id = @category_id,
            collection_id = @collection_id,
            short_description = @short_description,
            description = @description,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = @id
        `).run({
          id,
          sku_base: proximo.sku_base,
          name: proximo.name,
          slug: proximo.slug,
          brand: proximo.brand,
          category_id: proximo.category_id,
          collection_id: proximo.collection_id,
          short_description: proximo.short_description,
          description: proximo.description,
        });

        const mudancas = Object.fromEntries(
          alterados.map((campo) => [
            campo,
            { before: anterior[campo], after: proximo[campo] },
          ])
        );

        db.prepare(`
          INSERT INTO admin_audit_logs (
            admin_user_id, actor_name, action,
            entity_type, entity_id, description, ip_address
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.admin.id,
          req.admin.name,
          "products.update",
          "products",
          id,
          JSON.stringify({ changes: mudancas }),
          req.ip || null
        );

        const produto = consultarProduto(id);

        return {
          mensagem: "Dados do produto atualizados.",
          produto,
          version: versaoProduto(produto),
        };
      });

      res.json(editar.immediate());
    } catch (erro) {
      responderErro(res, erro);
    }
  }
);

module.exports = router;