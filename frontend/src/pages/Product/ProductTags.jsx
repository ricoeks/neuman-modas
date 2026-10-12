function ProductTags({ tags = [] }) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <section
      className="produto-tags"
      aria-labelledby="produto-tags-titulo"
    >
      <h2 id="produto-tags-titulo">Características</h2>

      <ul>
        {tags.map((tag) => (
          <li key={tag.id}>{tag.name}</li>
        ))}
      </ul>
    </section>
  );
}

export default ProductTags;