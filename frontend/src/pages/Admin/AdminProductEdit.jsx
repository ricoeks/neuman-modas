import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminProductVariants from "./AdminProductVariants";
import "./Admin.css";

const camposTexto = [
  ["name", "Nome do produto", 120, true],
  ["sku_base", "Código do produto", 100, true],
  ["slug", "Endereço do produto", 160, true],
  ["brand", "Marca", 100, true],
  ["short_description", "Descrição curta", 500, false],
];

const camposEditaveis = [
  ...camposTexto.map(([nome]) => nome),
  "category_id",
  "collection_id",
  "description",
];

function normalizar(produto) {
  return Object.fromEntries(
    camposEditaveis.map((campo) => [
      campo,
      campo === "category_id" || campo === "collection_id"
        ? produto[campo] == null ? "" : String(produto[campo])
        : produto[campo] ?? "",
    ])
  );
}

async function lerJson(resposta) {
  try {
    return await resposta.json();
  } catch {
    throw new Error("O servidor retornou uma resposta inválida.");
  }
}

function AdminProductEdit() {
  const { id } = useParams();
  const [original, setOriginal] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [version, setVersion] = useState("");
  const [opcoes, setOpcoes] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [semSessao, setSemSessao] = useState(false);
  const [semPermissao, setSemPermissao] = useState(false);
  const [podeEditar, setPodeEditar] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const envioAtual = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      setCarregando(true);
      setErro("");
      setMensagem("");
      setOriginal(null);
      setFormulario(null);
      setOpcoes(null);
      setVersion("");
      setSemSessao(false);
      setSemPermissao(false);
      setPodeEditar(false);

      try {
        if (!/^[1-9]\d*$/.test(id || "") || !Number.isSafeInteger(Number(id))) {
          throw new Error("Identificador de produto inválido.");
        }

        const sessao = await fetch("/api/admin/auth/me", {
          credentials: "same-origin", cache: "no-store", signal: controller.signal,
        });
        if (sessao.status === 401) {
          setSemSessao(true);
          return;
        }
        const dadosSessao = await lerJson(sessao);
        if (!sessao.ok) throw new Error(dadosSessao.mensagem || "Falha ao verificar sessão.");
        const permissoes = dadosSessao.admin?.permissions;
        if (!Array.isArray(permissoes)) throw new Error("A sessão administrativa é inválida.");
        if (!permissoes.includes("products.read")) {
          setSemPermissao(true);
          return;
        }
        setPodeEditar(permissoes.includes("products.update"));

        const [respostaProduto, respostaOpcoes] = await Promise.all([
          fetch(`/api/admin/products/${id}`, {
            credentials: "same-origin", cache: "no-store", signal: controller.signal,
          }),
          fetch("/api/admin/products/options", {
            credentials: "same-origin", cache: "no-store", signal: controller.signal,
          }),
        ]);
        if (respostaProduto.status === 401 || respostaOpcoes.status === 401) {
          setSemSessao(true);
          return;
        }
        if (respostaProduto.status === 403 || respostaOpcoes.status === 403) {
          setSemPermissao(true);
          return;
        }

        const [dadosProduto, dadosOpcoes] = await Promise.all([
          lerJson(respostaProduto), lerJson(respostaOpcoes),
        ]);
        if (!respostaProduto.ok) throw new Error(dadosProduto.mensagem || "Falha ao consultar produto.");
        if (!respostaOpcoes.ok) throw new Error(dadosOpcoes.mensagem || "Falha ao consultar opções.");
        if (!dadosProduto.produto || dadosProduto.produto.id !== Number(id) ||
            typeof dadosProduto.version !== "string" || !/^[a-f0-9]{64}$/.test(dadosProduto.version)) {
          throw new Error("Os dados do produto são inválidos.");
        }
        if (!Array.isArray(dadosOpcoes.categorias) || !Array.isArray(dadosOpcoes.colecoes) ||
            [...dadosOpcoes.categorias, ...dadosOpcoes.colecoes].some(
              (item) => !Number.isSafeInteger(item?.id) || item.id < 1 || typeof item.name !== "string"
            )) {
          throw new Error("As opções de categoria e coleção são inválidas.");
        }
        if (!controller.signal.aborted) {
          setOriginal(normalizar(dadosProduto.produto));
          setFormulario(normalizar(dadosProduto.produto));
          setVersion(dadosProduto.version);
          setOpcoes(dadosOpcoes);
        }
      } catch (e) {
        if (!controller.signal.aborted) setErro(e.message || "Não foi possível carregar o produto.");
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
  }, [id, tentativa]);

  function alterar(campo, valor) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
    setMensagem("");
    setErro("");
  }

  async function salvar(event) {
    event.preventDefault();
    if (!podeEditar || !original || !formulario || envioAtual.current) return;

    const mudancas = {};
    for (const campo of camposEditaveis) {
      const valor = typeof formulario[campo] === "string" ? formulario[campo].trim() : formulario[campo];
      const anterior = original[campo];
      if (valor !== anterior) {
        mudancas[campo] = campo === "category_id" || campo === "collection_id"
          ? valor === "" ? null : Number(valor)
          : valor || (campo === "short_description" || campo === "description" ? null : valor);
      }
    }
    if (Object.keys(mudancas).length === 0) {
      setMensagem("Nenhuma alteração para salvar.");
      return;
    }
    if (["name", "sku_base", "slug", "brand"].some((campo) =>
      !String(formulario[campo]).trim())) {
      setErro("Preencha nome, código, endereço e marca.");
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(formulario.sku_base.trim())) {
      setErro("No código, use letras sem acentos, números, ponto, hífen ou sublinhado.");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formulario.slug.trim())) {
      setErro("No endereço, use letras minúsculas, números e hífens.");
      return;
    }

    const controller = new AbortController();
    envioAtual.current = controller;
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const resposta = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Neumam-Request": "1" },
        body: JSON.stringify({ version, ...mudancas }),
        signal: controller.signal,
      });
      if (resposta.status === 401) {
        setSemSessao(true);
        return;
      }
      if (resposta.status === 403) {
        setPodeEditar(false);
        setErro("Sua conta não tem permissão para editar produtos.");
        return;
      }
      const dados = await lerJson(resposta);
      if (!resposta.ok) {
        if (resposta.status === 409) {
          setErro((dados.mensagem || "Conflito ao salvar.") + " Recarregue os dados antes de tentar novamente.");
        } else {
          setErro(dados.mensagem || "Não foi possível atualizar o produto.");
        }
        return;
      }
      if (!dados.produto || dados.produto.id !== Number(id) ||
          typeof dados.version !== "string" || !/^[a-f0-9]{64}$/.test(dados.version)) {
        setErro("Resposta de salvamento não confirmada. Recarregue para verificar os dados.");
        return;
      }
      const atualizado = normalizar(dados.produto);
      setOriginal(atualizado);
      setFormulario(atualizado);
      setVersion(dados.version);
      setMensagem(dados.mensagem || "Produto atualizado com sucesso.");
    } catch (e) {
      if (!controller.signal.aborted) setErro("Não foi possível confirmar a gravação. Recarregue e confira os dados antes de tentar novamente.");
    } finally {
      if (envioAtual.current === controller) {
        envioAtual.current = null;
        if (!controller.signal.aborted) setSalvando(false);
      }
    }
  }

  const alterado = original && formulario && camposEditaveis.some(
    (campo) => formulario[campo]?.trim() !== original[campo]
  );

  function opcoesComAtual(tipo, campo) {
    const lista = opcoes?.[tipo] || [];
    const atual = formulario?.[campo];
    if (!atual || lista.some((item) => String(item.id) === atual)) return lista;
    return [{ id: Number(atual), name: `Atual (ID ${atual}, indisponível para nova seleção)` }, ...lista];
  }

  return (
    <main className="admin">
      <Link to="/admin/produtos">← Voltar aos produtos</Link>
      <h1>Editar produto #{id}</h1>
      {carregando && <p role="status">Carregando produto...</p>}
      {semSessao && <div className="admin__painel"><p>Sua sessão expirou.</p><Link to="/admin">Entrar novamente</Link></div>}
      {semPermissao && <p role="alert">Sua conta não tem permissão para consultar produtos.</p>}
      {erro && <p role="alert">{erro}</p>}
      {mensagem && <p role="status">{mensagem}</p>}
      {!carregando && !semSessao && !semPermissao && (
        <button type="button" disabled={salvando} onClick={() => setTentativa((n) => n + 1)}>
          Recarregar dados
        </button>
      )}
      {!carregando && formulario && opcoes && !semSessao && !semPermissao && (
        <form className="admin__cadastro-produto" onSubmit={salvar}>
          {!podeEditar && <p role="alert">Consulta permitida, mas sua conta não tem permissão para editar.</p>}
          <fieldset disabled={salvando || !podeEditar}>
            <legend>Dados do produto</legend>
            {camposTexto.map(([nome, rotulo, limite, obrigatorio]) => (
              <div className="admin__cadastro-campo" key={nome}>
                <label htmlFor={`editar-${nome}`}>{rotulo}{obrigatorio ? " *" : ""}</label>
                <input id={`editar-${nome}`} name={nome} type="text" maxLength={limite}
                  required={obrigatorio} value={formulario[nome]}
                  onChange={(e) => alterar(nome, e.target.value)} />
              </div>
            ))}
            <div className="admin__cadastro-campo">
              <label htmlFor="editar-categoria">Categoria</label>
              <select id="editar-categoria" value={formulario.category_id}
                onChange={(e) => alterar("category_id", e.target.value)}>
                <option value="">Sem categoria</option>
                {opcoesComAtual("categorias", "category_id").map((item) =>
                  <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="admin__cadastro-campo">
              <label htmlFor="editar-colecao">Coleção</label>
              <select id="editar-colecao" value={formulario.collection_id}
                onChange={(e) => alterar("collection_id", e.target.value)}>
                <option value="">Sem coleção</option>
                {opcoesComAtual("colecoes", "collection_id").map((item) =>
                  <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="admin__cadastro-campo admin__cadastro-largo">
              <label htmlFor="editar-descricao">Descrição completa</label>
              <textarea id="editar-descricao" rows={6} maxLength={10000}
                value={formulario.description}
                onChange={(e) => alterar("description", e.target.value)} />
            </div>
            <div className="admin__cadastro-largo">
              <button type="submit" disabled={!alterado || salvando}>
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {!carregando && formulario && !semSessao && !semPermissao && (
        <AdminProductVariants productId={id} />
      )}
    </main>
  );
}

export default AdminProductEdit;
