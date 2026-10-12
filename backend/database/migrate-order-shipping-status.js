const Database = require("better-sqlite3");
const path = require("node:path");

async function migrar() {
  const arquivo = path.join(__dirname, "neumam.db");
  const db = new Database(arquivo, { fileMustExist: true });

  try {
    db.pragma("foreign_keys = ON");

    const integridade = db.pragma("integrity_check");
    if (
      integridade.length !== 1 ||
      integridade[0].integrity_check !== "ok"
    ) {
      throw new Error("O banco precisa de revisão de integridade.");
    }

    if (db.pragma("foreign_key_check").length > 0) {
      throw new Error("Existem referências inválidas no banco.");
    }

    const colunas = db.pragma("table_info(orders)");
    if (colunas.length === 0) {
      throw new Error("A tabela orders não foi encontrada.");
    }

    const existente = colunas.find(
      (coluna) => coluna.name === "shipping_status"
    );

    if (existente) {
      console.log("O campo shipping_status já existe.");
      console.table(
        db.prepare(`
          SELECT shipping_status, COUNT(*) AS quantidade
          FROM orders
          GROUP BY shipping_status
        `).all()
      );
      return;
    }

    const momento = new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

    const backup = path.join(
      __dirname,
      `neumam-before-shipping-status-${momento}.db`
    );

    await db.backup(backup);
    console.log("Backup criado:", backup);

    const aplicar = db.transaction(() => {
      db.exec(`
        ALTER TABLE orders
        ADD COLUMN shipping_status TEXT NOT NULL
          DEFAULT 'not_requested'
          CHECK (
            shipping_status IN (
              'not_requested',
              'awaiting_quote',
              'quoted'
            )
          )
      `);

      const resultado = db.prepare(`
        UPDATE orders
        SET shipping_status = 'awaiting_quote'
        WHERE instr(
          COALESCE(notes, ''),
          'FRETE_SOB_CONSULTA:'
        ) > 0
      `).run();

      if (db.pragma("foreign_key_check").length > 0) {
        throw new Error("Falha na verificação das referências.");
      }

      const verificacao = db.pragma("integrity_check");
      if (
        verificacao.length !== 1 ||
        verificacao[0].integrity_check !== "ok"
      ) {
        throw new Error("Falha na verificação de integridade.");
      }

      return resultado.changes;
    });

    const atualizados = aplicar.immediate();

    console.log("Migração concluída.");
    console.log(
      "Solicitações marcadas com frete sob consulta:",
      atualizados
    );
    console.log("Valores e itens dos pedidos preservados.");

    console.table(
      db.prepare(`
        SELECT shipping_status, COUNT(*) AS quantidade
        FROM orders
        GROUP BY shipping_status
      `).all()
    );
  } finally {
    db.close();
  }
}

migrar().catch((erro) => {
  console.error("Migração não aplicada:", erro.message);
  process.exitCode = 1;
});