import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminOrderHistory from "./AdminOrderHistory";
import "./Admin.css";

function formatarPreco(valor) {
  if (!Number.isSafeInteger(valor) || valor < 0) {
    return "Ainda não definido";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor / 100);
}

function converterFrete(texto) {
  const valor = texto.trim();

  if (!/^\d{1,14}([,.]\d{1,2})?$/.test(valor)) {
    return null;
  }

  const [inteiros, decimais = ""] = valor.replace(",", ".").split(".");
  const centavos =
    BigInt(inteiros) * 100n +
    BigInt(decimais.padEnd(2, "0"));

  if (centavos > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }

  return Number(centavos);
}

function validarPedido(dados, id) {
  const pedido = dados?.pedido;

  if (
    !pedido ||
    pedido.id !== Number(id) ||
    pedido.currency !== "BRL" ||
    !Array.isArray(pedido.itens) ||
    !Number.isSafeInteger(pedido.subtotal_cents) ||
    pedido.subtotal_cents < 0 ||
    !Number.isSafeInteger(pedido.discount_total_cents) ||
    pedido.discount_total_cents < 0 ||
    pedido.discount_total_cents > pedido.subtotal_cents ||
    !Number.isSafeInteger(pedido.tax_total_cents) ||
    pedido.tax_total_cents < 0 ||
    !["not_requested", "awaiting_quote", "quoted"].includes(
      pedido.shipping_status
    )
  ) {
    throw new Error("A resposta do pedido é inválida.");
  }

  if (pedido.shipping_status === "quoted") {
    if (
      !Number.isSafeInteger(pedido.shipping_total_cents) ||
      pedido.shipping_total_cents < 0 ||
      !Number.isSafeInteger(pedido.total_cents) ||
      pedido.total_cents < 0
    ) {
      throw new Error("Os valores do orçamento são inválidos.");
    }

    const total =
      BigInt(pedido.subtotal_cents) -
      BigInt(pedido.discount_total_cents) +
      BigInt(pedido.tax_total_cents) +
      BigInt(pedido.shipping_total_cents);

    if (total !== BigInt(pedido.total_cents)) {
      throw new Error("O total do pedido precisa de revisão.");
    }
  }

  return pedido;
}

