const express = require("express");
const bcrypt = require("bcrypt");
const { randomBytes, createHash } = require("node:crypto");
const db = require("../database/connection");

const router = express.Router();

const DURACAO_SESSAO = 8 * 60 * 60 * 1000;
const JANELA_TENTATIVAS = 15 * 60 * 1000;
const tentativasPorIp = new Map();

const hashFicticio = bcrypt.hashSync(
  randomBytes(32).toString("hex"),
  12
);

const opcoesCookie = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/api/admin",
};

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function obterToken(req) {
  const partes = (req.headers.cookie || "")
    .split(";")
    .map((parte) => parte.trim())
    .filter((parte) => parte.startsWith("neumam_admin="));

  if (partes.length !== 1) {
    return null;
  }

  const token = partes[0].slice("neumam_admin=".length);
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}

function protegerAlteracao(req, res, next) {
  // Este cabeçalho impede envios por formulários de outros sites.
  if (req.get("X-Neumam-Request") !== "1") {
    return res.status(403).json({
      mensagem: "Requisição administrativa inválida.",
    });
  }

  const origem = req.get("Origin");

  const origensPermitidas = new Set([
    "http://localhost:5173",
    "http://localhost:3001",
  ]);

  if (process.env.ADMIN_ORIGIN) {
    origensPermitidas.clear();
    origensPermitidas.add(process.env.ADMIN_ORIGIN);
  }

  if (
    origem &&
    (!origensPermitidas.has(origem) ||
      origem === "null")
  ) {
    return res.status(403).json({
      mensagem: "Origem não autorizada.",
    });
  }

  if (req.get("Sec-Fetch-Site") === "cross-site") {
    return res.status(403).json({
      mensagem: "Origem não autorizada.",
    });
  }

  next();
}

function limitarLogin(req, res, next) {
  const agora = Date.now();

  for (const [chave, registro] of tentativasPorIp) {
    if (registro.ate <= agora) {
      tentativasPorIp.delete(chave);
    }
  }

  const ip = req.ip || req.socket.remoteAddress || "desconhecido";
  let registro = tentativasPorIp.get(ip);

  if (!registro) {
    if (tentativasPorIp.size >= 10000) {
      return res.status(429).json({
        mensagem: "Tente novamente mais tarde.",
      });
    }

    registro = {
      quantidade: 0,
      ate: agora + JANELA_TENTATIVAS,
    };

    tentativasPorIp.set(ip, registro);
  }

  registro.quantidade++;

  if (registro.quantidade > 25) {
    res.set(
      "Retry-After",
      String(Math.ceil((registro.ate - agora) / 1000))
    );

    return res.status(429).json({
      mensagem: "Muitas tentativas. Tente novamente mais tarde.",
    });
  }

  next();
}

function permissoesDoAdmin(adminId) {
  return db.prepare(`
    SELECT DISTINCT p.code
    FROM admin_permissions AS p
    JOIN admin_role_permissions AS rp
      ON rp.admin_permission_id = p.id
    JOIN admin_roles AS r
      ON r.id = rp.admin_role_id
    JOIN admin_user_roles AS ur
      ON ur.admin_role_id = r.id
    WHERE ur.admin_user_id = ?
      AND r.status = 'active'
    ORDER BY p.code
  `).all(adminId).map((permissao) => permissao.code);
}

