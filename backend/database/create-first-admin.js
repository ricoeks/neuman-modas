const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const path = require("node:path");

async function executar() {
  let entrada = "";

  for await (const trecho of process.stdin) {
    entrada += trecho.toString("utf8");

    if (Buffer.byteLength(entrada, "utf8") > 8192) {
      throw new Error("Dados acima do limite permitido.");
    }
  }

  const dados = JSON.parse(entrada.replace(/^\uFEFF/, ""));
  entrada = "";

  const nome =
    typeof dados.name === "string" ? dados.name.trim() : "";

  const email =
    typeof dados.email === "string" ? dados.email.trim() : "";

  const senha = dados.password;

  if (
    !nome ||
    nome.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(nome)
  ) {
    throw new Error("Informe um nome válido, com até 120 caracteres.");
  }

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    /[\u0000-\u001f\u007f]/.test(email)
  ) {
    throw new Error("Informe um e-mail válido.");
  }

  if (
    typeof senha !== "string" ||
    [...senha].length < 12 ||
    Buffer.byteLength(senha, "utf8") > 72 ||
    /[\u0000-\u001f\u007f]/.test(senha)
  ) {
    throw new Error(
      "Use uma senha com pelo menos 12 caracteres e até 72 bytes."
    );
  }

  const db = new Database(path.join(__dirname, "neumam.db"), {
    fileMustExist: true,
  });

  try {
    db.pragma("foreign_keys = ON");

    if (
      db.prepare("SELECT COUNT(*) AS total FROM admin_users")
        .get().total !== 0
    ) {
      throw new Error(
        "Já existe um administrador. Nenhuma conta foi alterada."
      );
    }

    const hash = await bcrypt.hash(senha, 12);
    delete dados.password;

    const criar = db.transaction(() => {
      if (
        db.prepare("SELECT COUNT(*) AS total FROM admin_users")
          .get().total !== 0
      ) {
        throw new Error("Um administrador já foi criado.");
      }

      const codigoPerfil = "neumam_initial_admin";

      if (
        db.prepare("SELECT id FROM admin_roles WHERE code = ?")
          .get(codigoPerfil)
      ) {
        throw new Error(
          "O perfil inicial já existe e precisa de revisão."
        );
      }

      const usuario = db.prepare(`
        INSERT INTO admin_users (name, email, status)
        VALUES (?, ?, 'active')
      `).run(nome, email);

      const adminId = Number(usuario.lastInsertRowid);

      db.prepare(`
        INSERT INTO admin_auth (
          admin_user_id,
          password_hash
        )
        VALUES (?, ?)
      `).run(adminId, hash);

      const perfil = db.prepare(`
        INSERT INTO admin_roles (
          name,
          code,
          description,
          status
        )
        VALUES (?, ?, ?, 'active')
      `).run(
        "Administrador de pedidos",
        codigoPerfil,
        "Consulta solicitações e registra orçamentos de frete."
      );

      const perfilId = Number(perfil.lastInsertRowid);

      const permissoes = [
        ["Consultar pedidos", "orders.read"],
        ["Informar frete dos pedidos", "orders.shipping.quote"],
      ];

      for (const [titulo, codigo] of permissoes) {
        db.prepare(`
          INSERT INTO admin_permissions (name, code)
          VALUES (?, ?)
          ON CONFLICT(code) DO NOTHING
        `).run(titulo, codigo);

        const permissao = db.prepare(`
          SELECT id FROM admin_permissions WHERE code = ?
        `).get(codigo);

        db.prepare(`
          INSERT INTO admin_role_permissions (
            admin_role_id,
            admin_permission_id
          )
          VALUES (?, ?)
        `).run(perfilId, permissao.id);
      }

      db.prepare(`
        INSERT INTO admin_user_roles (
          admin_user_id,
          admin_role_id
        )
        VALUES (?, ?)
      `).run(adminId, perfilId);

      return adminId;
    });

    const adminId = criar.immediate();

    console.log("Administrador criado com sucesso.");
    console.log("ID:", adminId);
    console.log("Permissões: consultar pedidos e informar frete.");
    console.log("A senha e seu hash não foram exibidos.");
  } finally {
    db.close();
  }
}

executar().catch((erro) => {
  console.error(
    "Não foi possível criar o administrador:",
    erro instanceof SyntaxError
      ? "Entrada inválida."
      : erro.message
  );

  process.exitCode = 1;
});