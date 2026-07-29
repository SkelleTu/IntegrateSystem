import { XMLBuilder, XMLParser } from "fast-xml-parser";
import crypto from "crypto";
import https from "https";

// ─── Chave de Acesso (44 dígitos com DV Módulo 11) ────────────────────────────
export function generateChaveAcesso(settings: any, nNF: number) {
  const cUF = settings.codigoIbge.substring(0, 2);
  const now = new Date();
  const AAMM =
    now.getFullYear().toString().substring(2) +
    (now.getMonth() + 1).toString().padStart(2, "0");
  const CNPJ = settings.cnpj.replace(/\D/g, "");
  const mod = "65";
  const serie = settings.serieNfce.toString().padStart(3, "0");
  const numero = nNF.toString().padStart(9, "0");
  const tpEmis = "1";
  const cNF = Math.floor(Math.random() * 90000000) + 10000000;

  const base = `${cUF}${AAMM}${CNPJ}${mod}${serie}${numero}${tpEmis}${cNF}`;

  let soma = 0;
  let peso = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += parseInt(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto === 0 || resto === 1 ? 0 : 11 - resto;

  return base + dv;
}

// ─── Geração do XML NF-e 4.00 ─────────────────────────────────────────────────
export function generateNFCeXML(
  sale: any,
  items: any[],
  settings: any,
  nNF: number,
  chave: string
) {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: false,
    suppressEmptyNode: true,
  });

  const infNFeObj = {
    infNFe: {
      "@_Id": `NFe${chave}`,
      "@_versao": "4.00",
      ide: {
        cUF: settings.codigoIbge.substring(0, 2),
        cNF: chave.substring(35, 43),
        natOp: "VENDA DE MERCADORIA",
        mod: "65",
        serie: settings.serieNfce,
        nNF,
        dhEmi: new Date().toISOString().split(".")[0] + "-03:00",
        tpNF: "1",
        idDest: "1",
        cMunFG: settings.codigoIbge,
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
          fone: settings.telefone || undefined,
        },
        IE: settings.inscricaoEstadual.replace(/\D/g, ""),
        CRT: settings.regimeTributario || "1",
      },
      ...(sale.customerTaxId
        ? {
            dest: {
              ...(sale.customerTaxId.replace(/\D/g, "").length === 11
                ? { CPF: sale.customerTaxId.replace(/\D/g, "") }
                : { CNPJ: sale.customerTaxId.replace(/\D/g, "") }),
              ...(sale.customerName ? { xNome: sale.customerName } : {}),
              indIEDest: "9",
            },
          }
        : {}),
      det: items.map((item, index) => ({
        "@_nItem": index + 1,
        prod: {
          cProd: String(item.itemId).padStart(6, "0"),
          cEAN: item.barcode || "SEM GTIN",
          xProd: item.name || item.xProd || "PRODUTO",
          NCM: item.ncm || "00000000",
          CFOP: item.cfop || "5102",
          uCom: item.unitType === "kg" ? "KG" : "UN",
          qCom: item.unitType === "kg"
            ? (item.quantity / 1000).toFixed(4)
            : item.quantity.toFixed(4),
          vUnCom: (item.unitPrice / 100).toFixed(10),
          vProd: (item.totalPrice / 100).toFixed(2),
          cEANTrib: item.barcode || "SEM GTIN",
          uTrib: item.unitType === "kg" ? "KG" : "UN",
          qTrib: item.unitType === "kg"
            ? (item.quantity / 1000).toFixed(4)
            : item.quantity.toFixed(4),
          vUnTrib: (item.unitPrice / 100).toFixed(10),
          indTot: "1",
        },
        imposto: {
          vTotTrib: "0.00",
          ICMS: {
            ICMSSN102: {
              orig: String(item.icmsOrigem ?? 0),
              CSOSN: item.icmsSituacaoTributaria || "400",
            },
          },
          PIS: {
            PISOutr: {
              CST: "99",
              vBC: "0.00",
              pPIS: "0.00",
              vPIS: "0.00",
            },
          },
          COFINS: {
            COFINSOutr: {
              CST: "99",
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
          vTotTrib: "0.00",
        },
      },
      transp: { modFrete: "9" },
      pag: {
        detPag: (sale.payments || []).map((p: any) => ({
          indPag: "0",
          tPag:
            p.method === "cash"
              ? "01"
              : p.method === "card"
              ? "03"
              : p.method === "pix"
              ? "17"
              : "99",
          vPag: (p.amount / 100).toFixed(2),
        })),
        vTroco: (() => {
          const paid = (sale.payments || []).reduce(
            (s: number, p: any) => s + p.amount,
            0
          );
          const troco = paid - sale.totalAmount;
          return troco > 0 ? (troco / 100).toFixed(2) : undefined;
        })(),
      },
      infAdic: {
        infCpl: [
          `Voce pagou aprox. R$ ${((sale.totalAmount * 0.1345) / 100).toFixed(2)} de trib. federais,`,
          `R$ ${((sale.totalAmount * 0.12) / 100).toFixed(2)} de trib. estaduais e R$ 0,00 de trib. municipais`,
          `conforme Lei Federal 12.741/2012.`,
        ].join(" "),
      },
    },
  };

  // Gera o XML do conteúdo interno
  const innerXml = builder.build(infNFeObj);

  // Envolve no elemento NFe com namespace obrigatório
  return `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe">${innerXml}</NFe>`;
}

// ─── Assinatura Digital Real (xml-crypto + node-forge) ────────────────────────
export async function signXML(xml: string, settings: any): Promise<string> {
  // Sem certificado em homologação → retorna sem assinar (modo dev/teste)
  if (!settings.certificadoA1 || !settings.certificadoSenha) {
    if (settings.ambiente === "homologacao") {
      console.warn("[FISCAL] Sem certificado A1 configurado — XML não assinado (homologação)");
      return xml;
    }
    throw new Error(
      "Certificado A1 e senha são obrigatórios para emissão em produção."
    );
  }

  try {
    // Importa dinamicamente para evitar carregar em ambientes sem certificado
    const forge = (await import("node-forge")).default;
    const { SignedXml } = await import("xml-crypto");

    // Decodifica PFX de base64
    const pfxDer = Buffer.from(settings.certificadoA1, "base64").toString("binary");
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const pfxObj = forge.pkcs12.pkcs12FromAsn1(
      pfxAsn1,
      false,
      settings.certificadoSenha
    );

    // Extrai chave privada
    const keyBags = pfxObj.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    });
    const keyBag =
      keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ||
      pfxObj.getBags({ bagType: forge.pki.oids.keyBag })?.[
        forge.pki.oids.keyBag
      ]?.[0];

    if (!keyBag?.key) throw new Error("Chave privada não encontrada no certificado PFX");
    const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);

    // Extrai certificado público
    const certBags = pfxObj.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    if (!certBag?.cert) throw new Error("Certificado público não encontrado no PFX");

    const certPem = forge.pki.certificateToPem(certBag.cert);
    // Certificado em base64 puro para KeyInfo
    const certDer = forge.asn1.toDer(
      forge.pki.certificateToAsn1(certBag.cert)
    ).getBytes();
    const certBase64 = forge.util.encode64(certDer);

    // Assina com RSA-SHA1 conforme SEFAZ
    const sig = new SignedXml({
      privateKey: privateKeyPem,
      publicCert: certPem,
      canonicalizationAlgorithm:
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      signatureAlgorithm:
        "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    });

    sig.addReference({
      xpath: "//*[local-name(.)='infNFe']",
      digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      ],
    });

    // KeyInfo com X509Certificate
    (sig as any).keyInfoProvider = {
      getKeyInfo: () =>
        `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`,
      getKey: () => Buffer.from(privateKeyPem),
    };

    sig.computeSignature(xml, {
      location: {
        reference: "//*[local-name(.)='infNFe']",
        action: "after",
      },
    });

    console.log("[FISCAL] XML assinado com certificado A1 ✓");
    return sig.getSignedXml();
  } catch (err: any) {
    console.error("[FISCAL] Erro na assinatura:", err.message);
    throw new Error(`Falha na assinatura digital: ${err.message}`);
  }
}

