/**
 * Utilitário para impressão térmica via WebUSB (ESC/POS)
 * Permite que a aplicação web se comunique diretamente com impressoras USB.
 */

export async function printNFCe(nfceData: any, settings: any) {
  try {
    // 1. Solicitar acesso ao dispositivo USB
    // Filtros comuns para impressoras térmicas (Vendor IDs variados)
    const device = await navigator.usb.requestDevice({
      filters: [] 
    });

    console.log("Dispositivo selecionado:", device.productName);
    await device.open();
    
    // Forçar seleção de configuração se necessário
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    
    // Tentar dar claim na interface (geralmente 0)
    try {
      await device.claimInterface(0);
    } catch (e) {
      console.warn("Interface 0 já ocupada ou indisponível, tentando continuar...");
    }

    const encoder = new TextEncoder();
    
    // Comandos ESC/POS Básicos
    const INIT = new Uint8Array([0x1b, 0x40]);
    const CENTER = new Uint8Array([0x1b, 0x61, 0x01]);
    const LEFT = new Uint8Array([0x1b, 0x61, 0x00]);
    const BOLD_ON = new Uint8Array([0x1b, 0x45, 0x01]);
    const BOLD_OFF = new Uint8Array([0x1b, 0x45, 0x00]);
    const CUT = new Uint8Array([0x1d, 0x56, 0x01]);

    let lines: string[] = [];
    if (nfceData.status === "simulated" || nfceData.protocolo?.startsWith("SIM")) {
      lines.push("--------------------------------");
      lines.push("      MODO SIMULACAO REAL       ");
      lines.push("   SEM VALOR FISCAL (TESTE)     ");
      lines.push("--------------------------------");
    }

    let data = new Uint8Array([
      ...INIT,
      ...CENTER,
      ...BOLD_ON,
      ...encoder.encode(lines.join("\n") + (lines.length > 0 ? "\n" : "")),
      ...encoder.encode(settings.razaoSocial + "\n"),
      ...BOLD_OFF,
      ...encoder.encode("CNPJ: " + settings.cnpj + "\n"),
      ...encoder.encode(settings.logradouro + ", " + settings.numero + "\n"),
      ...encoder.encode("--------------------------------\n"),
      ...encoder.encode("DANFE NFC-e - Venda Consumidor\n"),
      ...encoder.encode("--------------------------------\n"),
      ...LEFT,
    ]);

    // Adicionar itens (Simplificado)
    const itemsText = `Num: ${nfceData.numero} Serie: ${nfceData.serie}\n` +
                      `Emissao: ${new Date(nfceData.dataEmissao).toLocaleString()}\n` +
                      `Chave: ${nfceData.chaveAcesso}\n`;
    
    data = new Uint8Array([...data, ...encoder.encode(itemsText)]);
    
    // QR Code (Depende da impressora suportar o comando nativo ou imprimir como imagem)
    // Aqui enviamos apenas o texto da URL por enquanto como fallback
    data = new Uint8Array([
      ...data,
      ...CENTER,
      ...encoder.encode("\nConsulte via QR Code:\n"),
      ...encoder.encode(nfceData.qrCode || "URL nao disponivel"),
      ...encoder.encode("\n\n"),
      ...CUT
    ]);

    // Enviar para o endpoint de saída da impressora (geralmente endpoint 1 ou 2)
    const endpoint = device.configuration?.interfaces[0].alternates[0].endpoints.find(e => e.direction === 'out');
    
    if (endpoint) {
      await device.transferOut(endpoint.endpointNumber, data);
    }

    await device.close();
    return { success: true };
  } catch (error) {
    console.error("Erro na impressão USB:", error);
    throw error;
  }
}
