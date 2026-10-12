import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home/Home";
import Product from "./pages/Product/Product";
import Cart from "./pages/Cart/Cart";
import Checkout from "./pages/Checkout/Checkout";
import Admin from "./pages/Admin/Admin";
import AdminOrder from "./pages/Admin/AdminOrder";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/produtos/:slug" element={<Product />} />
        <Route path="/carrinho" element={<Cart />} />
        <Route path="/finalizar" element={<Checkout />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/pedidos/:id" element={<AdminOrder />} />

        <Route
          path="*"
          element={
            <main className="catalogo">
              <h1>Página não encontrada</h1>
              <Link to="/">Voltar ao catálogo</Link>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;