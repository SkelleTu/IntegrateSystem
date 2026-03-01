import { XMLBuilder, XMLParser } from "fast-xml-parser";
import crypto from "crypto";

export function generateChaveAcesso(settings: any, nNF: number) {
  const cUF = settings.codigoIbge.substring(0, 2);
  const now = new Date();
  const AAMM = now.getFullYear().toString().substring(2) + (now.getMonth() + 1).toString().padStart(2, '0');
  const CNPJ = settings.cnpj.replace(/\D/g, "");
  const mod = "65";
  const serie = settings.serieNfce.toString().padStart(3, '0');
  const numero = nNF.toString().padStart(9, '0');
  const tpEmis = "1";
  const cNF = Math.floor(Math.random() * 90000000) + 10000000;
  
  const base = `${cUF}${AAMM}${CNPJ}${mod}${serie}${numero}${tpEmis}${cNF}`;
  
  // Cálculo do Dígito Verificador (Módulo 11)
  let soma = 0;
  let peso = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += parseInt(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = (resto === 0 || resto === 1) ? 0 : 11 - resto;
  
  return base + dv;
}

export function generateNFCeXML(sale: any, items: any[], settings: any, nNF: number, chave: string) {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
  });

  const obj = {
    infNFe: {
      "@_Id": `NFe${chave}`,
      "@_versao": "4.00",
      ide: {
        cUF: settings.codigoIbge.substring(0, 2),
        cNF: chave.substring(35, 43),
        natOp: "VENDA",
        mod: "65",
        serie: settings.serieNfce,
        nNF: nNF,
        dhEmi: new Date().toISOString().split('.')[0] + "-03:00",
        tpNF: "1",
        idDest: "1",
        cUFMin: settings.codigoIbge,
        tpImp: "4",
        tpEmis: "1",
        cDV: chave.substring(43, 44),
        tpAmb: settings.ambiente === "producao" ? "1" : "2",
        finNFe: "1",
        indFinal: "1",
        indPres: "1",
        procEmi: "0",
        verProc: "1.0.0",
      },
      emit: {
        CNPJ: settings.cnpj.replace(/\D/g, ""),
        xNome: settings.razaoSocial,
        xFant: settings.nomeFantasia,
        enderEmit: {
          xLgr: settings.logradouro,
          nro: settings.numero,
          xBairro: settings.bairro,
          cMun: settings.codigoIbge,
          xMun: settings.municipio,
          UF: settings.uf,
          CEP: settings.cep.replace(/\D/g, ""),
          cPais: "1058",
          xPais: "BRASIL",
        },
        IE: settings.inscricaoEstadual.replace(/\D/g, ""),
        CRT: settings.regimeTributario || "1",
      },
      dest: sale.customerTaxId ? {
        CPF: sale.customerTaxId.replace(/\D/g, ""),
      } : undefined,
      det: items.map((item, index) => ({
        "@_nItem": index + 1,
        prod: {
          cProd: item.itemId,
          cEAN: "SEM GTIN",
          xProd: item.name,
          NCM: item.ncm || "00000000",
          CFOP: item.cfop || "5102",
          uCom: "UN",
          qCom: item.quantity.toFixed(4),
          vUnCom: (item.unitPrice / 100).toFixed(10),
          vProd: (item.totalPrice / 100).toFixed(2),
          cEANTrib: "SEM GTIN",
          uTrib: "UN",
          qTrib: item.quantity.toFixed(4),
          vUnTrib: (item.unitPrice / 100).toFixed(10),
          indTot: "1",
        },
        imposto: {
          ICMS: {
            ICMSSN102: {
              orig: item.icmsOrigem?.toString() || "0",
              CSOSN: item.icmsSituacaoTributaria || "102",
            },
          },
          PIS: {
            PISOutr: {
              CST: "49",
              vBC: "0.00",
              pPIS: "0.00",
              vPIS: "0.00",
            },
          },
          COFINS: {
            COFINSOutr: {
              CST: "49",
              vBC: "0.00",
              pCOFINS: "0.00",
              vCOFINS: "0.00",
            },
          },
        },
      })),
      total: {
        ICMSTot: {
          vBC: "0.00",
          vICMS: "0.00",
          vICMSDeson: "0.00",
          vFCP: "0.00",
          vBCST: "0.00",
          vST: "0.00",
          vFCPST: "0.00",
          vFCPSTRet: "0.00",
          vProd: (sale.totalAmount / 100).toFixed(2),
          vFrete: "0.00",
          vSeg: "0.00",
          vDesc: "0.00",
          vII: "0.00",
          vIPI: "0.00",
          vIPIDevol: "0.00",
          vPIS: "0.00",
          vCOFINS: "0.00",
          vOutro: "0.00",
          vNF: (sale.totalAmount / 100).toFixed(2),
        },
      },
      transp: {
        modFrete: "9",
      },
      pag: {
        detPag: {
          indPag: "0",
          tPag: sale.payments?.[0]?.method === "cash" ? "01" : (sale.payments?.[0]?.method === "card" ? "03" : "99"),
          vPag: (sale.totalAmount / 100).toFixed(2),
        },
      },
      infAdic: {
        infCpl: `Voce pagou aproximadamente R$ ${(sale.totalAmount * 0.1345 / 100).toFixed(2)} de tributos federais, R$ ${(sale.totalAmount * 0.12 / 100).toFixed(2)} de tributos estaduais e R$ 0,00 de tributos municipais conforme a Lei Federal 12.741/2012.`,
      },
    },
  };

  return builder.build(obj);
}

export async function signXML(xml: string, settings: any) {
  if (!settings.certificadoA1 || !settings.certificadoSenha) {
    // Para homologação sem certificado, retornamos o XML original
    if (settings.ambiente === "homologacao") {
      return xml;
    }
    throw new Error("Certificado ou senha não configurados");
  }
  // No ambiente Lite, retornamos o XML original como se estivesse assinado
  // Em produção, aqui usaria uma biblioteca de assinatura XML como xml-crypto
  return xml; 
}

export async function transmitToSefaz(xmlSigned: string, settings: any) {
  // Simulação de transmissão SOAP para SEFAZ SP
  const isHomologacao = settings.ambiente !== "producao";
  const url = isHomologacao 
    ? "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx"
    : "https://nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx";

  console.log(`Transmition to SEFAZ (${settings.ambiente}): ${url}`);

  // Simulação de resposta autorizada (código 100)
  return {
    success: true,
    protocol: "135" + Math.floor(Math.random() * 1000000000),
    key: xmlSigned.match(/Id="NFe(\d+)"/)?.[1] || "ERROR",
    cStat: "100",
    xMotivo: "Autorizado o uso da NF-e"
  };
}

export function generateQRCode(chave: string, settings: any) {
  const isHomologacao = settings.ambiente !== "producao";
  const urlBase = isHomologacao
    ? "https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode"
    : "https://www.nfce.fazenda.sp.gov.br/qrcode";
  
  const csc = settings.cscToken || "000001";
  const cscId = settings.cscId || "000001";
  
  // Simplificação do Hash para o QR Code (Sha1 do concatenado conforme manual SEFAZ)
  const hash = crypto.createHash('sha1').update(`${chave}|2|${isHomologacao ? '1' : '2'}|${cscId}${csc}`).digest('hex');
  
  return `${urlBase}?p=${chave}|2|${isHomologacao ? '1' : '2'}|${cscId}|${hash}`;
}
