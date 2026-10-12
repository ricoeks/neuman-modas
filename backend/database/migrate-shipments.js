const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "neumam.db"), {
  fileMustExist: true,
});

try {
  db.pragma("foreign_keys = OFF");

  const migrar = db.transaction(() => {
    const colunas = db.pragma("table_info(shipments)")
      .map((coluna) => coluna.name);

    if (colunas.includes("shipping_cost_cents")) {
      throw new Error("A tabela já foi convertida.");
    }

    if (!colunas.includes("shipping_cost")) {
      throw new Error("A estrutura antiga não foi encontrada.");
    }

    const quantidade = db.prepare(
      "SELECT count(*) AS total FROM shipments"
    ).get().total;

    if (quantidade !== 0) {
      throw new Error("Existem entregas cadastradas. Esta migração exige a tabela vazia.");
    }

    if (db.pragma("foreign_key_check").length) {
      throw new Error("Existem violações de chave estrangeira antes da migração.");
    }

    const dependencias = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type IN ('index', 'trigger', 'view')
        AND sql IS NOT NULL
        AND (
          tbl_name = 'shipments'
          OR (
            type IN ('trigger', 'view')
            AND lower(sql) LIKE '%shipments%'
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
      /CREATE TABLE IF NOT EXISTS shipments\s*\([\s\S]*?\);/
    );

    if (!definicao || !definicao[0].includes("shipping_cost_cents")) {
      throw new Error("A definição em centavos não foi encontrada no init.js.");
    }

    const sequencia = db.prepare(
      "SELECT seq FROM sqlite_sequence WHERE name = ?"
    ).get("shipments")?.seq ?? 0;

    db.exec(definicao[0].replace(
      "CREATE TABLE IF NOT EXISTS shipments",
      "CREATE TABLE shipments_migracao"
    ));

    // Registro temporário, removido antes da conferência das referências.
    db.exec(`
      INSERT INTO shipments_migracao (
        order_id, shipping_cost_cents
      ) VALUES (1, 1500);
    `);

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
      "UPDATE shipments_migracao SET shipping_cost_cents = 1500.5",
      "A regra de centavos inteiros está ausente."
    );

    exigirRejeicao(
      "UPDATE shipments_migracao SET shipping_cost_cents = -1",
      "A regra de custo não negativo está ausente."
    );

    // Confirma que uma entrega sem custo também é aceita.
    db.exec(`
      UPDATE shipments_migracao SET shipping_cost_cents = 0;
      DELETE FROM shipments_migracao;
    `);

    db.exec(`
      DROP TABLE shipments;
      ALTER TABLE shipments_migracao RENAME TO shipments;
    `);

    db.prepare(
      "UPDATE sqlite_sequence SET seq = ? WHERE name = ?"
    ).run(sequencia, "shipments");

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

  console.log("Migração de shipments concluída.");
  console.log("Entregas cadastradas: 0.");
  console.log("Integridade e referências verificadas.");
  console.log("Regras do custo de entrega testadas.");
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