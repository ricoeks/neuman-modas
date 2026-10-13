import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

function formatarPreco(centavos, moeda) {
  if (!Number.isSafeInteger(centavos) || centavos < 0 || !moeda) {
    return "Preço indisponível";
  }

  return `A partir de ${new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  }).format(centavos / 100)}`;
}

function Home() {
  const [produtos, setProdutos] = useState([]);
  const [destaque, setDestaque] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [erroCategorias, setErroCategorias] = useState("");

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ordenacao, setOrdenacao] = useState("name");
  const [filtros, setFiltros] = useState({
    q: "",
    category: "",
    sort: "name",
  });

  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [erroFiltro, setErroFiltro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function carregarCategorias() {
      try {
        const resposta = await fetch("/api/categories", {
          signal: controller.signal,
        });

        if (!resposta.ok) {
          throw new Error("Não foi possível carregar as categorias.");
        }

        const dados = await resposta.json();

        if (
          !Array.isArray(dados.categorias) ||
          dados.categorias.some(
            (item) =>
              !item ||
              typeof item.slug !== "string" ||
              typeof item.name !== "string"
          )
        ) {
          throw new Error("A resposta das categorias é inválida.");
        }

        if (!controller.signal.aborted) {
          setCategorias(dados.categorias);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErroCategorias(error.message);
        }
      }
    }

    async function carregarDestaque() {
      try {
        const resposta = await fetch("/api/products?limit=12&sort=name", {
          signal: controller.signal,
        });

        if (!resposta.ok) {
          return;
        }

        const dados = await resposta.json();

        if (Array.isArray(dados.produtos) && !controller.signal.aborted) {
          setDestaque(
            dados.produtos.find((produto) => produto.image_url) ?? null
          );
        }
      } catch {
        // A apresentação mantém o monograma se a imagem não carregar.
      }
    }

    carregarCategorias();
    carregarDestaque();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function carregarProdutos() {
      setCarregando(true);
      setErro("");

      try {
        const parametros = new URLSearchParams({
          page: String(pagina),
          limit: "12",
          sort: filtros.sort,
        });

        if (filtros.q) {
          parametros.set("q", filtros.q);
        }

        if (filtros.category) {
          parametros.set("category", filtros.category);
        }

        const resposta = await fetch(`/api/products?${parametros}`, {
          signal: controller.signal,
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados.mensagem || "Não foi possível carregar os produtos."
          );
        }

        if (
          !Array.isArray(dados.produtos) ||
          !Number.isSafeInteger(dados.total) ||
          dados.total < 0 ||
          !Number.isSafeInteger(dados.total_pages) ||
          dados.total_pages < 0 ||
          dados.page !== pagina ||
          dados.limit !== 12
        ) {
          throw new Error("A resposta do catálogo é inválida.");
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

    carregarProdutos();
    return () => controller.abort();
  }, [pagina, filtros, tentativa]);

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
    setErro("");
    setCarregando(true);
    setPagina(1);
    setFiltros({
      q: texto,
      category: categoria,
      sort: ordenacao,
    });
  }

  function limparFiltros() {
    setBusca("");
    setCategoria("");
    setOrdenacao("name");
    setErroFiltro("");
    setErro("");
    setCarregando(true);
    setPagina(1);
    setFiltros({ q: "", category: "", sort: "name" });
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

  const temFiltros = Boolean(filtros.q || filtros.category);

  return (
    <div className="loja">
      <a className="loja__pular" href="#conteudo">
        Pular para o conteúdo
      </a>

      <div className="loja__aviso">
        Seu estilo, sua escolha. Conheça Neumam Modas.
      </div>

      <header className="loja__cabecalho">
        <div className="loja__cabecalho-conteudo">
          <Link className="loja__marca" to="/" aria-label="Neumam Modas — início">
            NEUMAM
            <span>MODAS</span>
          </Link>

          <nav className="loja__nav" aria-label="Navegação principal">
            <a href="#catalogo">Produtos</a>
            <a href="#como-comprar">Como comprar</a>

            <Link className="loja__carrinho" to="/carrinho">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M6 7h12l1 14H5L6 7Z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              Carrinho
            </Link>
          </nav>
        </div>
      </header>

      <main id="conteudo">
        <section className="loja__hero" aria-labelledby="hero-titulo">
          <div className="loja__hero-texto">
            <span className="loja__etiqueta">NEUMAM MODAS</span>

            <h1 id="hero-titulo">
              Elegância para
              <br />
              acompanhar <em>você.</em>
            </h1>

            <p>
              Descubra peças para compor o seu estilo, do trabalho aos
              momentos especiais.
            </p>

            <a className="loja__botao" href="#catalogo">
              Explorar produtos <span aria-hidden="true">↗</span>
            </a>

            <span className="loja__hero-assinatura">
              Seu estilo, sua escolha.
            </span>
          </div>

          <div className="loja__hero-visual">
            {destaque ? (
              <Link
                className="loja__hero-imagem-link"
                to={`/produtos/${encodeURIComponent(destaque.slug)}`}
                aria-label={`Conhecer ${destaque.name}`}
              >
                <img
                  className="loja__hero-imagem"
                  src={destaque.image_url}
                  alt={destaque.image_alt_text || destaque.name}
                  fetchPriority="high"
                />

                <div className="loja__hero-legenda">
                  <span>CONHEÇA A PEÇA</span>
                  <strong>{destaque.name}</strong>
                  <span aria-hidden="true">↗</span>
                </div>
              </Link>
            ) : (
              <div className="loja__hero-placeholder" aria-hidden="true">
                <span>NM</span>
                <p>Seu estilo, sua escolha.</p>
              </div>
            )}
          </div>
        </section>

        <section
          className="loja__catalogo"
          id="catalogo"
          aria-labelledby="catalogo-titulo"
        >
          <div className="loja__secao-cabecalho">
            <div>
              <span className="loja__etiqueta">ESCOLHAS PARA VOCÊ</span>
              <h2 id="catalogo-titulo">Nosso catálogo</h2>
            </div>
            <p>Encontre sua próxima peça favorita.</p>
          </div>

          <form className="loja__filtros" onSubmit={aplicarFiltros}>
            <div className="loja__filtro-campo loja__filtro-busca">
              <label htmlFor="busca-produtos">Buscar produto</label>
              <input
                id="busca-produtos"
                type="search"
                value={busca}
                maxLength={100}
                placeholder="Nome ou código do produto"
                onChange={(event) => {
                  setBusca(event.target.value);
                  setErroFiltro("");
                }}
              />
            </div>

            <div className="loja__filtro-campo">
              <label htmlFor="categoria-produtos">Categoria</label>
              <select
                id="categoria-produtos"
                value={categoria}
                disabled={categorias.length === 0}
                onChange={(event) => setCategoria(event.target.value)}
              >
                <option value="">Todas as categorias</option>
                {categorias.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="loja__filtro-campo">
              <label htmlFor="ordenacao-produtos">Ordenar por</label>
              <select
                id="ordenacao-produtos"
                value={ordenacao}
                onChange={(event) => setOrdenacao(event.target.value)}
              >
                <option value="name">Nome</option>
                <option value="price_asc">Menor preço</option>
                <option value="price_desc">Maior preço</option>
              </select>
            </div>

            <div className="loja__filtro-acoes">
              <button type="submit" disabled={carregando}>
                Aplicar
              </button>
              <button
                className="loja__limpar"
                type="button"
                disabled={carregando}
                onClick={limparFiltros}
              >
                Limpar
              </button>
            </div>
          </form>

          {erroFiltro && <p className="loja__filtro-erro" role="alert">{erroFiltro}</p>}
          {erroCategorias && (
            <p className="loja__filtro-erro" role="alert">
              {erroCategorias} A busca e a ordenação continuam disponíveis.
            </p>
          )}

          <div aria-busy={carregando}>
            {carregando && (
              <div className="loja__estado" role="status">
                Carregando produtos...
              </div>
            )}

            {!carregando && erro && (
              <div className="loja__estado">
                <p role="alert">{erro}</p>
                <button
                  className="loja__botao"
                  type="button"
                  onClick={() => {
                    setCarregando(true);
                    setTentativa((valor) => valor + 1);
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {!carregando && !erro && (
              <>
                <p className="loja__resultado" role="status">
                  {total} {total === 1 ? "produto encontrado" : "produtos encontrados"}
                  {filtros.q ? ` para “${filtros.q}”` : ""}.
                </p>

                {produtos.length === 0 ? (
                  <div className="loja__estado">
                    <p>
                      {temFiltros
                        ? "Nenhum produto corresponde aos filtros escolhidos."
                        : "Nenhum produto disponível nesta página."}
                    </p>
                    <button
                      className="loja__botao"
                      type="button"
                      onClick={limparFiltros}
                    >
                      Voltar ao catálogo completo
                    </button>
                  </div>
                ) : (
                  <div className="loja__grid">
                    {produtos.map((produto) => (
                      <article className="loja__produto" key={produto.id}>
                        <Link
                          className="loja__produto-visual"
                          to={`/produtos/${encodeURIComponent(produto.slug)}`}
                          aria-label={`Ver ${produto.name}`}
                        >
                          {produto.image_url ? (
                            <img
                              src={produto.image_url}
                              alt={produto.image_alt_text || produto.name}
                              loading="lazy"
                            />
                          ) : (
                            <span className="loja__sem-imagem">Imagem em breve</span>
                          )}
                          <span className="loja__produto-seta" aria-hidden="true">↗</span>
                        </Link>

                        <div className="loja__produto-conteudo">
                          <span className="loja__produto-marca">
                            {produto.brand || "Neumam Modas"}
                          </span>
                          <h3>
                            <Link to={`/produtos/${encodeURIComponent(produto.slug)}`}>
                              {produto.name}
                            </Link>
                          </h3>

                          {produto.short_description && (
                            <p className="loja__produto-descricao">
                              {produto.short_description}
                            </p>
                          )}

                          <p className="loja__produto-preco">
                            {formatarPreco(produto.price_cents, produto.currency)}
                          </p>

                          <Link
                            className="loja__produto-link"
                            to={`/produtos/${encodeURIComponent(produto.slug)}`}
                          >
                            Ver cores e tamanhos <span aria-hidden="true">→</span>
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {!erro && totalPaginas > 1 && (
            <nav className="loja__paginacao" aria-label="Páginas do catálogo">
              <button
                type="button"
                disabled={carregando || pagina <= 1}
                onClick={() => mudarPagina(pagina - 1)}
              >
                ← Anterior
              </button>
              <span>Página {pagina} de {totalPaginas}</span>
              <button
                type="button"
                disabled={carregando || pagina >= totalPaginas}
                onClick={() => mudarPagina(pagina + 1)}
              >
                Próxima →
              </button>
            </nav>
          )}
        </section>

        <section
          className="loja__como"
          id="como-comprar"
          aria-labelledby="como-titulo"
        >
          <div className="loja__como-intro">
            <span className="loja__etiqueta">DO SEU JEITO</span>
            <h2 id="como-titulo">Como comprar</h2>
            <p>Escolha suas peças e envie sua solicitação pela loja.</p>
          </div>

          <ol className="loja__passos">
            <li>
              <span className="loja__passo-numero" aria-hidden="true">01</span>
              <h3>Escolha sua peça</h3>
              <p>Confira os detalhes e selecione a cor e o tamanho.</p>
            </li>
            <li>
              <span className="loja__passo-numero" aria-hidden="true">02</span>
              <h3>Envie a solicitação</h3>
              <p>Adicione ao carrinho e informe seus dados de entrega.</p>
            </li>
            <li>
              <span className="loja__passo-numero" aria-hidden="true">03</span>
              <h3>Receba o orçamento</h3>
              <p>A loja informa o frete e o total antes do pagamento.</p>
            </li>
          </ol>
        </section>
      </main>

      <footer className="loja__rodape">
        <div>
          <Link className="loja__marca" to="/">
            NEUMAM
            <span>MODAS</span>
          </Link>
          <p>Seu estilo, sua escolha.</p>
        </div>

        <nav aria-label="Navegação do rodapé">
          <a href="#catalogo">Produtos</a>
          <Link to="/carrinho">Carrinho</Link>
          <Link to="/admin">Área administrativa</Link>
        </nav>

        <p className="loja__copyright">
          © {new Date().getFullYear()} Neumam Modas
        </p>
      </footer>
    </div>
  );
}

export default Home;