// ─── Endpoints SEFAZ por UF ───────────────────────────────────────────────────
const SEFAZ_ENDPOINTS: Record<string, { hom: string; prod: string }> = {
  SP: {
    hom: "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx",
    prod: "https://nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx",
  },
  MG: {
    hom: "https://hnfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4",
    prod: "https://nfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4",
  },
  RJ: {
    hom: "https://homologacao.nfe2.fazenda.rj.gov.br/nfce/NFeAutorizacao4",
    prod: "https://nfe2.fazenda.rj.gov.br/nfce/NFeAutorizacao4",
  },
  RS: {
    hom: "https://nfce-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    prod: "https://nfce.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
  },
  PR: {
    hom: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4",
    prod: "https://nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4",
  },
  SC: {
    hom: "https://homologacao.nfe.sef.sc.gov.br/ws/NFeAutorizacao4/NFeAutorizacao4.asmx",
    prod: "https://nfe.sef.sc.gov.br/ws/NFeAutorizacao4/NFeAutorizacao4.asmx",
  },
  BA: {
    hom: "https://hnfce.sefaz.ba.gov.br/ws/NFeAutorizacao4.asmx",
    prod: "https://nfce.sefaz.ba.gov.br/ws/NFeAutorizacao4.asmx",
  },
  GO: {
    hom: "https://homologacao.sefaz.go.gov.br/nfeweb/services/NFeAutorizacao4",
    prod: "https://nfe.sefaz.go.gov.br/nfeweb/services/NFeAutorizacao4",
  },
  MT: {
    hom: "https://homologacao.sefaz.mt.gov.br/nfcews/services/NFeAutorizacao4",
    prod: "https://nfce.sefaz.mt.gov.br/nfcews/services/NFeAutorizacao4",
  },
  MS: {
    hom: "https://homologacao.nfce.sefaz.ms.gov.br/ws/NFeAutorizacao4.asmx",
    prod: "https://nfce.sefaz.ms.gov.br/ws/NFeAutorizacao4.asmx",
  },
  ES: {
    hom: "https://homologacao.nfe.sefaz.es.gov.br/nfce/NFeAutorizacao4",
    prod: "https://nfe.sefaz.es.gov.br/nfce/NFeAutorizacao4",
  },
  CE: {
    hom: "https://nfce.sefaz.ce.gov.br/nfce/services/NFeAutorizacao4",
    prod: "https://nfce.sefaz.ce.gov.br/nfce/services/NFeAutorizacao4",
  },
  PE: {
    hom: "https://nfcehomolog.sefaz.pe.gov.br/nfce-service/services/NFeAutorizacao4",
    prod: "https://nfce.sefaz.pe.gov.br/nfce-service/services/NFeAutorizacao4",
  },
  // Estados que usam SVAN (Ambiente Nacional)
  AM: {
    hom: "https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
    prod: "https://nfe.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
  },
  PA: {
    hom: "https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
    prod: "https://nfe.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
  },
};

