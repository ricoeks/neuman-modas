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
        opcoes.headers = {
          "Content-Type": "application/json",
        };
        opcoes.body = JSON.stringify({
          quantity: quantidade,
        });
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
        setMensagem(
          dados.mensagem || "Carrinho atualizado."
        );
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

  return (
    <main className="catalogo carrinho">
      <Link to="/">← Continuar comprando</Link>

      <h1>Meu carrinho</h1>

      {carregando && <p role="status">Carregando carrinho...</p>}
      {erro && <p role="alert">{erro}</p>}

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
        <p>Seu carrinho está vazio.</p>
      )}

      {!carregando && !erro && !vazio && (
        <div
          className="carrinho__layout"
          aria-busy={atualizando}
        >
          <ul className="carrinho__itens">
            {carrinho.itens.map((item) => (
              <li className="carrinho__item" key={item.id}>
                <h2>{item.product_name}</h2>

                <p>
                  {item.color_name || "Cor não informada"} —{" "}
                  {item.size_name || "Tamanho não informado"}
                </p>

                <div className="carrinho__quantidade">
                  <span>Quantidade:</span>

                  <button
                    type="button"
                    disabled={atualizando || item.quantity <= 1}
                    aria-label={`Diminuir quantidade de ${item.product_name}, ${item.color_name}, ${item.size_name}`}
                    onClick={() =>
                      atualizarItem(
                        item.id,
                        "PATCH",
                        item.quantity - 1
                      )
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
                    aria-label={`Aumentar quantidade de ${item.product_name}, ${item.color_name}, ${item.size_name}`}
                    onClick={() =>
                      atualizarItem(
                        item.id,
                        "PATCH",
                        item.quantity + 1
                      )
                    }
                  >
                    +
                  </button>
                </div>

                <p>
                  Preço unitário:{" "}
                  {formatarPreco(
                    item.unit_price_cents,
                    item.currency
                  )}
                </p>

                <p className="carrinho__valor-item">
                  Total do item:{" "}
                  {formatarPreco(
                    item.line_total_cents,
                    item.currency
                  )}
                </p>

                <button
                  type="button"
                  className="carrinho__remover"
                  disabled={atualizando}
                  aria-label={`Remover ${item.product_name}, ${item.color_name}, ${item.size_name} do carrinho`}
                  onClick={() =>
                    atualizarItem(item.id, "DELETE")
                  }
                >
                  Remover item
                </button>
              </li>
            ))}
          </ul>

          <aside
            className="carrinho__resumo"
            aria-labelledby="resumo-titulo"
          >
            <h2 id="resumo-titulo">Resumo do carrinho</h2>
            <Link to="/finalizar">Continuar para contato e entrega</Link>

            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>
                  {formatarPreco(
                    carrinho.subtotal_cents,
                    carrinho.currency
                  )}
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

              <div className="carrinho__total">
                <dt>Total atual</dt>
                <dd>
                  {formatarPreco(
                    carrinho.total_cents,
                    carrinho.currency
                  )}
                </dd>
              </div>
            </dl>

            <p>
              {carrinho.shipping_total_cents > 0
                ? `Frete incluído: ${formatarPreco(
                    carrinho.shipping_total_cents,
                    carrinho.currency
                  )}.`
                : "Frete ainda não calculado."}
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}

export default Cart;