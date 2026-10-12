const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "neumam.db"), {
  fileMustExist: true,
});

try {
  db.pragma("foreign_keys = OFF");

  const migrar = db.transaction(() => {
    const colunas = db.pragma("table_info(coupon_usages)")
      .map((coluna) => coluna.name);

    if (colunas.includes("discount_amount_cents")) {
      throw new Error("A tabela já foi convertida.");
    }

    if (!colunas.includes("discount_amount")) {
      throw new Error("A estrutura antiga não foi encontrada.");
    }

    const quantidade = db.prepare(
      "SELECT count(*) AS total FROM coupon_usages"
    ).get().total;

    if (quantidade !== 0) {
      throw new Error("Existem usos cadastrados. Esta migração exige a tabela vazia.");
    }

    if (db.pragma("foreign_key_check").length) {
      throw new Error("Existem violações de chave estrangeira antes da migração.");
    }

    const dependencias = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type IN ('index', 'trigger', 'view')
        AND sql IS NOT NULL
        AND (
          tbl_name = 'coupon_usages'
          OR (
            type IN ('trigger', 'view')
            AND lower(sql) LIKE '%coupon_usages%'
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
      /CREATE TABLE IF NOT EXISTS coupon_usages\s*\([\s\S]*?\);/
    );

    const campos = [
      "discount_percent",
      "discount_value_cents",
      "discount_amount_cents",
      "order_subtotal_cents",
    ];

    if (
      !definicao ||
      !campos.every((campo) => definicao[0].includes(campo))
    ) {
      throw new Error("A nova definição não foi encontrada no init.js.");
    }

    const sequencia = db.prepare(
      "SELECT seq FROM sqlite_sequence WHERE name = ?"
    ).get("coupon_usages")?.seq ?? 0;

    db.exec(definicao[0].replace(
      "CREATE TABLE IF NOT EXISTS coupon_usages",
      "CREATE TABLE coupon_usages_migracao"
    ));

    // Registros temporários para testar os três tipos.
    db.exec(`
      INSERT INTO coupon_usages_migracao (
        coupon_id, order_id, coupon_code, discount_type,
        discount_percent, discount_amount_cents, order_subtotal_cents
      ) VALUES (1, 1, '__TESTE_PERCENTUAL__', 'percentage', 10, 1000, 10000);

      INSERT INTO coupon_usages_migracao (
        coupon_id, order_id, coupon_code, discount_type,
        discount_value_cents, discount_amount_cents, order_subtotal_cents
      ) VALUES (2, 1, '__TESTE_FIXO__', 'fixed_amount', 1000, 1000, 10000);

      INSERT INTO coupon_usages_migracao (
        coupon_id, order_id, coupon_code, discount_type,
        discount_amount_cents, order_subtotal_cents
      ) VALUES (3, 1, '__TESTE_FRETE__', 'free_shipping', 1500, 1000);
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
      `UPDATE coupon_usages_migracao SET discount_percent = 101
       WHERE coupon_id = 1`,
      check,
      "A regra de percentual máximo está ausente."
    );

    exigirRejeicao(
      `UPDATE coupon_usages_migracao SET discount_percent = NULL
       WHERE coupon_id = 1`,
      check,
      "O percentual deveria ser obrigatório nesse tipo."
    );

    exigirRejeicao(
      `UPDATE coupon_usages_migracao SET discount_value_cents = 1000.5
       WHERE coupon_id = 2`,
      check,
      "A regra de valor nominal em centavos inteiros está ausente."
    );

    exigirRejeicao(
      `UPDATE coupon_usages_migracao SET discount_amount_cents = 1000.5
       WHERE coupon_id = 2`,
      check,
      "A regra de desconto aplicado em centavos inteiros está ausente."
    );

    exigirRejeicao(
      `UPDATE coupon_usages_migracao SET discount_amount_cents = -1
       WHERE coupon_id = 2`,
      check,
      "A regra de desconto não negativo está ausente."
    );

    exigirRejeicao(
      `UPDATE coupon_usages_migracao SET discount_amount_cents = 10001
       WHERE coupon_id = 2`,
      check,
      "O desconto nos produtos não deve superar o subtotal."
    );

    exigirRejeicao(
      `UPDATE coupon_usages_migracao SET discount_value_cents = 100
       WHERE coupon_id = 3`,
      check,
      "Frete grátis não deve aceitar valor nominal de desconto fixo."
    );

    exigirRejeicao(
      `INSERT INTO coupon_usages_migracao (
        coupon_id, order_id, coupon_code, discount_type,
        discount_percent
      ) VALUES (1, 1, '__TESTE_DUPLICADO__', 'percentage', 10)`,
      "SQLITE_CONSTRAINT_UNIQUE",
      "A regra UNIQUE do cupom e pedido está ausente."
    );

    db.exec(`
      DELETE FROM coupon_usages_migracao;
      DROP TABLE coupon_usages;
      ALTER TABLE coupon_usages_migracao RENAME TO coupon_usages;
    `);

    db.prepare(
      "UPDATE sqlite_sequence SET seq = ? WHERE name = ?"
    ).run(sequencia, "coupon_usages");

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

  console.log("Migração de coupon_usages concluída.");
  console.log("Usos de cupons cadastrados: 0.");
  console.log("Integridade e referências verificadas.");
  console.log("Tipos de desconto, valores e vínculo único testados.");
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