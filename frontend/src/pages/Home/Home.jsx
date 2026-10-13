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
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function carregarProdutos() {
      setCarregando(true);
      setErro("");

      try {
        const resposta = await fetch("/api/products?limit=12", {
          signal: controller.signal,
        });

        if (!resposta.ok) {
          throw new Error("Não foi possível carregar os produtos.");
        }

        const dados = await resposta.json();

        if (!Array.isArray(dados.produtos)) {
          throw new Error("A resposta do catálogo é inválida.");
        }

        if (!controller.signal.aborted) {
          setProdutos(dados.produtos);
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
  }, [tentativa]);

  const destaque = produtos.find((produto) => produto.image_url);

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
          aria-busy={carregando}
        >
          <div className="loja__secao-cabecalho">
            <div>
              <span className="loja__etiqueta">ESCOLHAS PARA VOCÊ</span>
              <h2 id="catalogo-titulo">Nosso catálogo</h2>
            </div>

            <p>Encontre sua próxima peça favorita.</p>
          </div>

          {carregando && (
            <div className="loja__estado" role="status">
              Carregando produtos...
            </div>
          )}

          {erro && (
            <div className="loja__estado">
              <p role="alert">{erro}</p>
              <button
                className="loja__botao"
                type="button"
                onClick={() => setTentativa((valor) => valor + 1)}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!carregando && !erro && produtos.length === 0 && (
            <div className="loja__estado">
              Nenhum produto disponível no momento.
            </div>
          )}

          {!carregando && !erro && produtos.length > 0 && (
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

                    <span className="loja__produto-seta" aria-hidden="true">
                      ↗
                    </span>
                  </Link>

                  <div className="loja__produto-conteudo">
                    <span className="loja__produto-marca">
                      {produto.brand || "Neumam Modas"}
                    </span>

                    <h3>
                      <Link
                        to={`/produtos/${encodeURIComponent(produto.slug)}`}
                      >
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