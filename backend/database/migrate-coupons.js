const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "neumam.db"), {
  fileMustExist: true,
});

try {
  db.pragma("foreign_keys = OFF");

  const migrar = db.transaction(() => {
    const colunas = db.pragma("table_info(coupons)")
      .map((coluna) => coluna.name);

    if (colunas.includes("discount_amount_cents")) {
      throw new Error("A tabela já foi convertida.");
    }

    if (!colunas.includes("discount_value")) {
      throw new Error("A estrutura antiga não foi encontrada.");
    }

    if (db.prepare("SELECT count(*) AS total FROM coupons").get().total !== 0) {
      throw new Error("Existem cupons cadastrados. Esta migração exige a tabela vazia.");
    }

    if (db.pragma("foreign_key_check").length) {
      throw new Error("Existem violações de chave estrangeira antes da migração.");
    }

    const dependencias = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type IN ('index', 'trigger', 'view')
        AND sql IS NOT NULL
        AND (
          tbl_name = 'coupons'
          OR (
            type IN ('trigger', 'view')
            AND lower(sql) LIKE '%coupons%'
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
      /CREATE TABLE IF NOT EXISTS coupons\s*\([\s\S]*?\);/
    );

    const campos = [
      "discount_percent",
      "discount_amount_cents",
      "minimum_order_value_cents",
      "maximum_discount_value_cents",
    ];

    if (
      !definicao ||
      !campos.every((campo) => definicao[0].includes(campo))
    ) {
      throw new Error("A nova definição não foi encontrada no init.js.");
    }

    const sequencia = db.prepare(
      "SELECT seq FROM sqlite_sequence WHERE name = ?"
    ).get("coupons")?.seq ?? 0;

    db.exec(definicao[0].replace(
      "CREATE TABLE IF NOT EXISTS coupons",
      "CREATE TABLE coupons_migracao"
    ));

    // Testa os três tipos permitidos.
    db.exec(`
      INSERT INTO coupons_migracao (
        code, discount_type, discount_percent
      ) VALUES ('__TESTE_PERCENTUAL__', 'percentage', 10);

      INSERT INTO coupons_migracao (
        code, discount_type, discount_amount_cents
      ) VALUES ('__TESTE_FIXO__', 'fixed_amount', 1000);

      INSERT INTO coupons_migracao (
        code, discount_type
      ) VALUES ('__TESTE_FRETE__', 'free_shipping');
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
      `UPDATE coupons_migracao SET discount_percent = 101
       WHERE code = '__TESTE_PERCENTUAL__'`,
      check,
      "A regra de percentual máximo está ausente."
    );

    exigirRejeicao(
      `UPDATE coupons_migracao SET discount_percent = NULL
       WHERE code = '__TESTE_PERCENTUAL__'`,
      check,
      "O percentual deveria ser obrigatório nesse tipo."
    );

    exigirRejeicao(
      `UPDATE coupons_migracao SET discount_amount_cents = 1000.5
       WHERE code = '__TESTE_FIXO__'`,
      check,
      "A regra de centavos inteiros está ausente."
    );

    exigirRejeicao(
      `UPDATE coupons_migracao SET discount_amount_cents = -1
       WHERE code = '__TESTE_FIXO__'`,
      check,
      "A regra de desconto não negativo está ausente."
    );

    exigirRejeicao(
      `UPDATE coupons_migracao SET discount_percent = 10
       WHERE code = '__TESTE_FIXO__'`,
      check,
      "Um cupom fixo não deve aceitar percentual."
    );

    exigirRejeicao(
      `UPDATE coupons_migracao SET discount_amount_cents = 100
       WHERE code = '__TESTE_FRETE__'`,
      check,
      "Um cupom de frete grátis não deve aceitar desconto fixo."
    );

    exigirRejeicao(
      `UPDATE coupons_migracao SET usage_count = 1.5
       WHERE code = '__TESTE_FRETE__'`,
      check,
      "A regra de contador inteiro está ausente."
    );

    exigirRejeicao(
      `INSERT INTO coupons_migracao (code, discount_type)
       VALUES ('__TESTE_FRETE__', 'free_shipping')`,
      "SQLITE_CONSTRAINT_UNIQUE",
      "A regra de código único está ausente."
    );

    db.exec(`
      DELETE FROM coupons_migracao;
      DROP TABLE coupons;
      ALTER TABLE coupons_migracao RENAME TO coupons;
    `);

    db.prepare(
      "UPDATE sqlite_sequence SET seq = ? WHERE name = ?"
    ).run(sequencia, "coupons");

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

  console.log("Migração de coupons concluída.");
  console.log("Cupons cadastrados: 0.");
  console.log("Integridade e referências verificadas.");
  console.log("Tipos de desconto e código único testados.");
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