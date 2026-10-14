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
      const integridade = db.pragma("integrity_check");

      if (
        integridade.length !== 1 ||
        integridade[0].integrity_check !== "ok"
      ) {
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

    const codigoPermissao = "products.variants.manage";
    const codigoPerfil = "neumam_product_admin";

    const perfil = db.prepare(`
      SELECT id, status
      FROM admin_roles
      WHERE code = ?
    `).get(codigoPerfil);

    if (!perfil || perfil.status !== "active") {
      throw new Error("Perfil administrativo de produtos não encontrado ou inativo.");
    }

    const permissaoExistente = db.prepare(`
      SELECT id
      FROM admin_permissions
      WHERE code = ?
    `).get(codigoPermissao);

    const vinculoExistente = permissaoExistente
      ? db.prepare(`
          SELECT 1
          FROM admin_role_permissions
          WHERE admin_role_id = ?
            AND admin_permission_id = ?
        `).get(perfil.id, permissaoExistente.id)
      : null;

    if (!permissaoExistente || !vinculoExistente) {
      const momento = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

      const backup = path.join(
        path.dirname(arquivo),
        `neumam-before-variant-permissions-${momento}.db`
      );

      await db.backup(backup);
      console.log("Backup criado:", backup);
    }

    const aplicar = db.transaction(() => {
      let inseridos = 0;

      inseridos += db.prepare(`
        INSERT INTO admin_permissions (name, code, description)
        SELECT ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM admin_permissions WHERE code = ?
        )
      `).run(
        "Gerenciar variantes de produtos",
        codigoPermissao,
        "Permite gerenciar variantes, preços e estoque de produtos.",
        codigoPermissao
      ).changes;

      const permissao = db.prepare(`
        SELECT id FROM admin_permissions WHERE code = ?
      `).get(codigoPermissao);

      inseridos += db.prepare(`
        INSERT INTO admin_role_permissions (
          admin_role_id,
          admin_permission_id
        )
        SELECT ?, ?
        WHERE NOT EXISTS (
          SELECT 1
          FROM admin_role_permissions
          WHERE admin_role_id = ?
            AND admin_permission_id = ?
        )
      `).run(
        perfil.id,
        permissao.id,
        perfil.id,
        permissao.id
      ).changes;

      if (db.pragma("foreign_key_check").length !== 0) {
        throw new Error("Referências inválidas após a migração.");
      }

      return inseridos;
    });

    const inseridos = aplicar.immediate();

    verificarIntegridade();

    console.log("Migração concluída. Registros inseridos:", inseridos);
    console.log("Nenhum vínculo de usuário foi alterado.");

    console.table(db.prepare(`
      SELECT r.code AS perfil, p.code AS permissao
      FROM admin_roles AS r
      JOIN admin_role_permissions AS rp
        ON rp.admin_role_id = r.id
      JOIN admin_permissions AS p
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
