/**
 * Impressão Térmica via WebUSB (ESC/POS) — 58mm / 80mm
 * Emite o DANFE NFC-e completo com todos os itens, totais, QR Code nativo e tributos.
 */

// ─── Constantes ESC/POS ───────────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;
const FS  = 0x1c;

const CMD = {
  INIT:         [ESC, 0x40],
  LF:           [0x0a],
  // Alinhamento
  CENTER:       [ESC, 0x61, 0x01],
  LEFT:         [ESC, 0x61, 0x00],
  RIGHT:        [ESC, 0x61, 0x02],
  // Negrito
  BOLD_ON:      [ESC, 0x45, 0x01],
  BOLD_OFF:     [ESC, 0x45, 0x00],
  // Tamanho
  DOUBLE_HEIGHT:[GS,  0x21, 0x01],   // altura 2x
  NORMAL_SIZE:  [GS,  0x21, 0x00],   // normal
  // Corte
  CUT_FULL:     [GS,  0x56, 0x00],   // corte total
  CUT_PARTIAL:  [GS,  0x56, 0x01],   // corte parcial (mais seguro)
};

// ─── Larguras por papel ───────────────────────────────────────────────────────
const COL_58MM = 32;
const COL_80MM = 48;

// ─── Helpers de formatação ────────────────────────────────────────────────────
function pad(str: string, len: number, right = false): string {
  const s = String(str).substring(0, len);
  return right ? s.padStart(len) : s.padEnd(len);
}

function line(cols: number): string {
  return "-".repeat(cols);
}

/** Formata linha de 2 colunas: esquerda + direita alinhada */
function cols2(left: string, right: string, width: number): string {
  const rightLen = right.length;
  const leftLen = width - rightLen - 1;
  return left.substring(0, leftLen).padEnd(leftLen) + " " + right;
}

/** Quebra texto em linhas de até `width` chars */
function wrap(text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= width) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word.substring(0, width);
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text.substring(0, width)];
}

/** Formata valor em Reais */
function brl(cents: number): string {
  return "R$ " + (cents / 100).toFixed(2).replace(".", ",");
}

/** Formata data/hora em pt-BR */
function fmtDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/** Método de pagamento em texto */
function fmtMethod(method: string): string {
  const map: Record<string, string> = {
    cash: "Dinheiro",
    card: "Cartão",
    pix: "PIX",
    credit: "Crédito",
    debit: "Débito",
  };
  return map[method] || method;
}

// ─── QR Code nativo ESC/POS (GS ( k) ─────────────────────────────────────────
function buildQRCode(url: string): number[] {
  const enc = new TextEncoder();
  const data = enc.encode(url);
  const storeLen = data.length + 3;
  const pL = storeLen & 0xff;
  const pH = (storeLen >> 8) & 0xff;

  return [
    // 1. Modelo 2
    GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
    // 2. Tamanho dos módulos (6 = ~36×36 pixels, bom para 58mm)
    GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06,
    // 3. Nível de correção M (48)
    GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31,
    // 4. Armazena dados
    GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30,
    ...Array.from(data),
    // 5. Imprime
    GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30,
  ];
}

