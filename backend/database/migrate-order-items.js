const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "neumam.db"), {
  fileMustExist: true,
});

try {
  db.pragma("foreign_keys = OFF");

  const migrar = db.transaction(() => {
    const colunas = db.pragma("table_info(order_items)")
      .map((coluna) => coluna.name);

    if (colunas.includes("unit_price_cents")) {
      throw new Error("A tabela já foi convertida.");
    }

    if (!colunas.includes("unit_price")) {
      throw new Error("A estrutura antiga não foi encontrada.");
    }

    const quantidade = db.prepare(
      "SELECT count(*) AS total FROM order_items"
    ).get().total;

    if (quantidade !== 0) {
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
          tbl_name = 'order_items'
          OR (
            type IN ('trigger', 'view')
            AND lower(sql) LIKE '%order_items%'
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
      path.join(__dirname, "init.js"),
      "utf8"
    );

    const definicao = conteudo.match(
      /CREATE TABLE IF NOT EXISTS order_items\s*\([\s\S]*?\);/
    );

    const campos = [
      "unit_price_cents",
      "discount_total_cents",
      "tax_total_cents",
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
    ).get("order_items")?.seq ?? 0;

    db.exec(definicao[0].replace(
      "CREATE TABLE IF NOT EXISTS order_items",
      "CREATE TABLE order_items_migracao"
    ));

    // Registro temporário para testar as regras.
    // Será removido antes da verificação das chaves estrangeiras.
    db.prepare(`
      INSERT INTO order_items_migracao (
        order_id, product_name, quantity,
        unit_price_cents, discount_total_cents,
        tax_total_cents, line_total_cents
      ) VALUES (1, ?, 2, 10000, 1000, 200, 19200)
    `).run("__teste_migracao_item__");

    function exigirRejeicao(sql, mensagem) {
      let rejeitou = false;

      try {
        db.prepare(sql).run();
      } catch (erro) {
        if (erro.code !== "SQLITE_CONSTRAINT_CHECK") throw erro;
        rejeitou = true;
      }

      if (!rejeitou) throw new Error(mensagem);
    }

    exigirRejeicao(
      "UPDATE order_items_migracao SET line_total_cents = 19201",
      "A regra de cálculo do total está ausente."
    );

    exigirRejeicao(
      `UPDATE order_items_migracao
       SET quantity = 1.5, line_total_cents = 14200`,
      "A regra de quantidade inteira está ausente."
    );

    exigirRejeicao(
      `UPDATE order_items_migracao
       SET discount_total_cents = 20001,
           tax_total_cents = 20002,
           line_total_cents = 20001`,
      "A regra que limita o desconto está ausente."
    );

    db.exec("DELETE FROM order_items_migracao");

    db.exec(`
      DROP TABLE order_items;
      ALTER TABLE order_items_migracao RENAME TO order_items;
    `);

    db.prepare(
      "UPDATE sqlite_sequence SET seq = ? WHERE name = ?"
    ).run(sequencia, "order_items");

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

  console.log("Migração de order_items concluída.");
  console.log("Itens cadastrados: 0.");
  console.log("Integridade e referências verificadas.");
  console.log("Regras de total, quantidade e desconto testadas.");
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