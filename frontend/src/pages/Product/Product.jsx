import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProductAttributes from "./ProductAttributes";
import ProductTags from "./ProductTags";

async function lerResposta(resposta) {
  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      dados.mensagem || "Não foi possível concluir a operação."
    );
  }

  return dados;
}

function Product() {
  const { slug } = useParams();

  const [produto, setProduto] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [varianteId, setVarianteId] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [mensagemCarrinho, setMensagemCarrinho] = useState("");
  const [erroCarrinho, setErroCarrinho] = useState("");

  const requisicaoCarrinho = useRef(null);

  const varianteSelecionada = produto?.variantes?.find(
    (variante) => String(variante.id) === varianteId
  );

  const precoCentavos =
    varianteSelecionada?.promotional_price_cents ??
    varianteSelecionada?.sale_price_cents;

  const podeAdicionar =
    Boolean(varianteSelecionada) &&
    ["available", "low_stock"].includes(
      varianteSelecionada?.availability_status
    ) &&
    varianteSelecionada.available_quantity > 0 &&
    Number.isSafeInteger(precoCentavos) &&
    precoCentavos >= 0 &&
    varianteSelecionada.currency === "BRL";

  useEffect(() => {
    const controller = new AbortController();

    async function carregarProduto() {
      try {
        setCarregando(true);
        setErro("");
        setProduto(null);
        setVarianteId("");
        setMensagemCarrinho("");
        setErroCarrinho("");
        setAdicionando(false);

        const resposta = await fetch(
          `/api/products/${encodeURIComponent(slug)}`,
          { signal: controller.signal }
        );

        const dados = await lerResposta(resposta);

        if (!dados.produto) {
          throw new Error("A resposta do produto é inválida.");
        }

        if (!controller.signal.aborted) {
          setProduto(dados.produto);
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

    carregarProduto();

    return () => {
      controller.abort();
      requisicaoCarrinho.current?.abort();
      requisicaoCarrinho.current = null;
    };
  }, [slug]);

  async function adicionarAoCarrinho() {
    if (!podeAdicionar || requisicaoCarrinho.current) {
      return;
    }

    const controller = new AbortController();
    requisicaoCarrinho.current = controller;

    setAdicionando(true);
    setMensagemCarrinho("");
    setErroCarrinho("");

    try {
      const consulta = await fetch("/api/carts", {
        credentials: "same-origin",
        signal: controller.signal,
      });

      if (consulta.status === 404) {
        const criacao = await fetch("/api/carts", {
          method: "POST",
          credentials: "same-origin",
          signal: controller.signal,
        });

        await lerResposta(criacao);
      } else {
        await lerResposta(consulta);
      }

      const resposta = await fetch("/api/carts/items", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variant_id: varianteSelecionada.id,
          quantity: 1,
        }),
        signal: controller.signal,
      });

      const dados = await lerResposta(resposta);

      if (!controller.signal.aborted) {
        const total = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: dados.carrinho.currency,
        }).format(dados.carrinho.total_cents / 100);

        setMensagemCarrinho(
          `Produto adicionado! Total do carrinho: ${total}.`
        );
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setErroCarrinho(error.message);
      }
    } finally {
      if (requisicaoCarrinho.current === controller) {
        requisicaoCarrinho.current = null;

        if (!controller.signal.aborted) {
          setAdicionando(false);
        }
      }
    }
  }

  return (
    <main className="catalogo">
      <Link to="/">← Voltar ao catálogo</Link>

      {carregando && <p role="status">Carregando produto...</p>}
      {erro && <p role="alert">{erro}</p>}

      {!carregando && !erro && produto && (
        <article className="produto-detalhe">
          <h1>{produto.name}</h1>

          {produto.imagens?.length > 0 ? (
            <img
              className="produto-detalhe__imagem"
              src={produto.imagens[0].url}
              alt={produto.imagens[0].alt_text || produto.name}
            />
          ) : (
            <p>Imagem em breve.</p>
          )}

          <p>{produto.description}</p>

          <div className="produto-detalhe__opcoes">
            <label htmlFor="variante">
              Escolha a cor e o tamanho
            </label>

            <select
              id="variante"
              value={varianteId}
              disabled={adicionando}
              onChange={(event) => {
                setVarianteId(event.target.value);
                setMensagemCarrinho("");
                setErroCarrinho("");
              }}
            >
              <option value="">Selecione uma opção</option>

              {(produto.variantes ?? []).map((variante) => (
                <option
                  key={variante.id}
                  value={String(variante.id)}
                >
                  {variante.color_name || "Cor não informada"} —{" "}
                  {variante.size_name || "Tamanho não informado"}
                </option>
              ))}
            </select>

            {varianteSelecionada && (
              <>
                <p
                  className="produto-detalhe__preco"
                  aria-live="polite"
                >
                  {precoCentavos != null &&
                  varianteSelecionada.currency
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: varianteSelecionada.currency,
                      }).format(precoCentavos / 100)
                    : "Preço indisponível"}
                </p>

                <p aria-live="polite">
                  {["available", "low_stock"].includes(
                    varianteSelecionada.availability_status
                  ) && varianteSelecionada.available_quantity > 0
                    ? "Disponível"
                    : varianteSelecionada.availability_status ===
                        "preorder"
                      ? "Disponível sob encomenda"
                      : "Indisponível no momento"}
                </p>
              </>
            )}

            <button
              type="button"
              className="produto-detalhe__adicionar"
              disabled={!podeAdicionar || adicionando}
              onClick={adicionarAoCarrinho}
            >
              {adicionando
                ? "Adicionando..."
                : "Adicionar ao carrinho"}
                <Link to="/carrinho">Ver meu carrinho</Link>
            </button>

            {mensagemCarrinho && (
              <p role="status">{mensagemCarrinho}</p>
            )}

            {erroCarrinho && (
              <p role="alert">{erroCarrinho}</p>
            )}
          </div>

          <ProductAttributes atributos={produto.atributos ?? []} />
          <ProductTags tags={produto.tags ?? []} />
        </article>
      )}
    </main>
  );
}

export default Product;