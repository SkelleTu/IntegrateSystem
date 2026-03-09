# Aura System - Plataforma POS/PDV/Estoque

Sistema de Ponto de Venda (PDV), Gestão de Estoque e Serviços para Padarias e Barbearias com integração fiscal NFC-e.

## Recursos Implementados

### Módulo Fiscal NFC-e (Modo Lite)
- [x] Geração de Chave de Acesso (44 dígitos com DV)
- [x] Estrutura Fiscal Interna (mapeamento de venda para objeto fiscal)
- [x] Geração de XML (NFC-e 4.00)
- [x] Assinatura Digital (Stub para modo Lite)
- [x] Transmissão SEFAZ (Simulação SOAP)
- [x] Tratamento de Resposta (Autorização simulada)
- [x] Emissão Universal: Toda venda finalizada no terminal agora gera uma NFC-e automaticamente, com ou sem CPF do consumidor.
- [x] Impressão Térmica via WebUSB (ESC/POS) - Permite comunicação direta com impressoras USB pelo navegador.
- [x] Automação de Emissão: Ao preencher CPF/CNPJ no terminal, a NFC-e é emitida e enviada para a impressora automaticamente.
- [x] Layout de Impressão Base: Cabeçalho, Chave de Acesso e Link do QR Code.

### Leitura de Código de Barras de Balança Urano POP-S
- [x] Parser de EAN-13 para etiquetas de balança (formato 20PPPPVVVVVC)
- [x] Extração automática de PLU (Preço Look Up / Código do Produto)
- [x] Conversão automática de peso (gramas para kg)
- [x] Validação de dígito verificador (EAN-13)
- [x] Integração com carrinho do caixa
- [x] Campo `codigoBalanca` no banco de dados para produtos pesáveis
- [x] Lógica de cálculo de preço: peso × preço por kg

#### Como Funciona
1. Operador lê etiqueta da balança no leitor de código de barras
2. Sistema detecta prefixo "20" ou "21" (produto pesável)
3. Extrai código PLU (4 dígitos) e peso (5 dígitos em gramas)
4. Busca produto pelo `codigoBalanca`
5. Calcula preço: peso_kg × preço_por_kg
6. Adiciona automaticamente ao carrinho com peso correto

#### Arquivos Relacionados
- `shared/barcodeParser.ts`: Parser e validador de códigos de barras de balança
- `shared/schema.ts`: Campo `codigoBalanca` na tabela `inventory`
- `client/src/pages/Cashier.tsx`: Integração do scanner no caixa
- `server/storage.ts`: Métodos de busca por `codigoBalanca`

## Próximos Passos (Etapa por Etapa)

1. **Implementar Contingência Offline**: Detectar falhas de rede e marcar `tpEmis = 9`.
2. **DANFE (Impressão)**: Gerar PDF/HTML para impressão térmica (58mm/80mm) incluindo o QR Code.
3. **Integração Real de Assinatura**: Adicionar `node-forge` ou similar para assinar o XML com o certificado A1 (.pfx).
4. **Comunicação SOAP Real**: Implementar os envelopes SOAP para os WebServices de SP usando `axios` ou `fetch`.

## Arquivos Principais
- `server/fiscal/nfce.ts`: Lógica principal de geração e transmissão NFC-e.
- `server/routes.ts`: Rotas da API (PDV, estoque, fiscal, etc).
- `shared/schema.ts`: Definição de todas as tabelas do banco de dados.
- `client/src/pages/Cashier.tsx`: Interface do caixa/PDV com suporte a código de barras.
- `shared/barcodeParser.ts`: Parser para código de barras de balança Urano POP-S.
