# Módulo Fiscal NFC-e (Modo Lite)

Implementação parcial do fluxo de emissão de NFC-e para o estado de São Paulo, seguindo os requisitos de padaria no Simples Nacional.

## Progresso Atual

- [x] Geração de Chave de Acesso (44 dígitos com DV)
- [x] Estrutura Fiscal Interna (mapeamento de venda para objeto fiscal)
- [x] Geração de XML (NFC-e 4.00)
- [x] Assinatura Digital (Stub para modo Lite)
- [x] Transmissão SEFAZ (Simulação SOAP)
- [x] Tratamento de Resposta (Autorização simulada)
- [x] Impressão Térmica via WebUSB (ESC/POS) - Permite comunicação direta com impressoras USB pelo navegador.
- [x] Automação de Emissão: Ao preencher CPF/CNPJ no terminal, a NFC-e é emitida e enviada para a impressora automaticamente.
- [x] Layout de Impressão Base: Cabeçalho, Chave de Acesso e Link do QR Code.

## Próximos Passos (Etapa por Etapa)

1. **Implementar Contingência Offline**: Detectar falhas de rede e marcar `tpEmis = 9`.
2. **DANFE (Impressão)**: Gerar PDF/HTML para impressão térmica (58mm/80mm) incluindo o QR Code.
3. **Integração Real de Assinatura**: Adicionar `node-forge` ou similar para assinar o XML com o certificado A1 (.pfx).
4. **Comunicação SOAP Real**: Implementar os envelopes SOAP para os WebServices de SP usando `axios` ou `fetch`.

## Arquivos Relacionados
- `server/fiscal/nfce.ts`: Lógica principal de geração e transmissão.
- `server/routes.ts`: Rota `/api/fiscal/emitir/:saleId` que orquestra o processo.
- `shared/schema.ts`: Tabelas `fiscal_settings` e `nfce`.
