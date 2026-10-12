const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "neumam.db"), {
  fileMustExist: true,
});

try {
  db.pragma("foreign_keys = OFF");

  const migrar = db.transaction(() => {
    const colunas = db.pragma("table_info(carts)")
      .map((coluna) => coluna.name);

    if (colunas.includes("total_cents")) {
      throw new Error("A tabela já foi convertida.");
    }

    if (!colunas.includes("total")) {
      throw new Error("A estrutura antiga não foi encontrada.");
    }

    if (db.prepare("SELECT count(*) AS total FROM carts").get().total !== 0) {
      throw new Error("Existem carrinhos cadastrados. Esta migração exige a tabela vazia.");
    }

    if (db.pragma("foreign_key_check").length) {
      throw new Error("Existem violações de chave estrangeira antes da migração.");
    }

    const dependencias = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type IN ('index', 'trigger', 'view')
        AND sql IS NOT NULL
        AND (
          tbl_name = 'carts'
          OR (
            type IN ('trigger', 'view')
            AND lower(sql) LIKE '%carts%'
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
      /CREATE TABLE IF NOT EXISTS carts\s*\([\s\S]*?\);/
    );

    const campos = [
      "subtotal_cents",
      "discount_total_cents",
      "shipping_total_cents",
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
    ).get("carts")?.seq ?? 0;

    db.exec(definicao[0].replace(
      "CREATE TABLE IF NOT EXISTS carts",
      "CREATE TABLE carts_migracao"
    ));

    db.exec(`
      INSERT INTO carts_migracao (
        session_token, subtotal_cents, discount_total_cents,
        shipping_total_cents, total_cents
      ) VALUES ('__TESTE_CARRINHO__', 10000, 1000, 500, 9500);
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
      "UPDATE carts_migracao SET total_cents = 9501",
      check,
      "A regra de cálculo do total está ausente."
    );

    exigirRejeicao(
      `UPDATE carts_migracao
       SET subtotal_cents = 10000.5, total_cents = 9500.5`,
      check,
      "A regra de centavos inteiros está ausente."
    );

    exigirRejeicao(
      `UPDATE carts_migracao
       SET discount_total_cents = 10001,
           shipping_total_cents = 10002,
           total_cents = 10001`,
      check,
      "O desconto não deve superar o subtotal."
    );

    exigirRejeicao(
      "UPDATE carts_migracao SET session_token = NULL",
      check,
      "A identificação por cliente ou sessão está ausente."
    );

    exigirRejeicao(
      `INSERT INTO carts_migracao (session_token)
       VALUES ('__TESTE_CARRINHO__')`,
      "SQLITE_CONSTRAINT_UNIQUE",
      "A regra de sessão única está ausente."
    );

    // Confirma que um carrinho vazio com sessão é permitido.
    db.exec(`
      INSERT INTO carts_migracao (session_token)
      VALUES ('__TESTE_CARRINHO_VAZIO__');

      DELETE FROM carts_migracao;
      DROP TABLE carts;
      ALTER TABLE carts_migracao RENAME TO carts;
    `);

    db.prepare(
      "UPDATE sqlite_sequence SET seq = ? WHERE name = ?"
    ).run(sequencia, "carts");

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

  console.log("Migração de carts concluída.");
  console.log("Carrinhos cadastrados: 0.");
  console.log("Integridade e referências verificadas.");
  console.log("Regras de valores, total e identificação testadas.");
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