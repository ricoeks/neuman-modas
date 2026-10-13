import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProductAttributes from "./ProductAttributes";
import ProductTags from "./ProductTags";
import "./Product.css";

async function lerResposta(resposta) {
  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      dados.mensagem || "Não foi possível concluir a operação."
    );
  }

  return dados;
}

function formatarPreco(centavos, moeda) {
  if (!Number.isSafeInteger(centavos) || centavos < 0 || !moeda) {
    return "Preço indisponível";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  }).format(centavos / 100);
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

  const disponivel =
    Boolean(varianteSelecionada) &&
    ["available", "low_stock"].includes(
      varianteSelecionada?.availability_status
    ) &&
    varianteSelecionada.available_quantity > 0;

  const podeAdicionar =
    disponivel &&
    Number.isSafeInteger(precoCentavos) &&
    precoCentavos >= 0 &&
    varianteSelecionada.currency === "BRL";

  const imagens = produto?.imagens ?? [];
  const imagem =
    imagens.find(
      (item) => String(item.variant_id) === varianteId && varianteId !== ""
    ) ??
    imagens.find((item) => item.variant_id == null) ??
    imagens[0];

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

        if (
          !dados.produto ||
          !Array.isArray(dados.produto.variantes) ||
          !Array.isArray(dados.produto.imagens)
        ) {
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
        cache: "no-store",
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant_id: varianteSelecionada.id,
          quantity: 1,
        }),
        signal: controller.signal,
      });

      const dados = await lerResposta(resposta);

      if (
        !dados.carrinho ||
        !Number.isSafeInteger(dados.carrinho.total_cents) ||
        dados.carrinho.total_cents < 0 ||
        dados.carrinho.currency !== "BRL"
      ) {
        throw new Error(
          "Confira seu carrinho para verificar se a peça foi adicionada."
        );
      }

      if (!controller.signal.aborted) {
        setMensagemCarrinho(
          `Produto adicionado! Total atual do carrinho: ${formatarPreco(
            dados.carrinho.total_cents,
            dados.carrinho.currency
          )}.`
        );
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setErroCarrinho(
          error instanceof TypeError
            ? "A conexão falhou. Confira seu carrinho antes de tentar adicionar novamente."
            : error.message
        );
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
    <div className="peca-pagina">
      <header className="peca__cabecalho">
        <Link className="peca__marca" to="/" aria-label="Neumam Modas — início">
          NEUMAM
          <span>MODAS</span>
        </Link>

        <Link className="peca__nav-link" to="/carrinho">
          Meu carrinho <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <main className="peca">
        <Link className="peca__voltar" to="/">
          ← Voltar ao catálogo
        </Link>

        {carregando && (
          <p className="peca__aviso" role="status">
            Carregando produto...
          </p>
        )}

        {erro && (
          <p className="peca__erro" role="alert">
            {erro}
          </p>
        )}

        {!carregando && !erro && produto && (
          <article>
            <div className="peca__layout">
              <div className="peca__visual">
                {imagem ? (
                  <img
                    className="peca__imagem"
                    src={imagem.url}
                    alt={imagem.alt_text || produto.name}
                  />
                ) : (
                  <div className="peca__sem-imagem">Imagem em breve</div>
                )}
              </div>

              <div className="peca__informacoes">
                <span className="peca__etiqueta">
                  {produto.brand || "Neumam Modas"}
                </span>

                <h1>{produto.name}</h1>

                <p className="peca__descricao">
                  {produto.description || produto.short_description}
                </p>

                <div className="peca__opcoes">
                  <label htmlFor="variante">Escolha a cor e o tamanho</label>

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

                    {produto.variantes.map((variante) => (
                      <option key={variante.id} value={String(variante.id)}>
                        {variante.color_name || "Cor não informada"} —{" "}
                        {variante.size_name || "Tamanho não informado"}
                      </option>
                    ))}
                  </select>

                  {varianteSelecionada ? (
                    <div className="peca__preco-disponibilidade" aria-live="polite">
                      <p className="peca__preco">
                        {formatarPreco(
                          precoCentavos,
                          varianteSelecionada.currency
                        )}
                      </p>

                      <p className="peca__disponibilidade">
                        {disponivel
                          ? "Disponível"
                          : varianteSelecionada.availability_status === "preorder"
                            ? "Sob encomenda — consulte a loja"
                            : "Indisponível no momento"}
                      </p>
                    </div>
                  ) : (
                    <p className="peca__orientacao">
                      Selecione uma opção para consultar o preço e a disponibilidade.
                    </p>
                  )}

                  <button
                    type="button"
                    className="peca__adicionar"
                    disabled={!podeAdicionar || adicionando}
                    onClick={adicionarAoCarrinho}
                  >
                    {adicionando ? "Adicionando..." : "Adicionar ao carrinho"}
                  </button>

                  <Link className="peca__ver-carrinho" to="/carrinho">
                    Ver meu carrinho <span aria-hidden="true">→</span>
                  </Link>

                  {mensagemCarrinho && (
                    <p className="peca__sucesso" role="status">
                      {mensagemCarrinho}
                    </p>
                  )}

                  {erroCarrinho && (
                    <p className="peca__erro" role="alert">
                      {erroCarrinho}
                    </p>
                  )}
                </div>

                <div className="peca__entrega">
                  <strong>Entrega com frete sob consulta</strong>
                  <p>
                    Envie sua solicitação pelo carrinho. A loja informa o
                    frete e o total antes do pagamento.
                  </p>
                </div>
              </div>
            </div>

            <div className="peca__detalhes">
              <ProductAttributes atributos={produto.atributos ?? []} />
              <ProductTags tags={produto.tags ?? []} />
            </div>
          </article>
        )}
      </main>

      <footer className="peca__rodape">
        <span>Neumam Modas</span>
        <p>Seu estilo, sua escolha.</p>
      </footer>
    </div>
  );
}

export default Product;