// ─── Chave de Acesso formatada (grupos de 4) ──────────────────────────────────
function fmtChave(chave: string): string[] {
  // 44 dígitos → 11 grupos de 4
  const groups: string[] = [];
  for (let i = 0; i < chave.length; i += 4) {
    groups.push(chave.substring(i, i + 4));
  }
  // Divide em linhas de no máximo 32 chars (58mm)
  const lines: string[] = [];
  let cur = "";
  for (const g of groups) {
    if ((cur + " " + g).trim().length <= COL_58MM) {
      cur = (cur + " " + g).trim();
    } else {
      if (cur) lines.push(cur);
      cur = g;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ─── Monta o conteúdo textual do recibo ──────────────────────────────────────
function buildReceiptLines(nfceData: any, saleData: any, settings: any): string[] {
  const cols = settings.printerWidth === "80mm" ? COL_80MM : COL_58MM;
  const sep = line(cols);
  const L: string[] = [];

  const razao = (settings.razaoSocial || "ESTABELECIMENTO").toUpperCase();
  const fantasia = settings.nomeFantasia || "";
  const cnpj = settings.cnpj || "";
  const endereco = [settings.logradouro, settings.numero].filter(Boolean).join(", ");
  const bairroUF = [settings.bairro, settings.municipio, settings.uf].filter(Boolean).join(" - ");

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  // Centro: razão social (negrito, dupla altura — marcado com prefixo especial)
  L.push("__BOLD_ON__");
  L.push("__CENTER__");
  L.push(razao.substring(0, cols));
  L.push("__BOLD_OFF__");
  if (fantasia && fantasia !== razao) L.push(fantasia.substring(0, cols));
  L.push("CNPJ: " + cnpj);
  if (endereco) L.push(endereco.substring(0, cols));
  if (bairroUF) L.push(bairroUF.substring(0, cols));
  if (settings.telefone) L.push("Tel: " + settings.telefone);
  L.push(sep);

  // ── Título DANFE ───────────────────────────────────────────────────────────
  L.push("__BOLD_ON__");
  L.push("DANFE NFC-e");
  L.push("__BOLD_OFF__");
  L.push("Documento Auxiliar NF-e ao Consumidor");

  const nro = String(nfceData.numero || "").padStart(6, "0");
  const serie = String(nfceData.serie || "1").padStart(3, "0");
  L.push(`Nro ${nro}  Serie ${serie}`);
  L.push(fmtDate(nfceData.dataEmissao || new Date()));

  // Ambiente
  if (settings.ambiente !== "producao") {
    L.push("*** AMBIENTE DE HOMOLOGACAO ***");
    L.push("*** SEM VALOR FISCAL ***");
  }

  L.push("__LEFT__");
  L.push(sep);

  // ── Itens ──────────────────────────────────────────────────────────────────
  L.push("__LEFT__");
  const items: any[] = saleData?.items || nfceData?.items || [];
  for (const item of items) {
    const name = item.name || item.xProd || "PRODUTO";
    const isKg = item.unitType === "kg";
    const qty = isKg
      ? (item.quantity / 1000).toFixed(3) + " kg"
      : item.quantity + " un";
    const unitPrice = brl(item.unitPrice);
    const totalItem = brl(item.totalPrice);

    // Linha 1: nome do produto (quebra se necessário)
    const nameLines = wrap(name.toUpperCase(), cols);
    nameLines.forEach((nl) => L.push(nl));

    // Linha 2: qtd × unitPrice = total (alinhado à direita)
    const detail = `${qty} x ${unitPrice} = ${totalItem}`;
    L.push(detail.substring(0, cols).padStart(cols));
    L.push("");
  }

  L.push(sep);

  // ── Totais ─────────────────────────────────────────────────────────────────
  const totalAmount = nfceData?.valorTotal || saleData?.totalAmount || 0;
  L.push(cols2("SUBTOTAL:", brl(totalAmount), cols));

  // ── Pagamentos ─────────────────────────────────────────────────────────────
  const payments: any[] = saleData?.payments || nfceData?.payments || [];
  let totalPaid = 0;
  for (const p of payments) {
    totalPaid += p.amount;
    L.push(cols2(fmtMethod(p.method) + ":", brl(p.amount), cols));
  }

  // ── Total destacado ───────────────────────────────────────────────────────
  L.push(sep);
  L.push("__BOLD_ON__");
  L.push(cols2("TOTAL:", brl(totalAmount), cols));
  L.push("__BOLD_OFF__");

  // ── Troco ─────────────────────────────────────────────────────────────────
  const troco = totalPaid - totalAmount;
  if (troco > 0) {
    L.push(cols2("TROCO:", brl(troco), cols));
  }

  L.push(sep);

  // ── Dados do Consumidor ───────────────────────────────────────────────────
  if (saleData?.customerName || saleData?.customerTaxId) {
    L.push("__LEFT__");
    if (saleData.customerName) L.push("Cliente: " + saleData.customerName.substring(0, cols - 9));
    if (saleData.customerTaxId) {
      const taxLabel = saleData.customerTaxId.replace(/\D/g, "").length === 11 ? "CPF:" : "CNPJ:";
      L.push(taxLabel + " " + saleData.customerTaxId);
    }
    L.push(sep);
  }

  // ── Informações Fiscais ───────────────────────────────────────────────────
  L.push("__CENTER__");
  const chave = nfceData?.chaveAcesso || "";
  if (chave) {
    L.push("Consulte pela Chave de Acesso:");
    fmtChave(chave).forEach((cl) => L.push(cl));
    L.push("");
  }

  // Protocolo de Autorização
  if (nfceData?.protocolo && !nfceData.protocolo.startsWith("SIM")) {
    L.push("Protocolo: " + nfceData.protocolo);
    L.push("");
  }

  // ── QR Code ───────────────────────────────────────────────────────────────
  // (será inserido como bytes raw depois — marcador especial)
  if (nfceData?.qrCode) {
    L.push("__QR:" + nfceData.qrCode + "__");
    L.push("");
    L.push("Consulte em: nfe.fazenda.gov.br");
  }

  L.push(sep);

  // ── Tributos (Lei 12.741/2012) ────────────────────────────────────────────
  L.push("__LEFT__");
  const tribFed  = ((totalAmount * 0.1345) / 100).toFixed(2).replace(".", ",");
  const tribEst  = ((totalAmount * 0.12) / 100).toFixed(2).replace(".", ",");
  const tribInfo = [
    "Trib. aprox. por Lei Fed. 12.741/2012:",
    `Federal: R$ ${tribFed}  Estadual: R$ ${tribEst}`,
    "Municipal: R$ 0,00",
  ];
  tribInfo.forEach((t) => wrap(t, cols).forEach((tl) => L.push(tl)));

  L.push(sep);

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  L.push("__CENTER__");
  L.push("Obrigado pela preferencia!");
  L.push("Volte sempre! :)");
  L.push("");
  L.push("");

  return L;
}

// ─── Converte linhas + marcadores em bytes ESC/POS ────────────────────────────
function linesToBytes(lines: string[]): Uint8Array {
  const enc = new TextEncoder();
  let bytes: number[] = [...CMD.INIT];

  // Começa centralizado para o cabeçalho
  bytes.push(...CMD.CENTER);

  for (const l of lines) {
    if (l === "__CENTER__") { bytes.push(...CMD.CENTER); continue; }
    if (l === "__LEFT__")   { bytes.push(...CMD.LEFT);   continue; }
    if (l === "__RIGHT__")  { bytes.push(...CMD.RIGHT);  continue; }
    if (l === "__BOLD_ON__")  { bytes.push(...CMD.BOLD_ON);  continue; }
    if (l === "__BOLD_OFF__") { bytes.push(...CMD.BOLD_OFF); continue; }
    if (l.startsWith("__QR:") && l.endsWith("__")) {
      const url = l.slice(5, -2);
      bytes.push(...CMD.CENTER);
      bytes.push(...buildQRCode(url));
      bytes.push(...CMD.LF);
      continue;
    }
    // Linha de texto normal
    bytes.push(...Array.from(enc.encode(l)));
    bytes.push(...CMD.LF);
  }

  // Corte parcial + espaço extra antes do corte
  bytes.push(...CMD.LF, ...CMD.LF, ...CMD.LF);
  bytes.push(...CMD.CUT_PARTIAL);

  return new Uint8Array(bytes);
}

// ─── Função de fallback: impressão via window.print() ─────────────────────────
function printViaWindow(nfceData: any, saleData: any, settings: any): void {
  const cols = 32;
  const lines = buildReceiptLines(nfceData, saleData, settings);

  // Filtra marcadores para texto puro
  const plainLines = lines.filter(
    (l) =>
      !l.startsWith("__") ||
      (l.startsWith("__QR:") && l.endsWith("__"))
  ).map((l) => {
    if (l.startsWith("__QR:") && l.endsWith("__")) {
      return `[QR Code: ${l.slice(5, -2).substring(0, 40)}...]`;
    }
    return l;
  });

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DANFE NFC-e</title>
  <style>
    @media print { @page { margin: 0; size: 58mm auto; } }
    body {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      width: 58mm;
      margin: 0;
      padding: 2mm;
      white-space: pre;
    }
  </style>
</head>
<body>${plainLines.join("\n")}</body>
</html>`;

  const win = window.open("", "_blank", "width=300,height=600");
  if (win) {
    win.document.write(htmlContent);
    win.document.close();
    win.onload = () => { win.print(); win.close(); };
  }
}

// ─── Função principal: tenta WebUSB, cai para window.print() ─────────────────
export async function printNFCe(
  nfceData: any,
  saleData: any,
  settings: any
): Promise<{ success: boolean; method: "usb" | "window" }> {

  const receiptLines = buildReceiptLines(nfceData, saleData, settings);
  const receiptBytes = linesToBytes(receiptLines);

  // Tenta WebUSB (declaração de tipo para API experimental)
  const nav = navigator as any;
  if (nav?.usb) {
    try {
      const device = await nav.usb.requestDevice({ filters: [] });
      console.log("[PRINT] Impressora selecionada:", device.productName);

      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);

      // Tenta as interfaces disponíveis (0, 1, 2)
      let claimed = false;
      for (let iface = 0; iface <= 2 && !claimed; iface++) {
        try {
          await device.claimInterface(iface);
          claimed = true;

          // Encontra endpoint de saída
          const alt = device.configuration?.interfaces[iface]?.alternates[0];
          const endpoint = alt?.endpoints?.find((e: any) => e.direction === "out");

          if (endpoint) {
            // Envia em blocos de 64 bytes (compatibilidade USB)
            const CHUNK = 64;
            for (let offset = 0; offset < receiptBytes.length; offset += CHUNK) {
              const chunk = receiptBytes.slice(offset, offset + CHUNK);
              await device.transferOut(endpoint.endpointNumber, chunk);
            }
            console.log("[PRINT] ✅ Impressão USB concluída");
            await device.close();
            return { success: true, method: "usb" };
          }
        } catch (_e) {
          // Tenta próxima interface
        }
      }

      await device.close();
    } catch (usbErr: any) {
      if (usbErr.name !== "NotFoundError") {
        console.warn("[PRINT] USB falhou, usando window.print():", usbErr.message);
      }
    }
  }

  // Fallback: janela de impressão do navegador
  printViaWindow(nfceData, saleData, settings);
  return { success: true, method: "window" };
}
