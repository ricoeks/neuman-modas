const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "neumam.db"), {
  fileMustExist: true,
});

try {
  db.pragma("foreign_keys = OFF");

  const migrar = db.transaction(() => {
    const colunas = db.pragma("table_info(cart_items)")
      .map((coluna) => coluna.name);

    if (colunas.includes("unit_price_cents")) {
      throw new Error("A tabela já foi convertida.");
    }

    if (!colunas.includes("unit_price")) {
      throw new Error("A estrutura antiga não foi encontrada.");
    }

    if (db.prepare("SELECT count(*) AS total FROM cart_items").get().total !== 0) {
      throw new Error("Existem itens cadastrados. Esta migração exige a tabela vazia.");
    }

    if (db.pragma("foreign_key_check").length) {
      throw new Error("Existem violações de chave estrangeira antes da migração.");
    }

    const dependencias = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type IN ('index', 'trigger', 'view')
        AND sql IS NOT NULL
        AND (
          tbl_name = 'cart_items'
          OR (
            type IN ('trigger', 'view')
            AND lower(sql) LIKE '%cart_items%'
          )
        )
    `).all();

    if (dependencias.length) {
      throw new Error(
        "Dependências precisam de revisão: " +
        dependencias.map((item) => item.name).join(", ")
      );
    }

    const conteudo = fs.readFileSync(
      path.join(__dirname, "init.js"), "utf8"
    );

    const definicao = conteudo.match(
      /CREATE TABLE IF NOT EXISTS cart_items\s*\([\s\S]*?\);/
    );

    const campos = [
      "unit_price_cents",
      "discount_total_cents",
      "line_total_cents",
    ];

    if (
      !definicao ||
      !campos.every((campo) => definicao[0].includes(campo))
    ) {
      throw new Error("A definição em centavos não foi encontrada no init.js.");
    }

    const sequencia = db.prepare(
      "SELECT seq FROM sqlite_sequence WHERE name = ?"
    ).get("cart_items")?.seq ?? 0;

    db.exec(definicao[0].replace(
      "CREATE TABLE IF NOT EXISTS cart_items",
      "CREATE TABLE cart_items_migracao"
    ));

    // Registro temporário, removido antes da conferência das referências.
    db.exec(`
      INSERT INTO cart_items_migracao (
        cart_id, product_id, variant_id, product_name, variant_sku,
        quantity, unit_price_cents, discount_total_cents, line_total_cents
      ) VALUES (
        1, 1, 1, '__TESTE_ITEM__', '__TESTE_SKU__',
        2, 10000, 1000, 19000
      );
    `);

    function exigirRejeicao(sql, codigo, mensagem) {
      let rejeitou = false;

      try {
        db.prepare(sql).run();
      } catch (erro) {
        if (erro.code !== codigo) throw erro;
        rejeitou = true;
      }

      if (!rejeitou) throw new Error(mensagem);
    }

    const check = "SQLITE_CONSTRAINT_CHECK";

    exigirRejeicao(
      "UPDATE cart_items_migracao SET line_total_cents = 19001",
      check,
      "A regra de cálculo do total está ausente."
    );

    exigirRejeicao(
      `UPDATE cart_items_migracao
       SET quantity = 1.5, line_total_cents = 14000`,
      check,
      "A regra de quantidade inteira está ausente."
    );

    exigirRejeicao(
      `UPDATE cart_items_migracao
       SET quantity = 0, discount_total_cents = 0, line_total_cents = 0`,
      check,
      "A regra de quantidade mínima está ausente."
    );

    exigirRejeicao(
      `UPDATE cart_items_migracao
       SET unit_price_cents = 10000.5, line_total_cents = 19001`,
      check,
      "A regra de preço em centavos inteiros está ausente."
    );

    exigirRejeicao(
      `UPDATE cart_items_migracao
       SET discount_total_cents = -1, line_total_cents = 20001`,
      check,
      "A regra de desconto não negativo está ausente."
    );

    exigirRejeicao(
      `UPDATE cart_items_migracao
       SET discount_total_cents = 20001, line_total_cents = 0`,
      check,
      "Um desconto superior ao valor dos produtos deveria ser rejeitado."
    );

    exigirRejeicao(
      `INSERT INTO cart_items_migracao (
        cart_id, product_id, variant_id, product_name, variant_sku,
        quantity, unit_price_cents, line_total_cents
      ) VALUES (1, 1, 1, '__TESTE_DUPLICADO__', '__TESTE_SKU__', 1, 10000, 10000)`,
      "SQLITE_CONSTRAINT_UNIQUE",
      "A regra UNIQUE do carrinho e variante está ausente."
    );

    // Confirma que um desconto integral resulta em total zero.
    db.exec(`
      UPDATE cart_items_migracao
      SET discount_total_cents = 20000, line_total_cents = 0;

      DELETE FROM cart_items_migracao;
      DROP TABLE cart_items;
      ALTER TABLE cart_items_migracao RENAME TO cart_items;
    `);

    db.prepare(
      "UPDATE sqlite_sequence SET seq = ? WHERE name = ?"
    ).run(sequencia, "cart_items");

    if (db.pragma("foreign_key_check").length) {
      throw new Error("Foi encontrada uma violação de chave estrangeira.");
    }

    const integridade = db.pragma("integrity_check");

    if (
      integridade.length !== 1 ||
      integridade[0].integrity_check !== "ok"
    ) {
      throw new Error("A verificação de integridade falhou.");
    }

    const totalTabelas = db.prepare(`
      SELECT count(*) AS total FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).get().total;

    if (totalTabelas !== 120) {
      throw new Error(`Quantidade inesperada de tabelas: ${totalTabelas}`);
    }
  });

  migrar.immediate();
  db.pragma("foreign_keys = ON");

  console.log("Migração de cart_items concluída.");
  console.log("Itens do carrinho cadastrados: 0.");
  console.log("Integridade e referências verificadas.");
  console.log("Regras de valores, quantidade, total e vínculo único testadas.");
  console.log("Total de tabelas: 120.");
  console.log(
    "Chaves estrangeiras:",
    db.pragma("foreign_keys", { simple: true })
  );
} catch (erro) {
  console.error("Migração não aplicada:", erro.message);
  process.exitCode = 1;
} finally {
  if (db.open) {
    db.pragma("foreign_keys = ON");
    db.close();
  }
}