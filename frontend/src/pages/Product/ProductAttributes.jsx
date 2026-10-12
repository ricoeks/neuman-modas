function formatarValor(atributo) {
  if (atributo.type === "boolean") {
    return atributo.value_boolean == null
      ? null
      : atributo.value_boolean
        ? "Sim"
        : "Não";
  }

  return (
    atributo.selected_value ??
    atributo.value_text ??
    atributo.value_number ??
    atributo.value_date
  );
}

function ProductAttributes({ atributos = [] }) {
  const detalhes = atributos
    .map((atributo) => ({
      ...atributo,
      valor: formatarValor(atributo),
    }))
    .filter(
      (atributo) =>
        atributo.valor != null && atributo.valor !== ""
    );

  if (detalhes.length === 0) {
    return null;
  }

  return (
    <section
      className="produto-atributos"
      aria-labelledby="produto-atributos-titulo"
    >
      <h2 id="produto-atributos-titulo">
        Detalhes do produto
      </h2>

      <dl>
        {detalhes.map((atributo) => (
          <div key={atributo.id}>
            <dt>{atributo.name}</dt>
            <dd>{atributo.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default ProductAttributes;