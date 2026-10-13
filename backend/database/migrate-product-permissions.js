const Database = require("better-sqlite3");
const path = require("node:path");

async function migrar() {
  const arquivo = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(__dirname, "neumam.db");
  const db = new Database(arquivo, { fileMustExist: true });

  try {
    db.pragma("foreign_keys = ON");

    function verificarIntegridade() {
      const resultado = db.pragma("integrity_check");
      if (resultado.length !== 1 || resultado[0].integrity_check !== "ok") {
        throw new Error("O banco precisa de revisão de integridade.");
      }
      if (db.pragma("foreign_key_check").length !== 0) {
        throw new Error("Existem referências inválidas no banco.");
      }
    }

    verificarIntegridade();

    for (const tabela of [
      "admin_permissions",
      "admin_roles",
      "admin_role_permissions",
      "admin_user_roles",
    ]) {
      if (db.pragma(`table_info(${tabela})`).length === 0) {
        throw new Error(`Tabela obrigatória não encontrada: ${tabela}`);
      }
    }

    const permissoes = [
      ["products.read", "Consultar produtos"],
      ["products.create", "Cadastrar produtos"],
      ["products.update", "Editar produtos"],
    ];

    const codigoPerfil = "neumam_product_admin";

    for (const [codigo] of permissoes) {
      const total = db.prepare(
        "SELECT COUNT(*) AS total FROM admin_permissions WHERE code = ?"
      ).get(codigo).total;

      if (total > 1) {
        throw new Error(`Permissão duplicada: ${codigo}`);
      }
    }

    const totalPerfis = db.prepare(
      "SELECT COUNT(*) AS total FROM admin_roles WHERE code = ?"
    ).get(codigoPerfil).total;

    if (totalPerfis > 1) {
      throw new Error("Perfil de produtos duplicado.");
    }

    const existente = db.prepare(
      "SELECT id, status FROM admin_roles WHERE code = ?"
    ).get(codigoPerfil);

    if (existente && existente.status !== "active") {
      throw new Error("Perfil de produtos não está ativo.");
    }

    const aplicar = db.transaction(() => {
      let criados = 0;

      for (const [codigo, nome] of permissoes) {
        criados += db.prepare(`
          INSERT INTO admin_permissions (name, code, description)
          SELECT ?, ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM admin_permissions WHERE code = ?
          )
        `).run(nome, codigo, nome, codigo).changes;
      }

      criados += db.prepare(`
        INSERT INTO admin_roles (name, code, description, status)
        SELECT ?, ?, ?, 'active'
        WHERE NOT EXISTS (
          SELECT 1 FROM admin_roles WHERE code = ?
        )
      `).run(
        "Administrador de produtos",
        codigoPerfil,
        "Gerencia o cadastro e a edição de produtos.",
        codigoPerfil
      ).changes;

      const perfil = db.prepare(
        "SELECT id FROM admin_roles WHERE code = ?"
      ).get(codigoPerfil);

      for (const [codigo] of permissoes) {
        const permissao = db.prepare(
          "SELECT id FROM admin_permissions WHERE code = ?"
        ).get(codigo);

        criados += db.prepare(`
          INSERT INTO admin_role_permissions (
            admin_role_id, admin_permission_id
          )
          SELECT ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM admin_role_permissions
            WHERE admin_role_id = ?
              AND admin_permission_id = ?
          )
        `).run(
          perfil.id,
          permissao.id,
          perfil.id,
          permissao.id
        ).changes;
      }

      if (db.pragma("foreign_key_check").length !== 0) {
        throw new Error("Referências inválidas após migração.");
      }

      return criados;
    });

    const faltaPermissao = permissoes.some(([codigo]) =>
      !db.prepare(
        "SELECT 1 FROM admin_permissions WHERE code = ?"
      ).get(codigo)
    );

    const faltaPerfil = !existente;

    const faltaVinculo = existente && permissoes.some(([codigo]) =>
      !db.prepare(`
        SELECT 1
        FROM admin_role_permissions rp
        JOIN admin_permissions p
          ON p.id = rp.admin_permission_id
        WHERE rp.admin_role_id = ?
          AND p.code = ?
      `).get(existente.id, codigo)
    );

    if (faltaPermissao || faltaPerfil || faltaVinculo) {
      const momento = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

      const backup = path.join(
        __dirname,
        `neumam-before-product-permissions-${momento}.db`
      );

      await db.backup(backup);
      console.log("Backup criado:", backup);
    }

    const criados = aplicar.immediate();

    verificarIntegridade();

    console.log(
      "Migração concluída. Registros inseridos:",
      criados
    );

    console.log(
      "Nenhum vínculo de usuário administrativo foi alterado."
    );

    console.table(db.prepare(`
      SELECT r.code AS perfil, p.code AS permissao
      FROM admin_roles r
      JOIN admin_role_permissions rp
        ON rp.admin_role_id = r.id
      JOIN admin_permissions p
        ON p.id = rp.admin_permission_id
      WHERE r.code = ?
      ORDER BY p.code
    `).all(codigoPerfil));

  } finally {
    db.close();
  }
}

migrar().catch((erro) => {
  console.error("Migração não aplicada:", erro.message);
  process.exitCode = 1;
});

