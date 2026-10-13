import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Admin.css";

const camposTexto = [
  ["name", "Nome do produto", 120, true],
  ["sku_base", "Código do produto", 100, true],
  ["slug", "Endereço do produto", 160, true],
  ["brand", "Marca", 100, false],
  ["short_description", "Descrição curta", 500, false],
];

function AdminProductCreate() {
  const [opcoes, setOpcoes] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [erroEnvio, setErroEnvio] = useState("");
  const [semSessao, setSemSessao] = useState(false);
  const [semPermissao, setSemPermissao] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [produtoCriado, setProdutoCriado] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  const envioAtual = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      setCarregando(true);
      setErro("");
      setSemSessao(false);
      setSemPermissao(false);

      try {
        const sessao = await fetch("/api/admin/auth/me", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (sessao.status === 401) {
          if (!controller.signal.aborted) setSemSessao(true);
          return;
        }

        const dadosSessao = await sessao.json();

        if (!sessao.ok) {
          throw new Error(
            dadosSessao.mensagem || "Não foi possível verificar a sessão."
          );
        }

        if (!Array.isArray(dadosSessao.admin?.permissions)) {
          throw new Error("A resposta da sessão é inválida.");
        }

        const permissoes = dadosSessao.admin.permissions;

        if (
          !permissoes.includes("products.create") ||
          !permissoes.includes("products.read")
        ) {
          if (!controller.signal.aborted) setSemPermissao(true);
          return;
        }

        const resposta = await fetch("/api/admin/products/options", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (resposta.status === 401) {
          if (!controller.signal.aborted) setSemSessao(true);
          return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados.mensagem || "Não foi possível carregar as opções."
          );
        }

        if (
          !Array.isArray(dados.categorias) ||
          !Array.isArray(dados.colecoes) ||
          [...dados.categorias, ...dados.colecoes].some(
            (item) =>
              !item ||
              !Number.isSafeInteger(item.id) ||
              item.id < 1 ||
              typeof item.name !== "string"
          )
        ) {
          throw new Error("As opções do cadastro são inválidas.");
        }

        if (!controller.signal.aborted) setOpcoes(dados);
      } catch (error) {
        if (!controller.signal.aborted) setErro(error.message);
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }

    carregar();

    return () => {
      controller.abort();
      envioAtual.current?.abort();
      envioAtual.current = null;
    };
  }, [tentativa]);

  async function cadastrar(event) {
    event.preventDefault();

    if (envioAtual.current || produtoCriado) return;

    const formulario = new FormData(event.currentTarget);
    const dados = {};

    for (const [nome] of camposTexto) {
      dados[nome] = String(formulario.get(nome) || "").trim();
    }

    dados.description = String(formulario.get("description") || "").trim();

    for (const nome of ["category_id", "collection_id"]) {
      const valor = String(formulario.get(nome) || "");
      dados[nome] = valor === "" ? null : Number(valor);
    }

    if (!dados.name || !dados.sku_base || !dados.slug) {
      setErroEnvio("Preencha nome, código e endereço do produto.");
      return;
    }

    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(dados.sku_base)) {
      setErroEnvio(
        "No código, use letras sem acentos, números, ponto, hífen ou sublinhado."
      );
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dados.slug)) {
      setErroEnvio(
        "No endereço, use letras minúsculas sem acentos, números e hífens."
      );
      return;
    }

    const controller = new AbortController();
    envioAtual.current = controller;
    setEnviando(true);
    setErroEnvio("");

    try {
      const resposta = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Neumam-Request": "1",
        },
        body: JSON.stringify(dados),
        signal: controller.signal,
      });

      if (resposta.status === 401) {
        if (!controller.signal.aborted) setSemSessao(true);
        return;
      }

      const recebido = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          recebido.mensagem || "Não foi possível cadastrar o produto."
        );
      }

      if (
        !recebido.produto ||
        !Number.isSafeInteger(recebido.produto.id) ||
        recebido.produto.id < 1 ||
        recebido.produto.status !== "draft"
      ) {
        throw new Error(
          "Confira a lista de produtos para verificar o cadastro."
        );
      }

      if (!controller.signal.aborted) {
        setProdutoCriado(recebido.produto);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setErroEnvio(
          error instanceof TypeError || error instanceof SyntaxError
            ? "Não foi possível confirmar a resposta. Confira a lista de produtos pelo código antes de tentar novamente."
            : error.message
        );
      }
    } finally {
      if (envioAtual.current === controller) {
        envioAtual.current = null;
        if (!controller.signal.aborted) setEnviando(false);
      }
    }
  }

  return (
    <main className="admin">
      <Link to="/admin/produtos">← Voltar aos produtos</Link>
      <h1>Novo produto</h1>

      {carregando && <p role="status">Carregando cadastro...</p>}

      {semSessao && (
        <div className="admin__painel">
          <p>Sua sessão não está disponível. Entre novamente.</p>
          <Link to="/admin">Ir para o login</Link>
        </div>
      )}

      {semPermissao && (
        <p role="alert">Sua conta não possui as permissões para este cadastro.</p>
      )}

      {erro && (
        <div className="admin__painel">
          <p role="alert">{erro}</p>
          <button
            type="button"
            disabled={carregando}
            onClick={() => setTentativa((valor) => valor + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!carregando && !erro && !semSessao && !semPermissao && (
        produtoCriado ? (
          <section className="admin__painel" aria-labelledby="produto-criado-titulo">
            <h2 id="produto-criado-titulo">Rascunho cadastrado</h2>
            <p role="status">{produtoCriado.name} foi cadastrado com sucesso.</p>
            <p>Código: <strong>{produtoCriado.sku_base}</strong></p>
            <p>
              O produto ainda não aparece na loja. As variantes, os preços,
              as imagens e a publicação serão preparados nas próximas etapas.
            </p>
            <Link to="/admin/produtos">Consultar produtos</Link>
          </section>
        ) : opcoes && (
          <form className="admin__cadastro-produto" onSubmit={cadastrar}>
            <p className="admin__cadastro-aviso">
              O produto será salvo como rascunho. Os campos marcados com *
              são obrigatórios.
            </p>

            <fieldset disabled={enviando}>
              <legend>Dados do produto</legend>

              {camposTexto.map(([nome, titulo, limite, obrigatorio]) => (
                <div className="admin__cadastro-campo" key={nome}>
                  <label htmlFor={`produto-${nome}`}>
                    {titulo}{obrigatorio ? " *" : ""}
                  </label>
                  <input
                    id={`produto-${nome}`}
                    name={nome}
                    type="text"
                    maxLength={limite}
                    required={obrigatorio}
                    defaultValue={nome === "brand" ? "Neumam Modas" : ""}
                    aria-describedby={
                      ["sku_base", "slug"].includes(nome)
                        ? `ajuda-${nome}`
                        : undefined
                    }
                  />
                  {nome === "sku_base" && (
                    <p id="ajuda-sku_base">
                      Código único. Exemplo: BLZ-NOV-002.
                    </p>
                  )}
                  {nome === "slug" && (
                    <p id="ajuda-slug">
                      Endereço único. Exemplo: blazer-novo-nm.
                    </p>
                  )}
                </div>
              ))}

              <div className="admin__cadastro-campo">
                <label htmlFor="produto-categoria">Categoria</label>
                <select id="produto-categoria" name="category_id" defaultValue="">
                  <option value="">Sem categoria</option>
                  {opcoes.categorias.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="admin__cadastro-campo">
                <label htmlFor="produto-colecao">Coleção</label>
                <select id="produto-colecao" name="collection_id" defaultValue="">
                  <option value="">Sem coleção</option>
                  {opcoes.colecoes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="admin__cadastro-campo admin__cadastro-largo">
                <label htmlFor="produto-descricao">Descrição completa</label>
                <textarea
                  id="produto-descricao"
                  name="description"
                  maxLength={10000}
                  rows={6}
                />
              </div>

              <div className="admin__cadastro-largo">
                <button type="submit">
                  {enviando ? "Salvando..." : "Salvar rascunho"}
                </button>
              </div>
            </fieldset>

            {enviando && <p role="status">Registrando produto...</p>}
            {erroEnvio && <p role="alert">{erroEnvio}</p>}
          </form>
        )
      )}
    </main>
  );
}

export default AdminProductCreate;