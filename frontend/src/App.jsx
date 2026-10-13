import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import Home from "./pages/Home/Home";
import Product from "./pages/Product/Product";
import Cart from "./pages/Cart/Cart";
import Checkout from "./pages/Checkout/Checkout";
import Admin from "./pages/Admin/Admin";
import AdminOrder from "./pages/Admin/AdminOrder";
import AdminProducts from "./pages/Admin/AdminProducts";
import AdminProductCreate from "./pages/Admin/AdminProductCreate";

function AreaAdmin({ children }) {
  return (
    <>
      <nav className="admin__navegacao" aria-label="Seções administrativas">
        <NavLink to="/admin" end>
          Pedidos e conta
        </NavLink>
        <NavLink to="/admin/produtos" end>
          Produtos
        </NavLink>
        <NavLink to="/admin/produtos/novo">
          Novo produto
        </NavLink>
      </nav>
      {children}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/produtos/:slug" element={<Product />} />
        <Route path="/carrinho" element={<Cart />} />
        <Route path="/finalizar" element={<Checkout />} />

        <Route
          path="/admin"
          element={<AreaAdmin><Admin /></AreaAdmin>}
        />
        <Route
          path="/admin/pedidos/:id"
          element={<AreaAdmin><AdminOrder /></AreaAdmin>}
        />
        <Route
          path="/admin/produtos"
          element={<AreaAdmin><AdminProducts /></AreaAdmin>}
        />
        <Route
          path="/admin/produtos/novo"
          element={<AreaAdmin><AdminProductCreate /></AreaAdmin>}
        />

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