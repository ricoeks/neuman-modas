const express = require("express");
const path = require("path");

const categoriesRoutes = require("./routes/categories");
const productsRoutes = require("./routes/products");
const cartsRoutes = require("./routes/carts");
const ordersRoutes = require("./routes/orders");
const { router: adminAuthRoutes } = require("./routes/admin-auth");
const adminOrdersRoutes = require("./routes/admin-orders");
const adminOrderHistoryRoutes = require("./routes/admin-order-history");
const adminProductsRoutes = require("./routes/admin-products");
const adminProductCreateRoutes = require("./routes/admin-product-create");
const adminProductEditRoutes = require("./routes/admin-product-edit");

const app = express();
const PORT = 3001;

app.use(express.json({ limit: "32kb" }));

app.use(
  "/images",
  express.static(path.join(__dirname, "public", "images"))
);

app.get("/", (req, res) => {
  res.json({
    mensagem: "API Neumam Modas funcionando!",
  });
});

app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/carts", cartsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/orders", adminOrderHistoryRoutes);
app.use("/api/admin/orders", adminOrdersRoutes);
app.use("/api/admin/products", adminProductCreateRoutes);
app.use("/api/admin/products", adminProductEditRoutes);
app.use("/api/admin/products", adminProductsRoutes);

app.listen(PORT, () => {
  console.log(`Servidor Neumam rodando na porta ${PORT}`);
});