function exigirAdmin(req, res, next) {
  try {
    const token = obterToken(req);

    if (!token) {
      return res.status(401).json({
        mensagem: "Entre com sua conta administrativa.",
      });
    }

    const sessao = db.prepare(`
      SELECT
        s.id AS session_id,
        u.id,
        u.name,
        u.email
      FROM admin_sessions AS s
      JOIN admin_users AS u
        ON u.id = s.admin_user_id
      JOIN admin_auth AS a
        ON a.admin_user_id = u.id
      WHERE s.token_hash = ?
        AND s.revoked_at IS NULL
        AND datetime(s.expires_at) > datetime('now')
        AND u.status = 'active'
    `).get(hashToken(token));

    if (!sessao) {
      res.clearCookie("neumam_admin", opcoesCookie);

      return res.status(401).json({
        mensagem: "Sua sessão expirou. Entre novamente.",
      });
    }

    req.admin = {
      id: sessao.id,
      name: sessao.name,
      email: sessao.email,
      permissions: permissoesDoAdmin(sessao.id),
    };

    db.prepare(`
      UPDATE admin_sessions
      SET last_activity_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(sessao.session_id);

    next();
  } catch (erro) {
    console.error("Erro ao verificar sessão administrativa:", erro);
    res.status(500).json({
      mensagem: "Não foi possível verificar a sessão.",
    });
  }
}

function exigirPermissao(codigo) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        mensagem: "Entre com sua conta administrativa.",
      });
    }

    if (!req.admin.permissions.includes(codigo)) {
      return res.status(403).json({
        mensagem: "Sua conta não possui permissão para esta ação.",
      });
    }

    next();
  };
}

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post(
  "/login",
  protegerAlteracao,
  limitarLogin,
  async (req, res) => {
    try {
      const body = req.body;

      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        typeof body.email !== "string" ||
        typeof body.password !== "string"
      ) {
        return res.status(400).json({
          mensagem: "Informe e-mail e senha.",
        });
      }

      const email = body.email.trim();
      const senha = body.password;

      if (
        !email ||
        email.length > 254 ||
        !senha ||
        Buffer.byteLength(senha, "utf8") > 72
      ) {
        return res.status(400).json({
          mensagem: "Confira o e-mail e a senha.",
        });
      }

      const conta = db.prepare(`
        SELECT
          u.id,
          u.status,
          a.password_hash,
          CASE
            WHEN datetime(a.locked_until) > datetime('now')
            THEN 1 ELSE 0
          END AS bloqueado
        FROM admin_users AS u
        JOIN admin_auth AS a
          ON a.admin_user_id = u.id
        WHERE u.email = ?
      `).get(email);

      const hashValido =
        conta &&
        /^\$2[ab]\$(0[4-9]|1[0-6])\$[./A-Za-z0-9]{53}$/.test(
          conta.password_hash
        );

      const podeVerificar =
        hashValido &&
        conta.status === "active" &&
        !conta.bloqueado;

      const senhaCorreta = await bcrypt.compare(
        senha,
        podeVerificar ? conta.password_hash : hashFicticio
      );

      delete body.password;

      if (!podeVerificar || !senhaCorreta) {
        if (
          conta &&
          conta.status === "active" &&
          !conta.bloqueado
        ) {
          db.prepare(`
            UPDATE admin_auth
            SET
              failed_login_attempts =
                CASE
                  WHEN locked_until IS NOT NULL
                    AND datetime(locked_until) <= datetime('now')
                  THEN 1
                  ELSE failed_login_attempts + 1
                END,
              locked_until =
                CASE
                  WHEN locked_until IS NOT NULL
                    AND datetime(locked_until) <= datetime('now')
                  THEN NULL
                  WHEN failed_login_attempts + 1 >= 5
                  THEN datetime('now', '+15 minutes')
                  ELSE NULL
                END,
              updated_at = CURRENT_TIMESTAMP
            WHERE admin_user_id = ?
              AND (
                locked_until IS NULL
                OR datetime(locked_until) <= datetime('now')
              )
          `).run(conta.id);
        }

        return res.status(401).json({
          mensagem: "E-mail ou senha inválidos, ou acesso temporariamente bloqueado.",
        });
      }

      const token = randomBytes(32).toString("hex");
      const tokenAnterior = obterToken(req);

      const expiresAt = new Date(Date.now() + DURACAO_SESSAO)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);

      const criarSessao = db.transaction(() => {
        const atual = db.prepare(`
          SELECT u.id, u.name, u.email
          FROM admin_users AS u
          JOIN admin_auth AS a
            ON a.admin_user_id = u.id
          WHERE u.id = ?
            AND u.status = 'active'
            AND a.password_hash = ?
            AND (
              a.locked_until IS NULL
              OR datetime(a.locked_until) <= datetime('now')
            )
        `).get(conta.id, conta.password_hash);

        if (!atual) {
          return null;
        }

        if (tokenAnterior) {
          db.prepare(`
            UPDATE admin_sessions
            SET revoked_at = CURRENT_TIMESTAMP
            WHERE token_hash = ?
              AND revoked_at IS NULL
          `).run(hashToken(tokenAnterior));
        }

        db.prepare(`
          INSERT INTO admin_sessions (
            admin_user_id,
            token_hash,
            ip_address,
            user_agent,
            expires_at
          )
          VALUES (?, ?, ?, ?, ?)
        `).run(
          atual.id,
          hashToken(token),
          req.ip || req.socket.remoteAddress || null,
          (req.get("User-Agent") || "").slice(0, 500),
          expiresAt
        );

        db.prepare(`
          UPDATE admin_auth
          SET failed_login_attempts = 0,
              locked_until = NULL,
              last_login_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE admin_user_id = ?
        `).run(atual.id);

        return {
          ...atual,
          permissions: permissoesDoAdmin(atual.id),
        };
      });

      const admin = criarSessao.immediate();

      if (!admin) {
        return res.status(401).json({
          mensagem: "Não foi possível entrar. Tente novamente.",
        });
      }

      res.cookie("neumam_admin", token, {
        ...opcoesCookie,
        maxAge: DURACAO_SESSAO,
      });

      return res.json({
        mensagem: "Login realizado.",
        admin,
      });
    } catch (erro) {
      console.error("Erro no login administrativo:", erro);
      return res.status(500).json({
        mensagem: "Não foi possível entrar.",
      });
    }
  }
);

router.get("/me", exigirAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

router.post("/logout", protegerAlteracao, (req, res) => {
  try {
    const token = obterToken(req);

    if (token) {
      db.prepare(`
        UPDATE admin_sessions
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE token_hash = ?
          AND revoked_at IS NULL
      `).run(hashToken(token));
    }

    res.clearCookie("neumam_admin", opcoesCookie);
    res.json({ mensagem: "Sessão encerrada." });
  } catch (erro) {
    console.error("Erro ao encerrar sessão administrativa:", erro);
    res.status(500).json({
      mensagem: "Não foi possível encerrar a sessão.",
    });
  }
});

module.exports = {
  router,
  exigirAdmin,
  exigirPermissao,
  protegerAlteracao,
};