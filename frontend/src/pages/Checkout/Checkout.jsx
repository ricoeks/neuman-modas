import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Checkout.css";

const campos = [
  ["customer_name", "Nome completo", "text", "name", 120],
  ["customer_email", "E-mail", "email", "email", 254],
  ["customer_phone", "Telefone com DDD", "tel", "tel", 20],
  ["shipping_postal_code", "CEP", "text", "postal-code", 9],
  ["shipping_street", "Rua ou avenida", "text", "address-line1", 200],
  ["shipping_number", "Número ou S/N", "text", "off", 20],
  [
    "shipping_complement",
    "Complemento (opcional)",
    "text",
    "address-line2",
    100,
  ],
  ["shipping_neighborhood", "Bairro", "text", "off", 100],
  ["shipping_city", "Cidade", "text", "address-level2", 100],
];

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF",
  "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS",
  "RO", "RR", "SC", "SP", "SE", "TO",
];

function formatarPreco(centavos, moeda) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  }).format(centavos / 100);
}

function valorValido(valor) {
  return Number.isSafeInteger(valor) && valor >= 0;
}

function validarPedido(dados) {
  const pedido = dados?.pedido;

  if (
    !pedido ||
    typeof pedido.order_number !== "string" ||
    pedido.order_number.trim() === "" ||
    !valorValido(pedido.subtotal_cents) ||
    !valorValido(pedido.discount_total_cents) ||
    !valorValido(pedido.tax_total_cents) ||
    pedido.discount_total_cents > pedido.subtotal_cents ||
    pedido.currency !== "BRL" ||
    !["not_requested", "awaiting_quote", "quoted"].includes(
      pedido.shipping_status
    )
  ) {
    throw new Error("A resposta da solicitação é inválida.");
  }

  if (pedido.shipping_status === "quoted") {
    if (
      !valorValido(pedido.shipping_total_cents) ||
      !valorValido(pedido.total_cents)
    ) {
      throw new Error("Os valores do orçamento são inválidos.");
    }

    const totalEsperado =
      BigInt(pedido.subtotal_cents) -
      BigInt(pedido.discount_total_cents) +
      BigInt(pedido.shipping_total_cents) +
      BigInt(pedido.tax_total_cents);

    if (totalEsperado !== BigInt(pedido.total_cents)) {
      throw new Error("O total do orçamento precisa de revisão.");
    }
  } else if (
    pedido.shipping_total_cents !== null ||
    pedido.total_cents !== null
  ) {
    throw new Error("A resposta do frete pendente é inválida.");
  }

  return pedido;
}

