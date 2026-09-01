const Database = require("better-sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "neumam.db");

const db = new Database(databasePath);

db.pragma("foreign_keys = ON");

console.log("Banco de dados Neumam conectado com sucesso!");

module.exports = db;