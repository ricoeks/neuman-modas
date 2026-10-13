import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Cart.css";

function formatarPreco(centavos, moeda) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  }).format(centavos / 100);
}

function validarCarrinho(dados) {
  if (!dados.carrinho || !Array.isArray(dados.carrinho.itens)) {
    throw new Error("A resposta do carrinho é inválida.");
  }

  return dados.carrinho;
}

function Cart() {
  const [carrinho, setCarrinho] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [erroAcao, setErroAcao] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [atualizando, setAtualizando] = useState(false);

  const requisicaoAcao = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function carregarCarrinho() {
      try {
        const resposta = await fetch("/api/carts", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (resposta.status === 404) {
          return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados.mensagem || "Não foi possível carregar o carrinho."
          );
        }

        const recebido = validarCarrinho(dados);

        if (!controller.signal.aborted) {
          setCarrinho(recebido);
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

    carregarCarrinho();

    return () => {
      controller.abort();
      requisicaoAcao.current?.abort();
      requisicaoAcao.current = null;
    };
  }, []);

  async function atualizarItem(itemId, metodo, quantidade) {
    if (requisicaoAcao.current) {
      return;
    }

    const controller = new AbortController();
    requisicaoAcao.current = controller;

    setAtualizando(true);
    setErroAcao("");
    setMensagem("");

    try {
      const opcoes = {
        method: metodo,
        credentials: "same-origin",
        signal: controller.signal,
      };

      if (metodo === "PATCH") {
        opcoes.headers = { "Content-Type": "application/json" };
        opcoes.body = JSON.stringify({ quantity: quantidade });
      }

      const resposta = await fetch(
        `/api/carts/items/${itemId}`,
        opcoes
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem || "Não foi possível atualizar o carrinho."
        );
      }

      const recebido = validarCarrinho(dados);

      if (!controller.signal.aborted) {
        setCarrinho(recebido);
        setMensagem(dados.mensagem || "Carrinho atualizado.");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setErroAcao(error.message);
      }
    } finally {
      if (requisicaoAcao.current === controller) {
        requisicaoAcao.current = null;

        if (!controller.signal.aborted) {
          setAtualizando(false);
        }
      }
    }
  }

  const vazio = !carrinho || carrinho.itens.length === 0;
  const quantidadeTotal =
    carrinho?.itens.reduce((total, item) => total + item.quantity, 0) ?? 0;

  return (
    <div className="carrinho-pagina">
      <header className="carrinho__cabecalho">
        <Link className="carrinho__marca" to="/" aria-label="Neumam Modas — início">
          NEUMAM
          <span>MODAS</span>
        </Link>

        <Link className="carrinho__voltar" to="/">
          <span aria-hidden="true">←</span> Continuar comprando
        </Link>
      </header>

      <main className="carrinho">
        <div className="carrinho__titulo">
          <span className="carrinho__etiqueta">SUAS ESCOLHAS</span>
          <h1>Meu carrinho</h1>
          <p>Confira suas peças antes de enviar a solicitação.</p>
        </div>

        {carregando && (
          <p className="carrinho__aviso" role="status">
            Carregando carrinho...
          </p>
        )}

        {erro && (
          <p className="carrinho__erro" role="alert">
            {erro}
          </p>
        )}

        {atualizando && (
          <p className="carrinho__mensagem" role="status">
            Atualizando carrinho...
          </p>
        )}

        {mensagem && (
          <p className="carrinho__mensagem" role="status">
            {mensagem}
          </p>
        )}

        {erroAcao && (
          <p className="carrinho__erro" role="alert">
            {erroAcao}
          </p>
        )}

        {!carregando && !erro && vazio && (
          <section className="carrinho__vazio">
            <span className="carrinho__vazio-simbolo" aria-hidden="true">
              NM
            </span>
            <h2>Seu próximo look começa aqui</h2>
            <p>
              Seu carrinho está vazio. Conheça o catálogo e escolha
              uma peça para você.
            </p>
            <Link className="carrinho__botao" to="/">
              Explorar produtos <span aria-hidden="true">↗</span>
            </Link>
          </section>
        )}

        {!carregando && !erro && !vazio && (
          <div className="carrinho__layout" aria-busy={atualizando}>
            <section aria-labelledby="pecas-titulo">
              <div className="carrinho__lista-titulo">
                <h2 id="pecas-titulo">Suas peças</h2>
                <span>
                  {quantidadeTotal} {quantidadeTotal === 1 ? "unidade" : "unidades"}
                </span>
              </div>

              <ul className="carrinho__itens">
                {carrinho.itens.map((item) => {
                  const opcao = `${
                    item.color_name || "Cor não informada"
                  }, ${item.size_name || "Tamanho não informado"}`;

                  return (
                    <li className="carrinho__item" key={item.id}>
                      <div className="carrinho__item-topo">
                        <div>
                          <span className="carrinho__etiqueta">
                            NEUMAM MODAS
                          </span>
                          <h3>{item.product_name}</h3>
                          <p className="carrinho__variante">
                            {item.color_name || "Cor não informada"} —{" "}
                            {item.size_name || "Tamanho não informado"}
                          </p>
                        </div>

                        <p className="carrinho__valor-item">
                          <span>Total do item</span>
                          <strong>
                            {formatarPreco(item.line_total_cents, item.currency)}
                          </strong>
                        </p>
                      </div>

                      <p className="carrinho__unitario">
                        Preço unitário:{" "}
                        {formatarPreco(item.unit_price_cents, item.currency)}
                      </p>

                      <div className="carrinho__item-acoes">
                        <div className="carrinho__quantidade">
                          <span>Quantidade</span>

                          <div className="carrinho__controle">
                            <button
                              type="button"
                              disabled={atualizando || item.quantity <= 1}
                              aria-label={`Diminuir quantidade de ${item.product_name}, ${opcao}`}
                              onClick={() =>
                                atualizarItem(item.id, "PATCH", item.quantity - 1)
                              }
                            >
                              −
                            </button>

                            <span className="carrinho__numero">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              disabled={atualizando || item.quantity >= 100}
                              aria-label={`Aumentar quantidade de ${item.product_name}, ${opcao}`}
                              onClick={() =>
                                atualizarItem(item.id, "PATCH", item.quantity + 1)
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="carrinho__remover"
                          disabled={atualizando}
                          aria-label={`Remover ${item.product_name}, ${opcao} do carrinho`}
                          onClick={() => atualizarItem(item.id, "DELETE")}
                        >
                          Remover item
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside
              className="carrinho__resumo"
              aria-labelledby="resumo-titulo"
            >
              <span className="carrinho__etiqueta">PRÓXIMO PASSO</span>
              <h2 id="resumo-titulo">Resumo do carrinho</h2>

              <dl>
                <div>
                  <dt>Subtotal</dt>
                  <dd>
                    {formatarPreco(carrinho.subtotal_cents, carrinho.currency)}
                  </dd>
                </div>

                <div>
                  <dt>Desconto</dt>
                  <dd>
                    {formatarPreco(
                      carrinho.discount_total_cents,
                      carrinho.currency
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Frete</dt>
                  <dd>
                    {carrinho.shipping_total_cents > 0
                      ? formatarPreco(
                          carrinho.shipping_total_cents,
                          carrinho.currency
                        )
                      : "Sob consulta"}
                  </dd>
                </div>

                <div className="carrinho__total">
                  <dt>Total atual</dt>
                  <dd>
                    {formatarPreco(carrinho.total_cents, carrinho.currency)}
                  </dd>
                </div>
              </dl>

              <p className="carrinho__frete-info">
                {carrinho.shipping_total_cents > 0
                  ? "O frete informado está incluído no total atual."
                  : "O total atual não inclui o frete. A loja informa o valor da entrega antes do pagamento."}
              </p>

              {atualizando ? (
                <button
                  className="carrinho__botao"
                  type="button"
                  disabled
                >
                  Atualizando carrinho...
                </button>
              ) : (
                <Link className="carrinho__botao" to="/finalizar">
                  Continuar <span aria-hidden="true">→</span>
                </Link>
              )}

              <p className="carrinho__proximo">
                Na próxima etapa, informe seus dados de contato e entrega.
              </p>
            </aside>
          </div>
        )}
      </main>

      <footer className="carrinho__rodape">
        <span>Neumam Modas</span>
        <p>Seu estilo, sua escolha.</p>
      </footer>
    </div>
  );
}

export default Cart;