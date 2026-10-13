import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Admin.css";

const nomesStatus = {
  draft: "Rascunho",
  active: "Ativo",
  inactive: "Inativo",
  blocked: "Bloqueado",
  archived: "Arquivado",
};

function AdminProducts() {
  const [produtos, setProdutos] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [semSessao, setSemSessao] = useState(false);
  const [semPermissao, setSemPermissao] = useState(false);

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [filtros, setFiltros] = useState({ q: "", status: "" });
  const [erroFiltro, setErroFiltro] = useState("");

  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [atualizacao, setAtualizacao] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      setCarregando(true);
      setErro("");
      setSemSessao(false);
      setSemPermissao(false);
      setProdutos([]);
      setAdmin(null);
      setTotal(0);
      setTotalPaginas(0);

      try {
        const sessao = await fetch("/api/admin/auth/me", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (sessao.status === 401) {
          if (!controller.signal.aborted) {
            setSemSessao(true);
          }
          return;
        }

        const dadosSessao = await sessao.json();

        if (!sessao.ok) {
          throw new Error(
            dadosSessao.mensagem || "Não foi possível verificar a sessão."
          );
        }

        if (
          !dadosSessao.admin ||
          !Number.isSafeInteger(dadosSessao.admin.id) ||
          !Array.isArray(dadosSessao.admin.permissions)
        ) {
          throw new Error("A resposta da sessão é inválida.");
        }

        if (controller.signal.aborted) {
          return;
        }

        setAdmin(dadosSessao.admin);

        if (!dadosSessao.admin.permissions.includes("products.read")) {
          setSemPermissao(true);
          return;
        }

        const parametros = new URLSearchParams({
          page: String(pagina),
          limit: "20",
        });

        if (filtros.q) {
          parametros.set("q", filtros.q);
        }

        if (filtros.status) {
          parametros.set("status", filtros.status);
        }

        const resposta = await fetch(`/api/admin/products?${parametros}`, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (resposta.status === 401) {
          if (!controller.signal.aborted) {
            setAdmin(null);
            setSemSessao(true);
          }
          return;
        }

        if (resposta.status === 403) {
          if (!controller.signal.aborted) {
            setSemPermissao(true);
          }
          return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados.mensagem || "Não foi possível consultar os produtos."
          );
        }

        if (
          !Array.isArray(dados.produtos) ||
          !Number.isSafeInteger(dados.total) ||
          dados.total < 0 ||
          !Number.isSafeInteger(dados.total_pages) ||
          dados.total_pages < 0 ||
          dados.page !== pagina ||
          dados.limit !== 20 ||
          dados.produtos.some(
            (produto) =>
              !produto ||
              !Number.isSafeInteger(produto.id) ||
              produto.id < 1 ||
              typeof produto.name !== "string" ||
              typeof produto.sku_base !== "string" ||
              typeof produto.slug !== "string" ||
              !Object.hasOwn(nomesStatus, produto.status) ||
              !Number.isSafeInteger(produto.variant_count) ||
              produto.variant_count < 0
          )
        ) {
          throw new Error("A resposta dos produtos é inválida.");
        }

        if (!controller.signal.aborted) {
          setProdutos(dados.produtos);
          setTotal(dados.total);
          setTotalPaginas(dados.total_pages);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErro(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    carregar();
    return () => controller.abort();
  }, [pagina, filtros, atualizacao]);

  function aplicarFiltros(event) {
    event.preventDefault();

    const texto = busca.trim();

    if (
      texto.length > 100 ||
      Array.from(texto).some(
        (caractere) =>
          caractere.charCodeAt(0) < 32 || caractere.charCodeAt(0) === 127
      )
    ) {
      setErroFiltro("Informe uma busca válida com até 100 caracteres.");
      return;
    }

    setErroFiltro("");
    setCarregando(true);
    setPagina(1);
    setFiltros({ q: texto, status });
  }

  function limparFiltros() {
    setBusca("");
    setStatus("");
    setErroFiltro("");
    setCarregando(true);
    setPagina(1);
    setFiltros({ q: "", status: "" });
  }

  function mudarPagina(novaPagina) {
    if (
      carregando ||
      novaPagina < 1 ||
      novaPagina > totalPaginas ||
      novaPagina === pagina
    ) {
      return;
    }

    setCarregando(true);
    setPagina(novaPagina);
  }

  return (
    <main className="admin">
      <Link to="/">← Voltar à loja</Link>
      <h1>Produtos</h1>

      {carregando && <p role="status">Carregando produtos...</p>}

      {!carregando && semSessao && (
        <div className="admin__painel">
          <p>Entre com sua conta administrativa para consultar os produtos.</p>
          <Link to="/admin">Ir para o login</Link>
        </div>
      )}

      {!carregando && semPermissao && (
        <p role="alert">
          Sua conta não possui permissão para consultar produtos.
        </p>
      )}

      {erro && (
        <div className="admin__painel">
          <p role="alert">{erro}</p>
          <button
            type="button"
            disabled={carregando}
            onClick={() => {
              setCarregando(true);
              setAtualizacao((valor) => valor + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!semSessao && !semPermissao && admin && (
        <>
          <div className="admin__cabecalho">
            <p>Conta: <strong>{admin.name}</strong></p>
            <button
              type="button"
              disabled={carregando}
              onClick={() => {
                setCarregando(true);
                setAtualizacao((valor) => valor + 1);
              }}
            >
              Atualizar
            </button>
          </div>

          <form className="admin__filtros" onSubmit={aplicarFiltros}>
            <fieldset disabled={carregando}>
              <div className="admin__filtro-campo">
                <label htmlFor="admin-produto-busca">Nome ou código do produto</label>
                <input
                  id="admin-produto-busca"
                  type="search"
                  maxLength={100}
                  value={busca}
                  placeholder="Ex.: Blazer ou BLZ-PRM-001"
                  onChange={(event) => {
                    setBusca(event.target.value);
                    setErroFiltro("");
                  }}
                />
              </div>

              <div className="admin__filtro-campo">
                <label htmlFor="admin-produto-status">Status</label>
                <select
                  id="admin-produto-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">Todos</option>
                  {Object.entries(nomesStatus).map(([codigo, nome]) => (
                    <option key={codigo} value={codigo}>{nome}</option>
                  ))}
                </select>
              </div>

              <div className="admin__filtro-acoes">
                <button type="submit">Aplicar filtros</button>
                <button type="button" onClick={limparFiltros}>Limpar</button>
              </div>
            </fieldset>

            {erroFiltro && <p role="alert">{erroFiltro}</p>}
          </form>

          {!carregando && !erro && (
            <>
              <p role="status">
                {total} {total === 1 ? "produto encontrado" : "produtos encontrados"}.
              </p>

              {produtos.length === 0 ? (
                <p>Nenhum produto encontrado nesta página.</p>
              ) : (
                <div className="admin__tabela" tabIndex={0}>
                  <table>
                    <caption>Catálogo administrativo</caption>
                    <thead>
                      <tr>
                        <th scope="col">Produto</th>
                        <th scope="col">Código</th>
                        <th scope="col">Categoria</th>
                        <th scope="col">Status</th>
                        <th scope="col">Variantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtos.map((produto) => (
                        <tr key={produto.id}>
                          <td>
                            <strong>{produto.name}</strong>
                            <p className="admin__produto-marca">{produto.brand}</p>
                          </td>
                          <td className="admin__produto-codigo">{produto.sku_base}</td>
                          <td>{produto.category_name || "Sem categoria"}</td>
                          <td>
                            <span className={`admin__status admin__status--${produto.status}`}>
                              {nomesStatus[produto.status]}
                            </span>
                          </td>
                          <td>{produto.variant_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPaginas > 1 && (
                <nav className="admin__paginacao" aria-label="Páginas dos produtos">
                  <button
                    type="button"
                    disabled={pagina <= 1}
                    onClick={() => mudarPagina(pagina - 1)}
                  >
                    Anterior
                  </button>
                  <span>Página {pagina} de {totalPaginas}</span>
                  <button
                    type="button"
                    disabled={pagina >= totalPaginas}
                    onClick={() => mudarPagina(pagina + 1)}
                  >
                    Próxima
                  </button>
                </nav>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

export default AdminProducts;