// Helper: faz requisição HTTPS com mTLS
function httpsPost(
  url: string,
  body: string,
  options: { key?: string; cert?: string; rejectUnauthorized?: boolean }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        "Content-Length": Buffer.byteLength(body, "utf8"),
        SOAPAction: "",
      },
      key: options.key,
      cert: options.cert,
      rejectUnauthorized: options.rejectUnauthorized ?? false,
      timeout: 30000,
    };

    const req = https.request(reqOptions, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout na conexão com SEFAZ (30s)"));
    });

    req.write(body, "utf8");
    req.end();
  });
}

// ─── Transmissão Real SEFAZ via SOAP com mTLS ─────────────────────────────────
export async function transmitToSefaz(
  xmlSigned: string,
  settings: any
): Promise<{
  success: boolean;
  protocol: string;
  key: string;
  cStat: string;
  xMotivo: string;
  simulado?: boolean;
}> {
  const isHomologacao = settings.ambiente !== "producao";
  const uf = settings.uf?.toUpperCase() || "SP";

  // Sem certificado → simula resposta (modo desenvolvimento)
  if (!settings.certificadoA1 || !settings.certificadoSenha) {
    console.warn("[FISCAL] Sem certificado — transmissão simulada");
    return {
      success: true,
      protocol: "SIM" + Math.floor(Math.random() * 1000000000),
      key: xmlSigned.match(/Id="NFe(\d+)"/)?.[1] || "",
      cStat: "100",
      xMotivo: "Simulado — sem certificado A1 configurado",
      simulado: true,
    };
  }

  const endpoints = SEFAZ_ENDPOINTS[uf] || SEFAZ_ENDPOINTS["SP"];
  const url = isHomologacao ? endpoints.hom : endpoints.prod;

  console.log(`[FISCAL] Transmitindo para SEFAZ-${uf} (${settings.ambiente}): ${url}`);

  try {
    const forge = (await import("node-forge")).default;

    // Extrai chave e cert do PFX para mTLS
    const pfxDer = Buffer.from(settings.certificadoA1, "base64").toString("binary");
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const pfxObj = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, settings.certificadoSenha);

    const keyBags = pfxObj.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    const certBags = pfxObj.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];

    const privateKeyPem = keyBag?.key ? forge.pki.privateKeyToPem(keyBag.key) : undefined;
    const certPem = certBag?.cert ? forge.pki.certificateToPem(certBag.cert) : undefined;

    // Monta envelope SOAP 1.2
    const cUF = settings.codigoIbge?.substring(0, 2) || "35";
    const idLote = Date.now().toString().substring(0, 15);

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <cUF>${cUF}</cUF>
      <versaoDados>4.00</versaoDados>
    </nfeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <enviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <idLote>${idLote}</idLote>
        <indSinc>1</indSinc>
        ${xmlSigned}
      </enviNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;

    const responseXml = await httpsPost(url, soapEnvelope, {
      key: privateKeyPem,
      cert: certPem,
      rejectUnauthorized: false,
    });

    console.log("[FISCAL] Resposta SEFAZ recebida");

    // Parse da resposta SOAP
    const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
    const parsed = parser.parse(responseXml);

    // Navega na estrutura SOAP até retConsReciNFe ou retEnviNFe
    const body =
      parsed?.Envelope?.Body ||
      parsed?.["soap12:Envelope"]?.["soap12:Body"] ||
      {};

    const retMsg =
      body?.nfeResultMsg?.retEnviNFe ||
      body?.retEnviNFe ||
      body?.nfeResultMsg?.retConsReciNFe ||
      {};

    const cStat =
      retMsg?.infRec?.cStat ||
      retMsg?.protNFe?.infProt?.cStat ||
      retMsg?.cStat ||
      "999";

    const xMotivo =
      retMsg?.infRec?.xMotivo ||
      retMsg?.protNFe?.infProt?.xMotivo ||
      retMsg?.xMotivo ||
      "Resposta não reconhecida";

    const protocol =
      retMsg?.protNFe?.infProt?.nProt ||
      retMsg?.infRec?.nRec ||
      "";

    const chaveFromResp =
      retMsg?.protNFe?.infProt?.chNFe ||
      xmlSigned.match(/Id="NFe(\d+)"/)?.[1] ||
      "";

    // cStat 100 = Autorizado, 150 = Autorizado fora do prazo
    const authorized = ["100", "150"].includes(String(cStat));

    if (!authorized) {
      console.error(`[FISCAL] SEFAZ rejeitou: ${cStat} - ${xMotivo}`);
    } else {
      console.log(`[FISCAL] ✅ Autorizado pelo SEFAZ: ${cStat} - ${xMotivo}`);
    }

    return {
      success: authorized,
      protocol: String(protocol),
      key: chaveFromResp,
      cStat: String(cStat),
      xMotivo,
    };
  } catch (err: any) {
    console.error("[FISCAL] Erro na transmissão:", err.message);
    throw new Error(`Falha na comunicação com SEFAZ: ${err.message}`);
  }
}

