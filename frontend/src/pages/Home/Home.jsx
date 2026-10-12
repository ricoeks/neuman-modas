import { useEffect, useState } from "react";
import "./Home.css";
import { Link } from "react-router-dom";

const formatarPreco = (centavos, moeda) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  }).format(centavos / 100);

function Home() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function carregarProdutos() {
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

        setProdutos(dados.produtos);
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
  }, []);

  return (
    <main className="home">
      <section className="hero">
        <h1 className="hero__title">
          Neumam <span>Modas</span>
        </h1>

        <p className="hero__slogan">Seu estilo, sua escolha.</p>
      </section>

      <section className="catalogo" aria-labelledby="catalogo-titulo">
        <h2 id="catalogo-titulo">Conheça nossos produtos</h2>

        {carregando && <p role="status">Carregando produtos...</p>}

        {erro && <p role="alert">{erro}</p>}

        {!carregando && !erro && produtos.length === 0 && (
          <p>Nenhum produto disponível no momento.</p>
        )}

        {!carregando && !erro && (
          <div className="catalogo__grid">
            {produtos.map((produto) => (
              <article className="produto-card" key={produto.id}>
                {produto.image_url ? (
                  <img
                    className="produto-card__imagem"
                    src={produto.image_url}
                    alt={produto.image_alt_text || produto.name}
                    loading="lazy"
                  />
                ) : (
                  <div className="produto-card__sem-imagem">
                    Imagem em breve
                  </div>
                )}

                <div className="produto-card__conteudo">
                  <h3>{produto.name}</h3>
                  <p>{produto.short_description}</p>

                  <p className="produto-card__preco">
                    {produto.price_cents !== null &&
                    produto.price_cents !== undefined &&
                    produto.currency
                      ? `A partir de ${formatarPreco(
                          produto.price_cents,
                          produto.currency
                        )}`
                      : "Preço indisponível"}
                  </p>
                  <Link
  className="produto-card__link"
  to={`/produtos/${encodeURIComponent(produto.slug)}`}
>
  Ver produto
</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Home;