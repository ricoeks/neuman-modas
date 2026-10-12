const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "neumam.db"), {
  fileMustExist: true,
});

try {
  // Necessário para reconstruir uma tabela referenciada por outras.
  // A alteração vale somente para esta conexão.
  db.pragma("foreign_keys = OFF");

  const migrar = db.transaction(() => {
    const colunas = db.pragma("table_info(orders)")
      .map((coluna) => coluna.name);

    if (colunas.includes("total_cents")) {
      throw new Error("A tabela já foi convertida.");
    }

    if (!colunas.includes("total")) {
      throw new Error("A estrutura antiga de orders não foi encontrada.");
    }

    const quantidade = db.prepare(
      "SELECT count(*) AS total FROM orders"
    ).get().total;

    if (quantidade !== 0) {
      throw new Error("Existem pedidos cadastrados. Esta migração exige orders vazia.");
    }

    if (db.pragma("foreign_key_check").length) {
      throw new Error("Existem violações de chave estrangeira antes da migração.");
    }

    const dependencias = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type IN ('index', 'trigger', 'view')
        AND sql IS NOT NULL
        AND (
          tbl_name = 'orders'
          OR (
  type IN ('trigger', 'view')
  AND lower(sql) LIKE '%orders%'
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
      /CREATE TABLE IF NOT EXISTS orders\s*\([\s\S]*?\);/
    );

    const campos = [
      "subtotal_cents",
      "discount_total_cents",
      "shipping_total_cents",
      "tax_total_cents",
      "total_cents",
    ];

    if (
      !definicao ||
      !campos.every((campo) => definicao[0].includes(campo))
    ) {
      throw new Error("A definição em centavos não foi encontrada no init.js.");
    }

    const sequencia = db.prepare(
      "SELECT seq FROM sqlite_sequence WHERE name = ?"
    ).get("orders")?.seq ?? 0;

    db.exec(definicao[0].replace(
      "CREATE TABLE IF NOT EXISTS orders",
      "CREATE TABLE orders_migracao"
    ));

    // Valida a fórmula antes de substituir a tabela original.
    db.prepare(`
      INSERT INTO orders_migracao (
        order_number, subtotal_cents, discount_total_cents,
        shipping_total_cents, tax_total_cents, total_cents
      ) VALUES (?, 10000, 1000, 500, 200, 9700)
    `).run("__teste_migracao_orders__");

    let rejeitouTotalIncorreto = false;

    try {
      db.prepare(`
        UPDATE orders_migracao
        SET total_cents = 9701
        WHERE order_number = ?
      `).run("__teste_migracao_orders__");
    } catch (erro) {
      if (erro.code !== "SQLITE_CONSTRAINT_CHECK") throw erro;
      rejeitouTotalIncorreto = true;
    }

    if (!rejeitouTotalIncorreto) {
      throw new Error("A regra de conferência do total está ausente.");
    }

    db.prepare(
      "DELETE FROM orders_migracao WHERE order_number = ?"
    ).run("__teste_migracao_orders__");

    db.exec(`
      DROP TABLE orders;
      ALTER TABLE orders_migracao RENAME TO orders;
    `);

    // Restaura o contador anterior, sem consumir o ID do teste.
    db.prepare(
      "UPDATE sqlite_sequence SET seq = ? WHERE name = ?"
    ).run(sequencia, "orders");

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

  console.log("Migração de orders concluída.");
  console.log("Pedidos cadastrados: 0.");
  console.log("Integridade e referências verificadas.");
  console.log("Regra do total testada.");
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