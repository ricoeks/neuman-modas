const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "neumam.db"), {
  fileMustExist: true,
});

db.pragma("foreign_keys = ON");

try {
  const migrar = db.transaction(() => {
    const colunas = db.pragma("table_info(supplier_variants)")
      .map((coluna) => coluna.name);

    if (colunas.includes("supplier_cost_cents")) {
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

      if (referencias.some((fk) => fk.table === "supplier_variants")) {
        throw new Error(`Existe uma referência em ${tabela.name}.`);
      }
    }

    // O índice automático do UNIQUE será recriado pela definição.
    const dependencias = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type IN ('index', 'trigger', 'view')
        AND sql IS NOT NULL
        AND (
          tbl_name = 'supplier_variants'
          OR lower(sql) LIKE '%supplier_variants%'
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
      /CREATE TABLE IF NOT EXISTS supplier_variants\s*\([\s\S]*?\);/
    );

    if (!definicao || !definicao[0].includes("supplier_cost_cents")) {
      throw new Error("A definição em centavos não foi encontrada no init.js.");
    }

    const antigos = db.prepare(
      "SELECT * FROM supplier_variants ORDER BY id"
    ).all();

    const sequencia = db.prepare(
      "SELECT seq FROM sqlite_sequence WHERE name = ?"
    ).get("supplier_variants")?.seq ?? 0;

    function centavos(valor) {
      if (valor === null) return null;

      if (typeof valor !== "number" || !Number.isFinite(valor)) {
        throw new Error("Custo inválido encontrado.");
      }

      const resultado = Math.round(valor * 100);

      if (
        !Number.isSafeInteger(resultado) ||
        resultado < 0 ||
        Math.abs(valor - resultado / 100) > 0.0000001
      ) {
        throw new Error(`Custo não pode ser convertido exatamente: ${valor}`);
      }

      return resultado;
    }

    const convertidos = antigos.map((registro) => ({
      ...registro,
      supplier_cost_cents: centavos(registro.supplier_cost),
    }));

    db.exec(definicao[0].replace(
      "CREATE TABLE IF NOT EXISTS supplier_variants",
      "CREATE TABLE supplier_variants_migracao"
    ));

    const inserir = db.prepare(`
      INSERT INTO supplier_variants_migracao (
        id, supplier_id, variant_id, supplier_sku,
        supplier_cost_cents, available_quantity,
        availability_status, lead_time_days, is_preferred,
        status, last_checked_at, created_at, updated_at
      ) VALUES (
        @id, @supplier_id, @variant_id, @supplier_sku,
        @supplier_cost_cents, @available_quantity,
        @availability_status, @lead_time_days, @is_preferred,
        @status, @last_checked_at, @created_at, @updated_at
      )
    `);

    for (const registro of convertidos) {
      inserir.run(registro);
    }

    const copiados = db.prepare(
      "SELECT * FROM supplier_variants_migracao ORDER BY id"
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

    const indices = db.pragma("index_list(supplier_variants_migracao)");
    const vinculoUnico = indices.some((indice) => {
      if (!indice.unique || indice.partial) return false;

      const nome = indice.name.replace(/"/g, '""');
      const campos = db.prepare(`PRAGMA index_info("${nome}")`).all()
        .map((campo) => campo.name);

      return (
        campos.length === 2 &&
        campos.includes("supplier_id") &&
        campos.includes("variant_id")
      );
    });

    if (!vinculoUnico) {
      throw new Error("A regra UNIQUE do fornecedor e variante está ausente.");
    }

    db.exec(`
      DROP TABLE supplier_variants;
      ALTER TABLE supplier_variants_migracao RENAME TO supplier_variants;
    `);

    db.prepare(`
      UPDATE sqlite_sequence
      SET seq = max(seq, ?)
      WHERE name = 'supplier_variants'
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
      id, supplier_id, variant_id, supplier_cost_cents,
      available_quantity, lead_time_days, is_preferred
    FROM supplier_variants
    ORDER BY id
  `).all());
} catch (erro) {
  console.error("Migração não aplicada:", erro.message);
  process.exitCode = 1;
} finally {
  db.close();
}