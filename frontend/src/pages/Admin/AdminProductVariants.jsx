import { useEffect, useRef, useState } from "react";

const FORMULARIO_INICIAL = {
  sku: "",
  color_name: "",
  color_code: "",
  size_name: "",
  size_code: "",
  sale_price: "",
  cost_price: "",
  available_quantity: "0",
  source_type: "supplier",
  lead_time_days: "5"
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

function reaisParaCentavos(valor) {
  const texto = String(valor).trim();

  if (!/^\d+(?:[.,]\d{1,2})?$/.test(texto)) {
    throw new Error("Informe um preço válido, com até duas casas decimais.");
  }

  const partes = texto.replace(",", ".").split(".");
  const reais = partes[0];
  const centavos = (partes[1] || "").padEnd(2, "0");
  const resultado = Number(reais) * 100 + Number(centavos);

  if (!Number.isSafeInteger(resultado)) {
    throw new Error("O preço informado é muito alto.");
  }

  return resultado;
}

function centavosParaCampo(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  const centavos = Number(valor);
  return Number.isSafeInteger(centavos) && centavos >= 0
    ? (centavos / 100).toFixed(2)
    : "";
}

function ativa(variante) {
  return variante.status === "active";
}

function estoqueDaVariante(variante) {
  if (variante.available_quantity === null || variante.available_quantity === undefined || variante.available_quantity === "") {
    return null;
  }

  const quantidade = Number(variante.available_quantity);
  return Number.isSafeInteger(quantidade) && quantidade >= 0 ? quantidade : null;
}

function precoDaVariante(variante, campo) {
  if (variante[campo] === null || variante[campo] === undefined || variante[campo] === "") {
    return "—";
  }

  const centavos = Number(variante[campo]);
  return Number.isSafeInteger(centavos) && centavos >= 0
    ? moeda.format(centavos / 100)
    : "—";
}

function normalizar(valor) {
  return String(valor ?? "").trim().toLocaleLowerCase("pt-BR");
}

async function consultarVariantes(productId, signal) {
  const resposta = await fetch(`/api/admin/products/${productId}/variants`, {
    credentials: "same-origin",
    cache: "no-store",
    signal
  });

  const dados = await resposta.json();

  if (!resposta.ok || !Array.isArray(dados.variantes)) {
    throw new Error(dados.mensagem || "Falha ao consultar variantes.");
  }

  return dados.variantes;
}

function AdminProductVariants({ productId, skuBase }) {
  const [variantes, setVariantes] = useState([]);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [listaCarregada, setListaCarregada] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [formularioAberto, setFormularioAberto] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroEstoque, setFiltroEstoque] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("ativas");
  const [editandoId, setEditandoId] = useState(null);
  const [edicao, setEdicao] = useState(null);
  const [ocupadoId, setOcupadoId] = useState(null);
  const [formulario, setFormulario] = useState({ ...FORMULARIO_INICIAL });
  const envioAtual = useRef(null);
  const operacaoVariante = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    consultarVariantes(productId, controller.signal)
      .then((dados) => {
        if (!controller.signal.aborted) {
          setVariantes(dados);
          setListaCarregada(true);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setErro(e.message || "Erro ao carregar as variantes.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      });

    return () => controller.abort();
  }, [productId]);

  const variantesAtivas = variantes.filter(ativa);
  const arquivadas = variantes.filter((v) => v.status === "archived").length;
  const estoqueConhecido = variantesAtivas.every((v) => estoqueDaVariante(v) !== null);
  const estoqueTotal = variantesAtivas.reduce((total, v) => total + (estoqueDaVariante(v) ?? 0), 0);
  const esgotadas = variantesAtivas.filter((v) => estoqueDaVariante(v) === 0).length;
  const baixoEstoque = variantesAtivas.filter((v) => {
    const saldo = estoqueDaVariante(v);
    return saldo !== null && saldo > 0 && saldo <= 5;
  }).length;

  const variantesFiltradas = variantes.filter((variante) => {
    if (filtroStatus === "ativas" && variante.status !== "active") return false;
    if (filtroStatus === "arquivadas" && variante.status !== "archived") return false;
    const saldo = estoqueDaVariante(variante);
    const texto = [variante.sku, variante.color_name, variante.size_name, variante.color_code, variante.size_code]
      .map(normalizar)
      .join(" ");

    if (!texto.includes(normalizar(busca))) return false;
    if (filtroEstoque === "disponiveis") return saldo !== null && saldo > 0;
    if (filtroEstoque === "esgotadas") return saldo === 0;
    return true;
  });

  function alterarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function atualizarLista() {
    if (salvando || atualizando || ocupadoId !== null) return;
    setAtualizando(true);
    setErro("");
    setMensagem("");

    try {
      const dados = await consultarVariantes(productId);
      setVariantes(dados);
      setListaCarregada(true);
      setMensagem("Lista atualizada com sucesso.");
    } catch (e) {
      setErro(e.message || "Não foi possível atualizar a lista.");
    } finally {
      setAtualizando(false);
    }
  }

  async function cadastrarVariante(event) {
    event.preventDefault();
    if (envioAtual.current || salvando || carregando || atualizando || ocupadoId !== null || !listaCarregada) return;

    setErro("");
    setMensagem("");

    const obrigatorios = ["sku", "color_name", "color_code", "size_name", "size_code"];
    if (obrigatorios.some((campo) => !formulario[campo].trim())) {
      setErro("Preencha SKU, cor, código da cor, tamanho e código do tamanho.");
      return;
    }

    const sku = normalizar(formulario.sku);
    const cor = normalizar(formulario.color_code);
    const tamanho = normalizar(formulario.size_code);

    if (variantes.some((v) => normalizar(v.sku) === sku)) {
      setErro("Este SKU já está cadastrado neste produto.");
      return;
    }

    if (variantes.some((v) => v.color_code != null && v.size_code != null &&
      normalizar(v.color_code) === cor && normalizar(v.size_code) === tamanho)) {
      setErro("Já existe uma variante com esta combinação de cor e tamanho.");
      return;
    }

    let dados;
    try {
      const precoVenda = reaisParaCentavos(formulario.sale_price);
      const precoCusto = formulario.cost_price.trim()
        ? reaisParaCentavos(formulario.cost_price)
        : null;

      const quantidadeTexto = formulario.available_quantity.trim();
      const quantidade = Number(quantidadeTexto);
      if (!/^\d+$/.test(quantidadeTexto) || !Number.isSafeInteger(quantidade)) {
        throw new Error("Informe uma quantidade válida para o estoque.");
      }

      const prazoTexto = formulario.lead_time_days.trim();
      const prazo = Number(prazoTexto);
      if (!/^\d+$/.test(prazoTexto) || !Number.isSafeInteger(prazo)) {
        throw new Error("Informe um prazo válido.");
      }

      dados = {
        sku: formulario.sku.trim(),
        color_name: formulario.color_name.trim(),
        color_code: formulario.color_code.trim(),
        size_name: formulario.size_name.trim(),
        size_code: formulario.size_code.trim(),
        sale_price_cents: precoVenda,
        cost_price_cents: precoCusto,
        available_quantity: quantidade,
        source_type: formulario.source_type,
        lead_time_days: prazo
      };
    } catch (e) {
      setErro(e.message);
      return;
    }

    const controller = new AbortController();
    envioAtual.current = controller;
    setSalvando(true);

    try {
      const resposta = await fetch(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Neumam-Request": "1"
        },
        body: JSON.stringify(dados),
        signal: controller.signal
      });

      const resultado = await resposta.json();
      if (!resposta.ok) {
        throw new Error(resultado.mensagem || "Não foi possível cadastrar.");
      }

      if (resposta.status !== 201 || !resultado.variant_id) {
        throw new Error("Cadastro não confirmado. Recarregue a lista antes de tentar novamente.");
      }

      setFormulario({ ...FORMULARIO_INICIAL });
      setMensagem("Variante cadastrada com sucesso.");

      try {
        const atualizadas = await consultarVariantes(productId, controller.signal);
        if (!controller.signal.aborted) {
          setVariantes(atualizadas);
          setListaCarregada(true);
        }
      } catch {
        setMensagem("Variante cadastrada. Clique em 'Atualizar lista' para conferir o cadastro.");
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        setErro("Não foi possível confirmar o cadastro. Atualize a lista antes de tentar novamente. " + (e.message || ""));
      }
    } finally {
      if (envioAtual.current === controller) {
        envioAtual.current = null;
        setSalvando(false);
      }
    }
  }


  function abrirEdicao(variante) {
    if (salvando || atualizando || ocupadoId !== null || !ativa(variante)) return;
    setErro("");
    setMensagem("");
    setEditandoId(variante.id);
    setEdicao({
      sku: variante.sku ?? "",
      color_name: variante.color_name ?? "",
      color_code: variante.color_code ?? "",
      size_name: variante.size_name ?? "",
      size_code: variante.size_code ?? "",
      sale_price: centavosParaCampo(variante.sale_price_cents),
      cost_price: centavosParaCampo(variante.cost_price_cents),
      promotional_price: centavosParaCampo(variante.promotional_price_cents),
      available_quantity: String(estoqueDaVariante(variante) ?? 0),
      source_type: variante.source_type ?? "supplier",
      lead_time_days: String(variante.lead_time_days ?? 5)
    });
  }

  function alterarEdicao(campo, valor) {
    setEdicao((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviarEdicao(event) {
    event.preventDefault();
    if (!edicao || editandoId === null || ocupadoId !== null || salvando || atualizando || operacaoVariante.current) return;
    setErro("");
    setMensagem("");
    let dados;
    try {
      const obrigatorios = ["sku", "color_name", "color_code", "size_name", "size_code"];
      if (obrigatorios.some((campo) => !edicao[campo].trim())) {
        throw new Error("Preencha SKU, cor, códigos e tamanho.");
      }
      const sku = normalizar(edicao.sku);
      const cor = normalizar(edicao.color_code);
      const tamanho = normalizar(edicao.size_code);
      if (variantes.some((v) => v.id !== editandoId && normalizar(v.sku) === sku)) {
        throw new Error("Já existe uma variante com este SKU.");
      }
      if (variantes.some((v) => v.id !== editandoId &&
        normalizar(v.color_code) === cor && normalizar(v.size_code) === tamanho)) {
        throw new Error("Já existe essa combinação de cor e tamanho.");
      }
      const quantidade = edicao.available_quantity.trim();
      const prazo = edicao.lead_time_days.trim();
      if (!/^\d+$/.test(quantidade) || !Number.isSafeInteger(Number(quantidade))) {
        throw new Error("Informe uma quantidade válida de estoque.");
      }
      if (!/^\d+$/.test(prazo) || !Number.isSafeInteger(Number(prazo))) {
        throw new Error("Informe um prazo de entrega válido.");
      }
      dados = {
        sku: edicao.sku.trim(),
        color_name: edicao.color_name.trim(),
        color_code: edicao.color_code.trim(),
        size_name: edicao.size_name.trim(),
        size_code: edicao.size_code.trim(),
        sale_price_cents: reaisParaCentavos(edicao.sale_price),
        cost_price_cents: edicao.cost_price.trim() ? reaisParaCentavos(edicao.cost_price) : null,
        promotional_price_cents: edicao.promotional_price.trim() ? reaisParaCentavos(edicao.promotional_price) : null,
        available_quantity: Number(quantidade),
        source_type: edicao.source_type,
        lead_time_days: Number(prazo)
      };
      if (dados.promotional_price_cents !== null &&
        dados.promotional_price_cents > dados.sale_price_cents) {
        throw new Error("O preço promocional não pode superar o preço de venda.");
      }
    } catch (e) {
      setErro(e.message);
      return;
    }
    const id = editandoId;
    operacaoVariante.current = true;
    setOcupadoId(id);
    try {
      const resposta = await fetch(`/api/admin/products/${productId}/variants/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Neumam-Request": "1" },
        body: JSON.stringify(dados)
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.mensagem || "Não foi possível salvar.");
      setEditandoId(null);
      setEdicao(null);
      setMensagem(resultado.mensagem || "Variante atualizada.");
      try {
        setVariantes(await consultarVariantes(productId));
      } catch {
        setMensagem("Edição confirmada. Clique em Atualizar lista para conferir os dados.");
      }
    } catch (e) {
      setErro("Edição não confirmada. Atualize a lista antes de tentar novamente. " + (e.message || ""));
    } finally {
      operacaoVariante.current = false;
      setOcupadoId(null);
    }
  }

  async function mudarSituacao(variante) {
    if (ocupadoId !== null || salvando || atualizando || operacaoVariante.current) return;
    const estaArquivada = variante.status === "archived";
    const status = estaArquivada ? "active" : "archived";
    const pergunta = estaArquivada
      ? `Reativar ${variante.color_name} / ${variante.size_name}?`
      : `Arquivar ${variante.color_name} / ${variante.size_name}? O SKU e o histórico serão preservados. A variante deixará de ser ativa.`;
    if (!window.confirm(pergunta)) return;
    setErro("");
    setMensagem("");
    operacaoVariante.current = true;
    setOcupadoId(variante.id);
    try {
      const resposta = await fetch(`/api/admin/products/${productId}/variants/${variante.id}/status`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Neumam-Request": "1" },
        body: JSON.stringify({ status })
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.mensagem || "Não foi possível mudar a situação.");
      if (editandoId === variante.id) {
        setEditandoId(null);
        setEdicao(null);
      }
      setMensagem(resultado.mensagem);
      try {
        setVariantes(await consultarVariantes(productId));
      } catch {
        setMensagem("Operação confirmada. Clique em Atualizar lista para conferir a situação.");
      }
    } catch (e) {
      setErro("Não foi possível confirmar a operação. Atualize a lista para conferir. " + (e.message || ""));
    } finally {
      operacaoVariante.current = false;
      setOcupadoId(null);
    }
  }

  return (
    <section className="admin__painel nmv">
      <style>{`
        .nmv { color: #252525; }
        .nmv__titulo { margin: 0 0 6px; }
        .nmv__descricao { margin: 0 0 20px; color: #555; font-size: 16px; line-height: 1.6; }
        .nmv__resumo { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 22px; }
        .nmv__indicador { background: #faf8f5; border: 1px solid #e8dfd3; border-radius: 10px; padding: 15px; }
        .nmv__indicador span { display: block; font-size: 14px; color: #55483c; margin-bottom: 6px; }
        .nmv__indicador strong { display: block; font-size: 25px; line-height: 1.2; }
        .nmv__secao { border: 1px solid #e6ddd1; border-radius: 12px; background: #fff; padding: 18px; margin-top: 18px; }
        .nmv__secao-cabecalho { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
        .nmv__secao h3 { margin: 0; }
        .nmv__filtros { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; margin-bottom: 14px; }
        .nmv__filtros label { display: flex; flex-direction: column; gap: 6px; color: #554c43; font-size: 14px; }
        .nmv__filtros input, .nmv__filtros select { box-sizing: border-box; min-height: 38px; padding: 8px 10px; border: 1px solid #cfc5b8; border-radius: 7px; background: white; color: #252525; }
        .nmv__filtros input { min-width: 220px; }
        .nmv__botao-secundario { background: #fff; color: #252525; border: 1px solid #a9a097; border-radius: 7px; padding: 8px 12px; cursor: pointer; font: inherit; }
        .nmv__botao-secundario:disabled { opacity: 0.55; cursor: not-allowed; }
        .nmv__tabela-rolagem { width: 100%; overflow-x: auto; }
        .nmv__tabela { width: 100%; min-width: 760px; border-collapse: collapse; font-size: 14px; text-align: left; }
        .nmv__tabela th { background: #f8f5f0; color: #594c3f; font-weight: 600; white-space: nowrap; }
        .nmv__tabela th, .nmv__tabela td { padding: 11px 9px; border-bottom: 1px solid #ebe5dc; vertical-align: middle; }
        .nmv__tabela td:nth-child(3) { overflow-wrap: anywhere; }
        .nmv__acoes { display: flex; gap: 7px; flex-wrap: wrap; }
        .nmv__acoes button { padding: 6px 9px; border: 1px solid #bdb1a2; background: #fff; border-radius: 6px; font: inherit; color: #28221b; cursor: pointer; }
        .nmv__acoes button:disabled { opacity: .5; cursor: not-allowed; }
        .nmv__acoes .nmv__arquivar { color: #8c4239; border-color: #d6a79e; }
        .nmv__edicao { margin-top: 15px; padding: 16px; background: #fcfaf7; border: 1px solid #e4d7c4; border-radius: 10px; }
        .nmv__edicao h4 { margin: 0 0 12px; }
        .nmv__edicao .nmv__campos { margin-bottom: 14px; }
        .nmv__edicao-acoes { display: flex; gap: 9px; flex-wrap: wrap; }
        .nmv__campos select { width: 100%; min-height: 38px; border-radius: 7px; border: 1px solid #cfc5b8; background: white; color: #252525; padding: 8px; }
        .nmv__tabela tbody tr:hover { background: #fdfbf8; }
        .nmv__situacao { display: inline-block; border-radius: 20px; padding: 6px 10px; font-size: 13px; white-space: nowrap; }
        .nmv__situacao--ok { background: #e8f5e9; color: #246332; }
        .nmv__situacao--baixo { background: #fff4d6; color: #7e5300; }
        .nmv__situacao--esgotado { background: #fae8e7; color: #a12622; }
        .nmv__situacao--arquivada { background: #f1efed; color: #62584d; }
        .nmv__situacao--indefinido { background: #f0efee; color: #595959; }
        .nmv__aviso { padding: 11px 13px; border-radius: 8px; margin: 12px 0; font-size: 14px; }
        .nmv__aviso--erro { color: #8b2424; background: #fff0ee; border: 1px solid #f0c8c4; }
        .nmv__aviso--sucesso { color: #216139; background: #eaf8ee; border: 1px solid #ccead3; }
        .nmv__campos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .nmv__campos .admin__cadastro-campo { min-width: 0; }
        .nmv__campos input { box-sizing: border-box; width: 100%; }
        .nmv__formulario { width: 100%; max-width: none; border: 0; padding: 0; margin: 0; }
        .nmv__ajuda { margin: 10px 0 0; font-size: 14px; line-height: 1.6; color: #554d45; }
        .nmv__acoes-formulario { margin-top: 16px; }
        @media (max-width: 750px) {
          .nmv__resumo { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .nmv__campos { grid-template-columns: 1fr; }
          .nmv__filtros input { min-width: 0; width: 100%; }
          .nmv__filtros label { flex: 1 1 180px; }
          .nmv__secao { padding: 13px; }
        }
      `}</style>

      <h2 className="nmv__titulo">Cores, tamanhos, preços e estoque</h2>
      <p className="nmv__descricao">Consulte, edite e organize as variantes deste produto.</p>

      <div className="nmv__resumo" aria-label="Resumo das variantes">
        <div className="nmv__indicador"><span>Variantes ativas</span><strong>{listaCarregada ? variantesAtivas.length : "—"}</strong></div>
        <div className="nmv__indicador"><span>Unidades em estoque</span><strong>{listaCarregada && estoqueConhecido ? estoqueTotal : "—"}</strong></div>
        <div className="nmv__indicador"><span>Variantes esgotadas</span><strong>{listaCarregada && estoqueConhecido ? esgotadas : "—"}</strong></div>
        <div className="nmv__indicador"><span>Estoque baixo (1–5)</span><strong>{listaCarregada && estoqueConhecido ? baixoEstoque : "—"}</strong></div>
      </div>
      {listaCarregada && arquivadas > 0 && <p className="nmv__ajuda">Variantes arquivadas: {arquivadas}. Use o filtro de situação para visualizá-las ou reativá-las.</p>}

      {erro && <p className="nmv__aviso nmv__aviso--erro" role="alert">{erro}</p>}
      {mensagem && <p className="nmv__aviso nmv__aviso--sucesso" role="status">{mensagem}</p>}

      <div className="nmv__secao">
        <div className="nmv__secao-cabecalho">
          <h3>Variantes cadastradas</h3>
          <button className="nmv__botao-secundario" type="button" disabled={atualizando || salvando || carregando || ocupadoId !== null} onClick={atualizarLista}>
            {atualizando ? "Atualizando..." : "Atualizar lista"}
          </button>
        </div>

        {listaCarregada && variantes.length > 0 && (
          <div className="nmv__filtros">
            <label htmlFor="nmv-busca">Buscar variante
              <input id="nmv-busca" type="search" placeholder="Cor, tamanho ou SKU" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </label>
            <label htmlFor="nmv-status-filtro">Situação da variante
              <select id="nmv-status-filtro" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                <option value="ativas">Ativas</option>
                <option value="arquivadas">Arquivadas</option>
                <option value="todas">Todas</option>
              </select>
            </label>
            <label htmlFor="nmv-estoque-filtro">Situação do estoque
              <select id="nmv-estoque-filtro" value={filtroEstoque} onChange={(e) => setFiltroEstoque(e.target.value)}>
                <option value="todos">Todas</option>
                <option value="disponiveis">Disponíveis</option>
                <option value="esgotadas">Esgotadas</option>
              </select>
            </label>
          </div>
        )}

        {carregando && <p role="status">Carregando variantes...</p>}
        {!carregando && !listaCarregada && <p>Não foi possível apresentar as variantes. Tente atualizar a lista.</p>}
        {listaCarregada && variantes.length === 0 && <p>Nenhuma variante cadastrada. Use o formulário abaixo para começar.</p>}
        {listaCarregada && variantes.length > 0 && variantesFiltradas.length === 0 && <p>Nenhuma variante encontrada para estes filtros.</p>}

        {listaCarregada && variantesFiltradas.length > 0 && (
          <div className="nmv__tabela-rolagem">
            <table className="nmv__tabela">
              <thead><tr><th>Cor</th><th>Tamanho</th><th>SKU</th><th>Venda</th><th>Custo</th><th>Estoque</th><th>Situação</th><th>Ações</th></tr></thead>
              <tbody>
                {variantesFiltradas.map((v) => {
                  const saldo = estoqueDaVariante(v);
                  const classe = v.status === "archived" ? "arquivada" :
                    !ativa(v) ? "indefinido" : saldo === null ? "indefinido" : saldo === 0 ? "esgotado" : saldo <= 5 ? "baixo" : "ok";
                  const situacao = v.status === "archived" ? "Arquivada" :
                    !ativa(v) ? "Inativa" : saldo === null ? "Não informado" : saldo === 0 ? "Esgotado" : saldo <= 5 ? "Estoque baixo" : "Disponível";
                  return (
                    <tr key={v.id ?? v.sku}>
                      <td>{v.color_name || "—"}</td>
                      <td>{v.size_name || "—"}</td>
                      <td>{v.sku || "—"}</td>
                      <td>{precoDaVariante(v, "sale_price_cents")}</td>
                      <td>{precoDaVariante(v, "cost_price_cents")}</td>
                      <td>{saldo === null ? "—" : saldo}</td>
                      <td><span className={`nmv__situacao nmv__situacao--${classe}`}>{situacao}</span></td>
                      <td><div className="nmv__acoes">
                        {ativa(v) && <button type="button" disabled={ocupadoId !== null || salvando || atualizando} onClick={() => abrirEdicao(v)}>Editar</button>}
                        {(ativa(v) || v.status === "archived") && (
                          <button type="button" className={ativa(v) ? "nmv__arquivar" : ""}
                            disabled={ocupadoId !== null || salvando || atualizando} onClick={() => mudarSituacao(v)}>
                            {ocupadoId === v.id ? "Aguarde..." : ativa(v) ? "Arquivar" : "Reativar"}
                          </button>
                        )}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {listaCarregada && variantes.length > 0 && <p className="nmv__ajuda">Exibindo {variantesFiltradas.length} de {variantes.length} variantes. Variantes arquivadas não entram nos totais de estoque.</p>}
        {editandoId !== null && edicao && (
          <form className="nmv__edicao" onSubmit={enviarEdicao}>
            <h4>Editar variante — {edicao.color_name} / {edicao.size_name}</h4>
            <div className="nmv__campos">
              {[
                ["sku", "SKU"], ["color_name", "Cor"],
                ["size_name", "Tamanho"], ["color_code", "Código da cor"],
                ["size_code", "Código do tamanho"]
              ].map(([campo, titulo]) => (
                <div className="admin__cadastro-campo" key={campo}>
                  <label htmlFor={`nmv-editar-${campo}`}>{titulo}</label>
                  <input id={`nmv-editar-${campo}`} value={edicao[campo]} required
                    onChange={(e) => alterarEdicao(campo, e.target.value)} />
                </div>
              ))}
              {[
                ["sale_price", "Preço de venda (R$)", true],
                ["cost_price", "Preço de custo (R$)", false],
                ["promotional_price", "Preço promocional (R$)", false]
              ].map(([campo, titulo, obrigatorio]) => (
                <div className="admin__cadastro-campo" key={campo}>
                  <label htmlFor={`nmv-editar-${campo}`}>{titulo}</label>
                  <input id={`nmv-editar-${campo}`} type="number" step="0.01" min="0"
                    value={edicao[campo]} required={obrigatorio}
                    onChange={(e) => alterarEdicao(campo, e.target.value)} />
                </div>
              ))}
              <div className="admin__cadastro-campo">
                <label htmlFor="nmv-editar-estoque">Quantidade em estoque</label>
                <input id="nmv-editar-estoque" type="number" min="0" step="1" required
                  value={edicao.available_quantity}
                  onChange={(e) => alterarEdicao("available_quantity", e.target.value)} />
              </div>
              <div className="admin__cadastro-campo">
                <label htmlFor="nmv-editar-origem">Origem do estoque</label>
                <select id="nmv-editar-origem" value={edicao.source_type}
                  onChange={(e) => alterarEdicao("source_type", e.target.value)}>
                  <option value="supplier">Fornecedor</option>
                  <option value="own_stock">Estoque próprio</option>
                  <option value="dropship">Dropshipping</option>
                </select>
              </div>
              <div className="admin__cadastro-campo">
                <label htmlFor="nmv-editar-prazo">Prazo de entrega (dias)</label>
                <input id="nmv-editar-prazo" type="number" min="0" step="1" required
                  value={edicao.lead_time_days}
                  onChange={(e) => alterarEdicao("lead_time_days", e.target.value)} />
              </div>
            </div>
            <div className="nmv__edicao-acoes">
              <button type="submit" disabled={ocupadoId !== null || salvando || atualizando}>
                {ocupadoId === editandoId ? "Salvando..." : "Salvar alterações"}
              </button>
              <button className="nmv__botao-secundario" type="button"
                disabled={ocupadoId !== null}
                onClick={() => { setEditandoId(null); setEdicao(null); }}>Cancelar</button>
            </div>
            <p className="nmv__ajuda">As alterações de preço preservam o registro anterior no banco.</p>
          </form>
        )}
      </div>

      <div className="nmv__secao">
        <div className="nmv__secao-cabecalho">
          <h3>Nova variante</h3>
          <button type="button" className="nmv__botao-secundario" onClick={() => setFormularioAberto((aberto) => !aberto)} aria-expanded={formularioAberto} aria-controls="nmv-formulario">
            {formularioAberto ? "Recolher formulário" : "Abrir formulário"}
          </button>
        </div>

        {formularioAberto && (
          <form id="nmv-formulario" className="admin__cadastro-produto nmv__formulario" onSubmit={cadastrarVariante}>
            <div className="nmv__campos">
              {[
                { nome: "sku", titulo: "SKU", exemplo: skuBase ? `${skuBase}-AZUL-P` : "EXEMPLO-AZUL-P" },
                { nome: "color_name", titulo: "Cor", exemplo: "Azul" },
                { nome: "size_name", titulo: "Tamanho", exemplo: "P, M, G ou GG" },
                { nome: "color_code", titulo: "Código da cor", exemplo: "AZUL" },
                { nome: "size_code", titulo: "Código do tamanho", exemplo: "P" }
              ].map((campo) => (
                <div key={campo.nome} className="admin__cadastro-campo">
                  <label htmlFor={`nmv-${campo.nome}`}>{campo.titulo}</label>
                  <input id={`nmv-${campo.nome}`} value={formulario[campo.nome]} placeholder={campo.exemplo} onChange={(e) => alterarCampo(campo.nome, e.target.value)} required />
                </div>
              ))}
              <div className="admin__cadastro-campo">
                <label htmlFor="nmv-preco">Preço de venda (R$)</label>
                <input id="nmv-preco" type="number" min="0" step="0.01" value={formulario.sale_price} onChange={(e) => alterarCampo("sale_price", e.target.value)} required />
              </div>
              <div className="admin__cadastro-campo">
                <label htmlFor="nmv-custo">Preço de custo (R$) — opcional</label>
                <input id="nmv-custo" type="number" min="0" step="0.01" value={formulario.cost_price} onChange={(e) => alterarCampo("cost_price", e.target.value)} />
              </div>
              <div className="admin__cadastro-campo">
                <label htmlFor="nmv-quantidade">Quantidade em estoque</label>
                <input id="nmv-quantidade" type="number" min="0" step="1" value={formulario.available_quantity} onChange={(e) => alterarCampo("available_quantity", e.target.value)} required />
              </div>
            </div>
            <div className="nmv__acoes-formulario">
              <button type="submit" disabled={salvando || carregando || atualizando || ocupadoId !== null || !listaCarregada}>
                {salvando ? "Cadastrando..." : "Cadastrar variante"}
              </button>
            </div>
            <p className="nmv__ajuda">Uma mesma combinação de cor e tamanho deve ser cadastrada apenas uma vez por produto.</p>
          </form>
        )}
      </div>
    </section>
  );
}

export default AdminProductVariants;