// ─── QR Code URL (SHA1 conforme manual SEFAZ) ────────────────────────────────
export function generateQRCode(chave: string, settings: any): string {
  const isHomologacao = settings.ambiente !== "producao";
  const uf = settings.uf?.toUpperCase() || "SP";

  // URL base por UF
  const urlBases: Record<string, { hom: string; prod: string }> = {
    SP: {
      hom: "https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode",
      prod: "https://www.nfce.fazenda.sp.gov.br/qrcode",
    },
    MG: {
      hom: "https://hnfce.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml",
      prod: "https://nfce.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml",
    },
    RJ: {
      hom: "https://www.homologacao.nfe.fazenda.rj.gov.br/consulta/qr",
      prod: "https://www.nfe.fazenda.rj.gov.br/consulta/qr",
    },
    RS: {
      hom: "https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx",
      prod: "https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx",
    },
    PR: {
      hom: "https://www.homologacao.nfce.sefa.pr.gov.br/nfce/qrcode",
      prod: "https://www.nfce.sefa.pr.gov.br/nfce/qrcode",
    },
  };

  const urls = urlBases[uf] || urlBases["SP"];
  const urlBase = isHomologacao ? urls.hom : urls.prod;

  const csc = settings.cscToken || "";
  const cscId = settings.cscId ? settings.cscId.toString().padStart(6, "0") : "000001";
  const tpAmb = isHomologacao ? "2" : "1";

  // Hash = SHA1(chave|2|tpAmb|cscId + csc)
  const hashInput = `${chave}|2|${tpAmb}|${cscId}${csc}`;
  const hash = crypto.createHash("sha1").update(hashInput).digest("hex");

  return `${urlBase}?p=${chave}|2|${tpAmb}|${cscId}|${hash}`;
}