function Checkout() {
  const [carrinho, setCarrinho] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [erroFormulario, setErroFormulario] = useState("");
  const [revisao, setRevisao] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [pedido, setPedido] = useState(null);

  const envioAtual = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      try {
        const resposta = await fetch("/api/carts", {
          credentials: "same-origin",
          signal: controller.signal,
          cache: "no-store",
        });

        if (resposta.status === 404) {
          const consulta = await fetch("/api/orders/current", {
            credentials: "same-origin",
            signal: controller.signal,
            cache: "no-store",
          });

          if (consulta.status === 404) {
            return;
          }

          const dados = await consulta.json();

          if (!consulta.ok) {
            throw new Error(
              dados?.mensagem ||
                "Não foi possível recuperar a solicitação."
            );
          }

          const recebido = validarPedido(dados);

          if (!controller.signal.aborted) {
            setPedido(recebido);
          }

          return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados?.mensagem || "Não foi possível carregar o carrinho."
          );
        }

        if (
          !dados?.carrinho ||
          !Array.isArray(dados.carrinho.itens) ||
          !valorValido(dados.carrinho.subtotal_cents) ||
          dados.carrinho.currency !== "BRL" ||
          dados.carrinho.itens.some(
            (item) =>
              !item ||
              !Number.isSafeInteger(item.quantity) ||
              item.quantity < 1 ||
              !valorValido(item.line_total_cents) ||
              item.currency !== "BRL"
          )
        ) {
          throw new Error("A resposta do carrinho é inválida.");
        }

        if (!controller.signal.aborted) {
          setCarrinho(dados.carrinho);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErro(error.message || "Não foi possível carregar a página.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    carregar();

    return () => {
      controller.abort();
      envioAtual.current?.abort();
      envioAtual.current = null;
    };
  }, []);

  function revisarDados(event) {
    event.preventDefault();
    setErroFormulario("");
    setErroEnvio("");
    setRevisao(null);

    const formulario = new FormData(event.currentTarget);
    const dados = Object.fromEntries(
      [...formulario.entries()].map(([nome, valor]) => [
        nome,
        String(valor).trim(),
      ])
    );

    if (
      campos.some(
        ([nome]) => nome !== "shipping_complement" && !dados[nome]
      )
    ) {
      setErroFormulario("Preencha todos os campos obrigatórios.");
      return;
    }

    if (
      campos.some(
        ([nome, , , , limite]) =>
          dados[nome]?.length > limite ||
          Array.from(dados[nome] || "").some((caractere) => caractere.charCodeAt(0) < 32 || caractere.charCodeAt(0) === 127)
      )
    ) {
      setErroFormulario("Confira os dados preenchidos.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.customer_email)) {
      setErroFormulario("Informe um e-mail válido.");
      return;
    }

    if (!/^[\d\s()+-]+$/.test(dados.customer_phone)) {
      setErroFormulario("Informe um telefone válido.");
      return;
    }

    const telefone = dados.customer_phone.replace(/\D/g, "");

    if (!/^\d{10,11}$/.test(telefone)) {
      setErroFormulario(
        "Informe um telefone com DDD, com 10 ou 11 dígitos."
      );
      return;
    }

    if (!/^\d{5}-?\d{3}$/.test(dados.shipping_postal_code)) {
      setErroFormulario("Informe um CEP com 8 dígitos.");
      return;
    }

    if (!estados.includes(dados.shipping_state)) {
      setErroFormulario("Selecione o estado.");
      return;
    }

    setRevisao({
      ...dados,
      customer_phone: telefone,
    });
  }

  async function enviarSolicitacao() {
    if (!revisao || pedido || envioAtual.current) {
      return;
    }

    const controller = new AbortController();
    envioAtual.current = controller;

    setEnviando(true);
    setErroEnvio("");

    try {
      const resposta = await fetch("/api/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(revisao),
        signal: controller.signal,
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados?.mensagem || "Não foi possível registrar a solicitação."
        );
      }

      const recebido = validarPedido(dados);

      if (!controller.signal.aborted) {
        setPedido(recebido);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setErroEnvio(
          error instanceof TypeError
            ? "A conexão falhou. Tente enviar novamente com este mesmo carrinho para recuperar a solicitação sem duplicá-la."
            : error.message
        );
      }
    } finally {
      if (envioAtual.current === controller) {
        envioAtual.current = null;

        if (!controller.signal.aborted) {
          setEnviando(false);
        }
      }
    }
  }

  const vazio = !carrinho || carrinho.itens.length === 0;
  const freteInformado = pedido?.shipping_status === "quoted";

  return (
    <main className="catalogo checkout">
      <Link to={pedido ? "/" : "/carrinho"}>
        {pedido ? "← Voltar ao catálogo" : "← Voltar ao carrinho"}
      </Link>

      <h1>
        {pedido ? "Solicitação registrada" : "Contato e entrega"}
      </h1>

      {pedido ? (
        <section
          className="checkout__confirmacao"
          aria-labelledby="confirmacao-titulo"
        >
          <h2 id="confirmacao-titulo">
            {freteInformado
              ? "O frete foi informado"
              : "Recebemos sua solicitação"}
          </h2>

          <p>
            Número: <strong>{pedido.order_number}</strong>
          </p>

          <p>
            Valor dos produtos:{" "}
            <strong>
              {formatarPreco(pedido.subtotal_cents, pedido.currency)}
            </strong>
          </p>

          {freteInformado ? (
            <>
              {pedido.discount_total_cents > 0 && (
                <p>
                  Desconto:{" "}
                  {formatarPreco(
                    pedido.discount_total_cents,
                    pedido.currency
                  )}
                </p>
              )}

              <p>
                Frete:{" "}
                <strong>
                  {formatarPreco(
                    pedido.shipping_total_cents,
                    pedido.currency
                  )}
                </strong>
              </p>

              {pedido.tax_total_cents > 0 && (
                <p>
                  Tributos adicionais:{" "}
                  {formatarPreco(
                    pedido.tax_total_cents,
                    pedido.currency
                  )}
                </p>
              )}

              <p>
                Total com frete:{" "}
                <strong>
                  {formatarPreco(pedido.total_cents, pedido.currency)}
                </strong>
              </p>

              <p>
                O orçamento do frete está disponível. Esta página não
                realiza pagamentos.
              </p>
            </>
          ) : pedido.shipping_status === "awaiting_quote" ? (
            <p>
              O frete será informado antes do pagamento. O total final
              ainda não está definido.
            </p>
          ) : (
            <p>
              O frete ainda não foi solicitado. O total final ainda
              não está disponível.
            </p>
          )}

          <p>
            O envio desta solicitação não realizou pagamento nem
            reserva de estoque.
          </p>

          <p>Guarde o número para referência.</p>

          <p>
            Para consultar uma atualização do orçamento, recarregue
            esta página no mesmo navegador.
          </p>
        </section>
      ) : (
        <>
          {carregando && <p role="status">Carregando...</p>}
          {erro && <p role="alert">{erro}</p>}

          {!carregando && !erro && vazio && (
            <p>
              Seu carrinho está vazio.{" "}
              <Link to="/">Conhecer os produtos</Link>
            </p>
          )}

          {!carregando && !erro && !vazio && (
            <div className="checkout__layout">
              <form
                className="checkout__formulario"
                onSubmit={revisarDados}
                onChange={() => {
                  setRevisao(null);
                  setErroFormulario("");
                  setErroEnvio("");
                }}
              >
                <fieldset disabled={enviando}>
                  <legend>Seus dados</legend>

                  {campos.map(
                    ([nome, titulo, tipo, autocomplete, limite]) => (
                      <div className="checkout__campo" key={nome}>
                        <label htmlFor={nome}>{titulo}</label>

                        <input
                          id={nome}
                          name={nome}
                          type={tipo}
                          autoComplete={autocomplete}
                          maxLength={limite}
                          required={nome !== "shipping_complement"}
                          inputMode={
                            nome === "shipping_postal_code"
                              ? "numeric"
                              : undefined
                          }
                          pattern={
                            nome === "shipping_postal_code"
                              ? "[0-9]{5}-?[0-9]{3}"
                              : undefined
                          }
                        />
                      </div>
                    )
                  )}

                  <div className="checkout__campo">
                    <label htmlFor="shipping_state">Estado</label>

                    <select
                      id="shipping_state"
                      name="shipping_state"
                      autoComplete="address-level1"
                      defaultValue=""
                      required
                    >
                      <option value="">Selecione</option>

                      {estados.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </div>

                  {erroFormulario && (
                    <p role="alert">{erroFormulario}</p>
                  )}

                  <button type="submit">Revisar dados</button>
                </fieldset>

                {revisao && (
                  <section
                    className="checkout__revisao"
                    aria-label="Revisão dos dados"
                  >
                    <h2>Confira os dados</h2>

                    <p>{revisao.customer_name}</p>
                    <p>{revisao.customer_email}</p>
                    <p>{revisao.customer_phone}</p>

                    <p>
                      {revisao.shipping_street},{" "}
                      {revisao.shipping_number}
                    </p>

                    {revisao.shipping_complement && (
                      <p>{revisao.shipping_complement}</p>
                    )}

                    <p>
                      {revisao.shipping_neighborhood} —{" "}
                      {revisao.shipping_city}/{revisao.shipping_state}
                    </p>

                    <p>CEP: {revisao.shipping_postal_code}</p>

                    <p>
                      O frete será informado antes do pagamento.
                      Este envio registra uma solicitação pendente.
                    </p>

                    <button
                      type="button"
                      disabled={enviando}
                      onClick={enviarSolicitacao}
                    >
                      {enviando
                        ? "Enviando..."
                        : "Enviar solicitação com frete sob consulta"}
                    </button>

                    {enviando && (
                      <p role="status">Registrando solicitação...</p>
                    )}

                    {erroEnvio && <p role="alert">{erroEnvio}</p>}
                  </section>
                )}
              </form>

              <aside className="checkout__resumo">
                <h2>Seu carrinho</h2>

                <ul>
                  {carrinho.itens.map((item) => (
                    <li key={item.id}>
                      <strong>{item.product_name}</strong>

                      <p>
                        {item.color_name || "Cor não informada"} —{" "}
                        {item.size_name || "Tamanho não informado"}
                      </p>

                      <p>
                        {item.quantity} unidade(s):{" "}
                        {formatarPreco(
                          item.line_total_cents,
                          item.currency
                        )}
                      </p>
                    </li>
                  ))}
                </ul>

                <p>
                  <strong>
                    Valor dos produtos:{" "}
                    {formatarPreco(
                      carrinho.subtotal_cents,
                      carrinho.currency
                    )}
                  </strong>
                </p>

                <p>
                  Frete sob consulta. Total final ainda não definido.
                </p>
              </aside>
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default Checkout;