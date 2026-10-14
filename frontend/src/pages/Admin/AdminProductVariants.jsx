import { useEffect, useState } from "react";

function AdminProductVariants({ productId }) {
  const [variantes, setVariantes] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      setCarregando(true);
      setErro("");

      try {
        const resposta = await fetch(
          `/api/admin/products/${productId}/variants`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal
          }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !Array.isArray(dados.variantes)) {
          throw new Error(dados.mensagem || "Falha ao consultar variantes.");
        }

        if (!controller.signal.aborted) {
          setVariantes(dados.variantes);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setErro(e.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    carregar();
    return () => controller.abort();
  }, [productId]);

  return (
    <section className="admin__painel">
      <h2>Cores, tamanhos, preços e estoque</h2>

      {carregando && <p>Carregando variantes...</p>}
      {erro && <p role="alert">{erro}</p>}

      {!carregando && !erro && (
        <>
          <p>Total de variantes: {variantes.length}</p>
          {variantes.map((v) => (
            <p key={v.id}>
              {v.color_name} / {v.size_name} —
              SKU: {v.sku} —
              Estoque: {v.available_quantity ?? 0}
            </p>
          ))}
        </>
      )}
    </section>
  );
}

export default AdminProductVariants;
