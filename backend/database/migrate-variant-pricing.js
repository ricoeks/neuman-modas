const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "neumam.db"), {
  fileMustExist: true,
});

db.pragma("foreign_keys = ON");

try {
  const migrar = db.transaction(() => {
    const colunas = db.pragma("table_info(variant_pricing)")
      .map((coluna) => coluna.name);

    if (colunas.includes("sale_price_cents")) {
      throw new Error("A tabela já foi convertida. Migração interrompida.");
    }

    // Interrompe se houver dependências que precisem de outro tratamento.
    const tabelas = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).all();

    for (const tabela of tabelas) {
      const nome = tabela.name.replace(/"/g, '""');
      const referencias = db.prepare(
        `PRAGMA foreign_key_list("${nome}")`
      ).all();

      if (referencias.some((fk) => fk.table === "variant_pricing")) {
        throw new Error(`Existe uma referência em ${tabela.name}.`);
      }
    }

    const dependencias = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type IN ('index', 'trigger', 'view')
        AND (
          tbl_name = 'variant_pricing'
          OR lower(sql) LIKE '%variant_pricing%'
        )
    `).all();

    if (dependencias.length) {
      throw new Error("Existem índices, gatilhos ou views a revisar.");
    }

    const conteudo = fs.readFileSync(
      path.join(__dirname, "init.js"),
      "utf8"
    );

    const definicao = conteudo.match(
      /CREATE TABLE IF NOT EXISTS variant_pricing\s*\([\s\S]*?\);/
    );

    if (!definicao || !definicao[0].includes("sale_price_cents")) {
      throw new Error("A definição em centavos não foi encontrada no init.js.");
    }

    const antigos = db.prepare(
      "SELECT * FROM variant_pricing ORDER BY id"
    ).all();

    const sequencia = db.prepare(
      "SELECT seq FROM sqlite_sequence WHERE name = ?"
    ).get("variant_pricing")?.seq ?? 0;

    function centavos(valor) {
      if (valor === null) return null;

      if (typeof valor !== "number" || !Number.isFinite(valor)) {
        throw new Error("Preço inválido encontrado.");
      }

      const resultado = Math.round(valor * 100);

      if (
        !Number.isSafeInteger(resultado) ||
        resultado < 0 ||
        Math.abs(valor - resultado / 100) > 0.0000001
      ) {
        throw new Error(`Preço não pode ser convertido exatamente: ${valor}`);
      }

      return resultado;
    }

    const convertidos = antigos.map((registro) => ({
      ...registro,
      cost_price_cents: centavos(registro.cost_price),
      sale_price_cents: centavos(registro.sale_price),
      promotional_price_cents: centavos(registro.promotional_price),
    }));

    const criarTemporaria = definicao[0].replace(
      "CREATE TABLE IF NOT EXISTS variant_pricing",
      "CREATE TABLE variant_pricing_migracao"
    );

    db.exec(criarTemporaria);

    const inserir = db.prepare(`
      INSERT INTO variant_pricing_migracao (
        id, variant_id,
        cost_price_cents, sale_price_cents, promotional_price_cents,
        currency, status, valid_from, valid_until,
        created_at, updated_at
      ) VALUES (
        @id, @variant_id,
        @cost_price_cents, @sale_price_cents, @promotional_price_cents,
        @currency, @status, @valid_from, @valid_until,
        @created_at, @updated_at
      )
    `);

    for (const registro of convertidos) {
      inserir.run(registro);
    }

    const copiados = db.prepare(
      "SELECT * FROM variant_pricing_migracao ORDER BY id"
    ).all();

    if (copiados.length !== convertidos.length) {
      throw new Error("A quantidade de registros não corresponde.");
    }

    for (let i = 0; i < copiados.length; i++) {
      for (const campo of Object.keys(copiados[i])) {
        if (copiados[i][campo] !== convertidos[i][campo]) {
          throw new Error(`Diferença no registro ${copiados[i].id}: ${campo}`);
        }
      }
    }

    db.exec(`
      DROP TABLE variant_pricing;
      ALTER TABLE variant_pricing_migracao RENAME TO variant_pricing;
    `);

    // Preserva também o contador dos IDs já utilizados.
    db.prepare(`
      UPDATE sqlite_sequence
      SET seq = max(seq, ?)
      WHERE name = 'variant_pricing'
    `).run(sequencia);

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

    return copiados.length;
  });

  const total = migrar.immediate();

  console.log(`Migração concluída: ${total} registros preservados.`);
  console.table(db.prepare(`
    SELECT
      id, variant_id,
      cost_price_cents, sale_price_cents, promotional_price_cents
    FROM variant_pricing
    ORDER BY id
  `).all());
} catch (erro) {
  console.error("Migração não aplicada:", erro.message);
  process.exitCode = 1;
} finally {
  db.close();
}