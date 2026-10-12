const express = require("express");
const db = require("../database/connection");

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const categorias = db.prepare(`
      SELECT id, parent_id, name, slug, description, sort_order
      FROM categories
      WHERE status = 'active'
      ORDER BY sort_order, name, id
    `).all();

    res.json({
      total: categorias.length,
      categorias,
    });
  } catch (erro) {
    console.error("Erro ao listar categorias:", erro);
    res.status(500).json({
      mensagem: "Não foi possível listar as categorias.",
    });
  }
});

module.exports = router;