function AdminOrder() {
  const { id } = useParams();

  const [pedido, setPedido] = useState(null);
  const [permissoes, setPermissoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [semSessao, setSemSessao] = useState(false);
  const [frete, setFrete] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroFrete, setErroFrete] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [atualizacao, setAtualizacao] = useState(0);

  const envioAtual = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      setCarregando(true);
      setSalvando(false);
      setPedido(null);
      setPermissoes([]);
      setErro("");
      setSemSessao(false);
      setFrete("");
      setErroFrete("");
      setMensagem("");

      try {
        if (
          !/^[1-9]\d*$/.test(id || "") ||
          !Number.isSafeInteger(Number(id))
        ) {
          throw new Error("Identificador de pedido inválido.");
        }

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
            dadosSessao?.mensagem ||
              "Não foi possível verificar a sessão."
          );
        }

        if (!Array.isArray(dadosSessao?.admin?.permissions)) {
          throw new Error("A resposta da sessão é inválida.");
        }

        const resposta = await fetch(`/api/admin/orders/${id}`, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (resposta.status === 401) {
          if (!controller.signal.aborted) {
            setSemSessao(true);
          }
          return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados?.mensagem || "Não foi possível consultar o pedido."
          );
        }

        const recebido = validarPedido(dados, id);

        if (!controller.signal.aborted) {
          setPermissoes(dadosSessao.admin.permissions);
          setPedido(recebido);
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

    return () => {
      controller.abort();
      envioAtual.current?.abort();
      envioAtual.current = null;
    };
  }, [id, atualizacao]);

  const freteCentavos = converterFrete(frete);
  let totalPrevisto = null;

  if (pedido && freteCentavos !== null) {
    const total =
      BigInt(pedido.subtotal_cents) -
      BigInt(pedido.discount_total_cents) +
      BigInt(pedido.tax_total_cents) +
      BigInt(freteCentavos);

    if (total <= BigInt(Number.MAX_SAFE_INTEGER)) {
      totalPrevisto = Number(total);
    }
  }

  const podeInformarFrete =
    pedido &&
    permissoes.includes("orders.shipping.quote") &&
    pedido.status === "pending" &&
    pedido.payment_status === "pending" &&
    pedido.shipping_status === "awaiting_quote";

  async function registrarFrete(event) {
    event.preventDefault();

    if (!podeInformarFrete || envioAtual.current) {
      return;
    }

    setErroFrete("");
    setMensagem("");

    if (freteCentavos === null || totalPrevisto === null) {
      setErroFrete("Informe um valor válido, como 25,00.");
      return;
    }

    const controller = new AbortController();
    envioAtual.current = controller;
    setSalvando(true);

    try {
      const resposta = await fetch(
        `/api/admin/orders/${id}/shipping-quote`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-Neumam-Request": "1",
          },
          body: JSON.stringify({
            shipping_total_cents: freteCentavos,
          }),
          signal: controller.signal,
        }
      );

      if (resposta.status === 401) {
        if (!controller.signal.aborted) {
          setPedido(null);
          setSemSessao(true);
        }
        return;
      }

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados?.mensagem || "Não foi possível registrar o frete."
        );
      }

      const recebido = validarPedido(dados, id);

      if (!controller.signal.aborted) {
        setPedido(recebido);
        setFrete("");
        setMensagem(dados.mensagem || "Frete registrado.");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setErroFrete(
          error instanceof TypeError
            ? "A conexão falhou. Atualize o pedido para verificar se o frete foi registrado."
            : error.message
        );
      }
    } finally {
      if (envioAtual.current === controller) {
        envioAtual.current = null;

        if (!controller.signal.aborted) {
          setSalvando(false);
        }
      }
    }
  }

  return (
    <main className="admin">
      <Link to="/admin">← Voltar aos pedidos</Link>
      <h1>Detalhes do pedido</h1>

      {carregando && <p role="status">Carregando pedido...</p>}
      {erro && <p role="alert">{erro}</p>}

      {!carregando && semSessao && (
        <p>
          Entre novamente para consultar este pedido.{" "}
          <Link to="/admin">Ir para o login</Link>
        </p>
      )}

      {!carregando && !semSessao && !erro && pedido && (
        <>
          <div className="admin__cabecalho">
            <strong className="admin__numero">
              {pedido.order_number}
            </strong>

            <button
              type="button"
              disabled={salvando}
              onClick={() => setAtualizacao((valor) => valor + 1)}
            >
              Atualizar pedido
            </button>
          </div>

          {mensagem && <p role="status">{mensagem}</p>}

          <div className="admin__detalhes">
            <section className="admin__painel">
              <h2>Contato e entrega</h2>
              <p>{pedido.customer_name || "Nome não informado"}</p>
              <p>{pedido.customer_email || "E-mail não informado"}</p>
              <p>{pedido.customer_phone || "Telefone não informado"}</p>

              <p>
                {pedido.shipping_street}, {pedido.shipping_number}
              </p>

              {pedido.shipping_complement && (
                <p>{pedido.shipping_complement}</p>
              )}

              <p>
                {pedido.shipping_neighborhood} —{" "}
                {pedido.shipping_city}/{pedido.shipping_state}
              </p>

              <p>CEP: {pedido.shipping_postal_code}</p>
              <p>{pedido.shipping_country}</p>
            </section>

            <section className="admin__painel">
              <h2>Valores</h2>
              <p>Produtos: {formatarPreco(pedido.subtotal_cents)}</p>
              <p>
                Desconto: {formatarPreco(pedido.discount_total_cents)}
              </p>
              <p>Tributos: {formatarPreco(pedido.tax_total_cents)}</p>

              <p>
                Frete:{" "}
                {pedido.shipping_status === "quoted"
                  ? formatarPreco(pedido.shipping_total_cents)
                  : pedido.shipping_status === "awaiting_quote"
                    ? "Aguardando orçamento"
                    : "Não solicitado"}
              </p>

              <p>
                <strong>
                  Total: {formatarPreco(pedido.total_cents)}
                </strong>
              </p>

              <p>
                Situação:{" "}
                {pedido.status === "pending"
                  ? "Pendente"
                  : pedido.status}
              </p>

              <p>
                Pagamento:{" "}
                {pedido.payment_status === "pending"
                  ? "Pendente"
                  : pedido.payment_status}
              </p>
            </section>
          </div>

          <div className="admin__tabela">
            <table>
              <caption>Itens do pedido</caption>
              <thead>
                <tr>
                  <th scope="col">Produto</th>
                  <th scope="col">Cor / tamanho</th>
                  <th scope="col">Quantidade</th>
                  <th scope="col">Unitário</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>

              <tbody>
                {pedido.itens.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>
                      {item.color_name || "Não informada"} /{" "}
                      {item.size_name || "Não informado"}
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatarPreco(item.unit_price_cents)}</td>
                    <td>{formatarPreco(item.line_total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {podeInformarFrete && (
            <form
              className="admin__painel admin__frete"
              onSubmit={registrarFrete}
            >
              <h2>Informar orçamento de frete</h2>

              <label htmlFor="frete-pedido">
                Valor do frete em reais
              </label>
              <input
                id="frete-pedido"
                type="text"
                inputMode="decimal"
                placeholder="25,00"
                maxLength={17}
                value={frete}
                disabled={salvando}
                required
                onChange={(event) => {
                  setFrete(event.target.value);
                  setErroFrete("");
                }}
              />

              <p>Use vírgula ou ponto, sem separador de milhar.</p>

              {totalPrevisto !== null && (
                <p aria-live="polite">
                  <strong>
                    Total com este frete:{" "}
                    {formatarPreco(totalPrevisto)}
                  </strong>
                </p>
              )}

              <p>
                Ao registrar, o cliente poderá consultar o orçamento.
                Esta ação não realiza pagamento nem reserva estoque.
              </p>

              <button
                type="submit"
                disabled={salvando || totalPrevisto === null}
              >
                {salvando ? "Registrando..." : "Registrar frete"}
              </button>

              {erroFrete && <p role="alert">{erroFrete}</p>}
            </form>
          )}

          {pedido.shipping_status === "quoted" && (
            <p>O orçamento deste pedido já está registrado.</p>
          )}

          <AdminOrderHistory
            key={`${pedido.id}-${atualizacao}`}
            orderId={pedido.id}
            atualizadoEm={pedido.updated_at}
          />
        </>
      )}
    </main>
  );
}

export default AdminOrder;