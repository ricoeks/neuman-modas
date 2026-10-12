import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Admin.css";

function formatarPreco(valor, moeda) {
  if (!Number.isSafeInteger(valor) || valor < 0) {
    return "Ainda não definido";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  }).format(valor / 100);
}

function validarAdmin(dados) {
  if (
    !dados?.admin ||
    !Number.isSafeInteger(dados.admin.id) ||
    !Array.isArray(dados.admin.permissions)
  ) {
    throw new Error("A resposta da sessão é inválida.");
  }

  return dados.admin;
}

function Admin() {
  const [admin, setAdmin] = useState(null);
  const [verificando, setVerificando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [carregandoPedidos, setCarregandoPedidos] = useState(false);
  const [erroPedidos, setErroPedidos] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [atualizacao, setAtualizacao] = useState(0);

  const [busca, setBusca] = useState("");
  const [situacaoFrete, setSituacaoFrete] = useState("");
  const [filtros, setFiltros] = useState({
    q: "",
    shippingStatus: "",
  });
  const [erroFiltros, setErroFiltros] = useState("");

  const acaoAtual = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function verificarSessao() {
      try {
        const resposta = await fetch("/api/admin/auth/me", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (resposta.status === 401) {
          return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados?.mensagem || "Não foi possível verificar a sessão."
          );
        }

        const recebido = validarAdmin(dados);

        if (!controller.signal.aborted) {
          setAdmin(recebido);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErro(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setVerificando(false);
        }
      }
    }

    verificarSessao();

    return () => {
      controller.abort();
      acaoAtual.current?.abort();
      acaoAtual.current = null;
    };
  }, []);

  useEffect(() => {
    if (!admin || !admin.permissions.includes("orders.read")) {
      return;
    }

    const controller = new AbortController();

    async function carregarPedidos() {
      setCarregandoPedidos(true);
      setErroPedidos("");
      setPedidos([]);

      try {
        const parametros = new URLSearchParams({
          page: String(page),
          limit: "20",
        });

        if (filtros.q) {
          parametros.set("q", filtros.q);
        }

        if (filtros.shippingStatus) {
          parametros.set("shipping_status", filtros.shippingStatus);
        }

        const resposta = await fetch(
          `/api/admin/orders?${parametros.toString()}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (resposta.status === 401) {
          if (!controller.signal.aborted) {
            setAdmin(null);
            setErro("Sua sessão expirou. Entre novamente.");
            setTotal(0);
            setTotalPages(0);
          }
          return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados?.mensagem || "Não foi possível carregar os pedidos."
          );
        }

        if (
          !Array.isArray(dados.pedidos) ||
          !Number.isSafeInteger(dados.total) ||
          dados.total < 0 ||
          !Number.isSafeInteger(dados.total_pages) ||
          dados.total_pages < 0 ||
          dados.page !== page ||
          dados.pedidos.some(
            (pedido) =>
              !pedido ||
              !Number.isSafeInteger(pedido.id) ||
              pedido.currency !== "BRL"
          )
        ) {
          throw new Error("A resposta dos pedidos é inválida.");
        }

        if (!controller.signal.aborted) {
          setPedidos(dados.pedidos);
          setTotal(dados.total);
          setTotalPages(dados.total_pages);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErroPedidos(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregandoPedidos(false);
        }
      }
    }

    carregarPedidos();
    return () => controller.abort();
  }, [admin, page, atualizacao, filtros]);

  function aplicarFiltros(event) {
    event.preventDefault();

    const texto = busca.trim();

    if (
      texto.length > 100 ||
      Array.from(texto).some((caractere) => caractere.charCodeAt(0) < 32 || caractere.charCodeAt(0) === 127)
    ) {
      setErroFiltros("Use uma busca com até 100 caracteres.");
      return;
    }

    setErroFiltros("");
    setCarregandoPedidos(true);
    setPage(1);
    setFiltros({
      q: texto,
      shippingStatus: situacaoFrete,
    });
  }

  function limparFiltros() {
    setBusca("");
    setSituacaoFrete("");
    setErroFiltros("");
    setCarregandoPedidos(true);
    setPage(1);
    setFiltros({ q: "", shippingStatus: "" });
  }

  async function entrar(event) {
    event.preventDefault();

    if (acaoAtual.current) {
      return;
    }

    const formulario = event.currentTarget;
    const campos = new FormData(formulario);
    const email = String(campos.get("email") || "").trim();
    const password = String(campos.get("password") || "");

    const controller = new AbortController();
    acaoAtual.current = controller;
    setOcupado(true);
    setErro("");

    try {
      const resposta = await fetch("/api/admin/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Neumam-Request": "1",
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados?.mensagem || "Não foi possível entrar.");
      }

      const recebido = validarAdmin(dados);

      if (!controller.signal.aborted) {
        formulario.reset();
        setPage(1);
        setBusca("");
        setSituacaoFrete("");
        setFiltros({ q: "", shippingStatus: "" });
        setErroFiltros("");
        setAdmin(recebido);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setErro(error.message);
      }
    } finally {
      if (acaoAtual.current === controller) {
        acaoAtual.current = null;

        if (!controller.signal.aborted) {
          setOcupado(false);
        }
      }
    }
  }

  async function sair() {
    if (acaoAtual.current) {
      return;
    }

    const controller = new AbortController();
    acaoAtual.current = controller;
    setOcupado(true);
    setErro("");

    try {
      const resposta = await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-Neumam-Request": "1",
        },
        signal: controller.signal,
      });

      if (!resposta.ok) {
        throw new Error("Não foi possível encerrar a sessão.");
      }

      if (!controller.signal.aborted) {
        setAdmin(null);
        setPedidos([]);
        setTotal(0);
        setTotalPages(0);
        setPage(1);
        setErroPedidos("");
        setBusca("");
        setSituacaoFrete("");
        setFiltros({ q: "", shippingStatus: "" });
        setErroFiltros("");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setErro(error.message);
      }
    } finally {
      if (acaoAtual.current === controller) {
        acaoAtual.current = null;

        if (!controller.signal.aborted) {
          setOcupado(false);
        }
      }
    }
  }

  return (
    <main className="admin">
      <Link to="/">← Voltar à loja</Link>
      <h1>Administração Neumam Modas</h1>

      {verificando ? (
        <p role="status">Verificando sessão...</p>
      ) : !admin ? (
        <form className="admin__login" onSubmit={entrar}>
          <h2>Entrar</h2>

          <fieldset disabled={ocupado}>
            <label htmlFor="admin-email">E-mail</label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              maxLength={254}
              required
            />

            <label htmlFor="admin-password">Senha</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />

            <button type="submit">
              {ocupado ? "Entrando..." : "Entrar"}
            </button>
          </fieldset>

          {erro && <p role="alert">{erro}</p>}
        </form>
      ) : (
        <>
          <div className="admin__cabecalho">
            <p>Conta: <strong>{admin.name}</strong></p>
            <button type="button" onClick={sair} disabled={ocupado}>
              {ocupado ? "Saindo..." : "Sair"}
            </button>
          </div>

          {erro && <p role="alert">{erro}</p>}

          {!admin.permissions.includes("orders.read") ? (
            <p>Sua conta não possui permissão para consultar pedidos.</p>
          ) : (
            <section aria-labelledby="admin-pedidos-titulo">
              <div className="admin__cabecalho">
                <h2 id="admin-pedidos-titulo">Solicitações</h2>
                <button
                  type="button"
                  disabled={carregandoPedidos || ocupado}
                  onClick={() => {
                    setCarregandoPedidos(true);
                    setAtualizacao((valor) => valor + 1);
                  }}
                >
                  Atualizar
                </button>
              </div>

              <form
                className="admin__filtros"
                onSubmit={aplicarFiltros}
              >
                <fieldset disabled={ocupado || carregandoPedidos}>
                  <div className="admin__filtro-campo">
                    <label htmlFor="admin-busca">
                      Número do pedido ou nome do cliente
                    </label>
                    <input
                      id="admin-busca"
                      type="search"
                      maxLength={100}
                      value={busca}
                      placeholder="Ex.: Cliente Teste ou NM-"
                      onChange={(event) => setBusca(event.target.value)}
                    />
                  </div>

                  <div className="admin__filtro-campo">
                    <label htmlFor="admin-frete">Situação do frete</label>
                    <select
                      id="admin-frete"
                      value={situacaoFrete}
                      onChange={(event) =>
                        setSituacaoFrete(event.target.value)
                      }
                    >
                      <option value="">Todas</option>
                      <option value="awaiting_quote">
                        Aguardando orçamento
                      </option>
                      <option value="quoted">Frete informado</option>
                      <option value="not_requested">Não solicitado</option>
                    </select>
                  </div>

                  <div className="admin__filtro-acoes">
                    <button type="submit">Aplicar filtros</button>
                    <button type="button" onClick={limparFiltros}>
                      Limpar
                    </button>
                  </div>
                </fieldset>

                {erroFiltros && <p role="alert">{erroFiltros}</p>}
              </form>

              {carregandoPedidos && (
                <p role="status">Carregando pedidos...</p>
              )}
              {erroPedidos && <p role="alert">{erroPedidos}</p>}

              {!carregandoPedidos && !erroPedidos && (
                <>
                  <p>Total de solicitações encontradas: {total}</p>

                  {pedidos.length === 0 ? (
                    <p>Nenhum pedido encontrado nesta página.</p>
                  ) : (
                    <div className="admin__tabela">
                      <table>
                        <caption>Pedidos da loja</caption>
                        <thead>
                          <tr>
                            <th scope="col">Pedido</th>
                            <th scope="col">Cliente</th>
                            <th scope="col">Situação</th>
                            <th scope="col">Produtos</th>
                            <th scope="col">Frete</th>
                            <th scope="col">Total</th>
                          </tr>
                        </thead>

                        <tbody>
                          {pedidos.map((pedido) => (
                            <tr key={pedido.id}>
                              <td className="admin__numero">
                                <Link to={`/admin/pedidos/${pedido.id}`}>
                                  {pedido.order_number}
                                </Link>
                                <br />
                                <Link to={`/admin/pedidos/${pedido.id}`}>
                                  Ver pedido
                                </Link>
                              </td>
                              <td>
                                {pedido.customer_name || "Não informado"}
                              </td>
                              <td>
                                {pedido.status === "pending"
                                  ? "Pendente"
                                  : pedido.status}
                              </td>
                              <td>
                                {formatarPreco(
                                  pedido.subtotal_cents,
                                  pedido.currency
                                )}
                              </td>
                              <td>
                                {pedido.shipping_status === "quoted"
                                  ? formatarPreco(
                                      pedido.shipping_total_cents,
                                      pedido.currency
                                    )
                                  : pedido.shipping_status === "awaiting_quote"
                                    ? "Aguardando orçamento"
                                    : "Não solicitado"}
                              </td>
                              <td>
                                {formatarPreco(
                                  pedido.total_cents,
                                  pedido.currency
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <nav
                    className="admin__paginacao"
                    aria-label="Páginas dos pedidos"
                  >
                    <button
                      type="button"
                      disabled={page <= 1 || ocupado}
                      onClick={() => {
                        setCarregandoPedidos(true);
                        setPage((valor) => valor - 1);
                      }}
                    >
                      Anterior
                    </button>
                    <span>
                      Página {page} de {Math.max(1, totalPages)}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages || ocupado}
                      onClick={() => {
                        setCarregandoPedidos(true);
                        setPage((valor) => valor + 1);
                      }}
                    >
                      Próxima
                    </button>
                  </nav>
                </>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default Admin;