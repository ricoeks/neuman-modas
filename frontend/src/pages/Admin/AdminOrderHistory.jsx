import { useEffect, useState } from "react";

function formatarPreco(centavos) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

function formatarData(texto) {
  const data = new Date(`${texto.replace(" ", "T")}Z`);

  if (Number.isNaN(data.getTime())) {
    return "Data não disponível";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

function AdminOrderHistory({ orderId, atualizadoEm }) {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      setCarregando(true);
      setErro("");
      setHistorico([]);

      try {
        const resposta = await fetch(
          `/api/admin/orders/${orderId}/history`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (resposta.status === 401) {
          throw new Error("Sua sessão expirou. Entre novamente.");
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados?.mensagem || "Não foi possível consultar o histórico."
          );
        }

        if (
          dados.order_id !== orderId ||
          !Array.isArray(dados.historico) ||
          dados.historico.some(
            (registro) =>
              !registro ||
              !Number.isSafeInteger(registro.id) ||
              typeof registro.actor_name !== "string" ||
              typeof registro.created_at !== "string" ||
              (
                registro.valores !== null &&
                (
                  registro.valores?.currency !== "BRL" ||
                  !Number.isSafeInteger(
                    registro.valores?.shipping_total_cents
                  ) ||
                  registro.valores.shipping_total_cents < 0 ||
                  !Number.isSafeInteger(registro.valores?.total_cents) ||
                  registro.valores.total_cents < 0
                )
              )
          )
        ) {
          throw new Error("A resposta do histórico é inválida.");
        }

        if (!controller.signal.aborted) {
          setHistorico(dados.historico);
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

    return () => controller.abort();
  }, [orderId, atualizadoEm]);

  return (
    <section className="admin__painel admin__historico">
      <h2>Histórico do frete</h2>

      {carregando && <p role="status">Carregando histórico...</p>}
      {erro && <p role="alert">{erro}</p>}

      {!carregando && !erro && historico.length === 0 && (
        <p>Nenhuma alteração de frete registrada no histórico.</p>
      )}

      {!carregando && !erro && historico.length > 0 && (
        <ul>
          {historico.map((registro) => (
            <li key={registro.id}>
              <p>
                <strong>Orçamento de frete registrado</strong>
              </p>
              <p>Por: {registro.actor_name}</p>
              <p>
                Em: {formatarData(registro.created_at)} — horário de
                São Paulo
              </p>

              {registro.valores ? (
                <>
                  <p>
                    Frete:{" "}
                    {formatarPreco(
                      registro.valores.shipping_total_cents
                    )}
                  </p>
                  <p>
                    Total:{" "}
                    {formatarPreco(registro.valores.total_cents)}
                  </p>
                </>
              ) : (
                <p>Valores não disponíveis neste registro.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AdminOrderHistory;