const Database = require("better-sqlite3");
const path = require("node:path");

function executar() {
  const argumentos = process.argv.slice(2);
  const [numero, centavos, opcao] = argumentos;

  if (
    argumentos.length < 2 ||
    argumentos.length > 3 ||
    !numero?.startsWith("NM-") ||
    !/^(0|[1-9]\d*)$/.test(centavos || "") ||
    (opcao !== undefined && opcao !== "--apply")
  ) {
    throw new Error(
      "Use: node database/quote-order-shipping.js NUMERO FRETE_EM_CENTAVOS [--apply]"
    );
  }

  const frete = Number(centavos);

  if (!Number.isSafeInteger(frete) || frete < 0) {
    throw new Error("Informe um frete válido em centavos inteiros.");
  }

  const aplicar = opcao === "--apply";

  const db = new Database(path.join(__dirname, "neumam.db"), {
    fileMustExist: true,
    readonly: !aplicar,
  });

  try {
    db.pragma("foreign_keys = ON");

    function preparar() {
      const pedido = db.prepare(`
        SELECT
          id,
          order_number,
          status,
          payment_status,
          currency,
          shipping_status,
          subtotal_cents,
          discount_total_cents,
          tax_total_cents,
          shipping_total_cents,
          total_cents
        FROM orders
        WHERE order_number = ?
      `).get(numero);

      if (!pedido) {
        throw new Error("Pedido não encontrado.");
      }

      if (
        pedido.status !== "pending" ||
        pedido.payment_status !== "pending" ||
        pedido.currency !== "BRL"
      ) {
        throw new Error(
          "Este comando aceita apenas pedidos pendentes, sem pagamento, em BRL."
        );
      }

      for (const campo of [
        "subtotal_cents",
        "discount_total_cents",
        "tax_total_cents",
      ]) {
        if (
          !Number.isSafeInteger(pedido[campo]) ||
          pedido[campo] < 0
        ) {
          throw new Error(`Valor inválido no pedido: ${campo}.`);
        }
      }

      if (pedido.discount_total_cents > pedido.subtotal_cents) {
        throw new Error("O desconto do pedido precisa de revisão.");
      }

      const total =
        BigInt(pedido.subtotal_cents) -
        BigInt(pedido.discount_total_cents) +
        BigInt(frete) +
        BigInt(pedido.tax_total_cents);

      if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("O total ultrapassa o limite permitido.");
      }

      const totalCentavos = Number(total);

      if (pedido.shipping_status === "quoted") {
        if (
          pedido.shipping_total_cents === frete &&
          pedido.total_cents === totalCentavos
        ) {
          return {
            pedido,
            totalCentavos,
            jaRegistrado: true,
          };
        }

        throw new Error(
          "Este pedido já possui outro orçamento. Nenhum valor foi alterado."
        );
      }

      if (pedido.shipping_status !== "awaiting_quote") {
        throw new Error("Este pedido não está aguardando orçamento.");
      }

      return {
        pedido,
        totalCentavos,
        jaRegistrado: false,
      };
    }

    function mostrar(resultado) {
      const formatar = (valor) =>
        new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(valor / 100);

      console.table([{
        pedido: resultado.pedido.order_number,
        produtos: formatar(resultado.pedido.subtotal_cents),
        desconto: formatar(resultado.pedido.discount_total_cents),
        tributos: formatar(resultado.pedido.tax_total_cents),
        frete: formatar(frete),
        total: formatar(resultado.totalCentavos),
      }]);
    }

    if (!aplicar) {
      const resultado = preparar();
      mostrar(resultado);

      console.log(
        resultado.jaRegistrado
          ? "Este orçamento já está registrado."
          : "Prévia: nenhum dado foi alterado. Use --apply para registrar."
      );
      return;
    }

    const registrar = db.transaction(() => {
      const resultado = preparar();

      if (resultado.jaRegistrado) {
        return resultado;
      }

      const atualizacao = db.prepare(`
        UPDATE orders
        SET shipping_status = 'quoted',
            shipping_total_cents = @frete,
            total_cents = @total,
            updated_at = CURRENT_TIMESTAMP,
            notes = COALESCE(notes, '') || char(10) ||
              'ORCAMENTO_FRETE: ' || @frete ||
              ' centavos, registrado em ' || CURRENT_TIMESTAMP
        WHERE id = @id
          AND shipping_status = 'awaiting_quote'
          AND status = 'pending'
          AND payment_status = 'pending'
      `).run({
        id: resultado.pedido.id,
        frete,
        total: resultado.totalCentavos,
      });

      if (atualizacao.changes !== 1) {
        throw new Error("O pedido mudou. Consulte novamente.");
      }

      return resultado;
    });

    const resultado = registrar.immediate();
    mostrar(resultado);

    console.log(
      resultado.jaRegistrado
        ? "Este orçamento já estava registrado. Nenhuma alteração adicional."
        : "Frete registrado e total atualizado."
    );

    console.log("Pagamento e estoque não foram alterados.");
  } finally {
    db.close();
  }
}

try {
  executar();
} catch (erro) {
  console.error("Não foi possível registrar o frete:", erro.message);
  process.exitCode = 1;
}