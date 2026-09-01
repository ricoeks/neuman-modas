const express = require("express");

const app = express();
const PORT = 3001;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    mensagem: "API Neumam Modas funcionando!",
  });
});

app.listen(PORT, () => {
  console.log(`Servidor Neumam rodando na porta ${PORT}`);
});