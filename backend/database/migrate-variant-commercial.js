const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "neumam.db"), {
  fileMustExist: true,
});

db.pragma("foreign_keys = ON");

try {
  const migrar = db.transaction(() => {
    const colunas = db.pragma("table_info(variant_commercial)")
      .map((coluna) => coluna.name);

    if (colunas.includes("minimum_price_cents")) {
      throw new Error("A tabela já foi convertida.");
    }

    const tabelas = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).all();

    for (const tabela of tabelas) {
      const nome = tabela.name.replace(/"/g, '""');
      const referencias = db.prepare(
        `PRAGMA foreign_key_list("${nome}")`
      ).all();

      if (referencias.some((fk) => fk.table === "variant_commercial")) {
        throw new Error(`Existe uma referência em ${tabela.name}.`);
      }
    }

    // Índices automáticos de UNIQUE são recriados pela nova definição.
    const dependencias = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type IN ('index', 'trigger', 'view')
        AND sql IS NOT NULL
        AND (
          tbl_name = 'variant_commercial'
          OR lower(sql) LIKE '%variant_commercial%'
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
      /CREATE TABLE IF NOT EXISTS variant_commercial\s*\([\s\S]*?\);/
    );

    if (
      !definicao ||
      !definicao[0].includes("minimum_price_cents") ||
      !definicao[0].includes("operational_cost_cents")
    ) {
      throw new Error("A definição em centavos não foi encontrada no init.js.");
    }

    const antigos = db.prepare(
      "SELECT * FROM variant_commercial ORDER BY id"
    ).all();

    const sequencia = db.prepare(
      "SELECT seq FROM sqlite_sequence WHERE name = ?"
    ).get("variant_commercial")?.seq ?? 0;

    function centavos(valor) {
      if (valor === null) return null;

      if (typeof valor !== "number" || !Number.isFinite(valor)) {
        throw new Error("Valor monetário inválido.");
      }

      const resultado = Math.round(valor * 100);

      if (
        !Number.isSafeInteger(resultado) ||
        resultado < 0 ||
        Math.abs(valor - resultado / 100) > 0.0000001
      ) {
        throw new Error(`Valor não pode ser convertido exatamente: ${valor}`);
      }

      return resultado;
    }

    const convertidos = antigos.map((registro) => ({
      ...registro,
      minimum_price_cents: centavos(registro.minimum_price),
      operational_cost_cents: centavos(registro.operational_cost),
    }));

    db.exec(definicao[0].replace(
      "CREATE TABLE IF NOT EXISTS variant_commercial",
      "CREATE TABLE variant_commercial_migracao"
    ));

    const inserir = db.prepare(`
      INSERT INTO variant_commercial_migracao (
        id, variant_id, minimum_price_cents,
        target_margin_percent, target_markup_percent,
        commission_percent, operational_cost_cents,
        tax_percent, status, created_at, updated_at
      ) VALUES (
        @id, @variant_id, @minimum_price_cents,
        @target_margin_percent, @target_markup_percent,
        @commission_percent, @operational_cost_cents,
        @tax_percent, @status, @created_at, @updated_at
      )
    `);

    for (const registro of convertidos) {
      inserir.run(registro);
    }

    const copiados = db.prepare(
      "SELECT * FROM variant_commercial_migracao ORDER BY id"
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

    // Confirma que a regra UNIQUE de variant_id foi preservada.
    const indices = db.pragma("index_list(variant_commercial_migracao)");
    const varianteUnica = indices.some((indice) => {
      if (!indice.unique || indice.partial) return false;

      const nome = indice.name.replace(/"/g, '""');
      const campos = db.prepare(`PRAGMA index_info("${nome}")`).all();

      return campos.length === 1 && campos[0].name === "variant_id";
    });

    if (!varianteUnica) {
      throw new Error("A regra UNIQUE de variant_id está ausente.");
    }

    db.exec(`
      DROP TABLE variant_commercial;
      ALTER TABLE variant_commercial_migracao RENAME TO variant_commercial;
    `);

    db.prepare(`
      UPDATE sqlite_sequence
      SET seq = max(seq, ?)
      WHERE name = 'variant_commercial'
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
      id, variant_id, minimum_price_cents,
      operational_cost_cents, target_margin_percent,
      target_markup_percent, commission_percent, tax_percent
    FROM variant_commercial
    ORDER BY id
  `).all());
} catch (erro) {
  console.error("Migração não aplicada:", erro.message);
  process.exitCode = 1;
} finally {
  db.close();
}