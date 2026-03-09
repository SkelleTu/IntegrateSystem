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
- [x] **NOVO (09/03/2026)**: Extração automática de peso do código de barras para produtos em kg

#### Como Funciona
1. Operador lê etiqueta da balança no leitor de código de barras
2. Sistema detecta prefixo "20" ou "21" (produto pesável)
3. Extrai código PLU (4 dígitos) e peso (5 dígitos em gramas)
4. Para produtos com unit="kg", busca o produto pelo `barcode` ou por match automático
5. **Extrai peso automaticamente do código de barras** em vez de pedir ao operador
6. Adiciona automaticamente ao carrinho com peso extraído do barcode
7. Se o barcode não tiver peso codificado, mostra modal para entrada manual

#### Mudança Recente (09/03/2026)
**Problema 1**: Ao escanear código de barras de produto pesável (ex: Catarina Banana), o sistema pedia o peso manualmente.
**Solução 1**: Agora o sistema tenta extrair o peso automaticamente do barcode antes de abrir o modal. Se o barcode estiver no formato Urano POP-S (20PPPPVVVVVC), o peso é extraído e o produto é adicionado ao carrinho sem confirmação do operador.

**Problema 2**: Ao escanear uma segunda etiqueta da mesma Catarina (com peso/validade diferentes), o sistema não encontrava o produto porque buscava pelo barcode exato, não pelo PLU code.
**Solução 2**: 
- Agora o sistema busca produtos pelo `codigoBalanca` (PLU code extraído do barcode)
- Cada etiqueta de balança com peso diferente terá um barcode diferente, mas o PLU code (dígitos 2-6) será o mesmo
- Adicionado `extractPLUFromBarcode()` que extrai automaticamente o PLU code quando um barcode é inserido
- Campo `codigoBalanca` agora é auto-preenchido quando você insere um barcode de balança Urano (20/21 + 11 dígitos)
- Catarina Banana atualizada com codigoBalanca = "3780"

#### Arquivos Relacionados
- `shared/barcodeParser.ts`: Parser e validador de códigos de barras de balança
- `shared/schema.ts`: Campo `codigoBalanca` na tabela `inventory`
- `client/src/pages/Cashier.tsx`: Integração do scanner no caixa
- `server/storage.ts`: Métodos de busca por `codigoBalanca`

## Inventário de Produtos

### Produtos Atuais (Sincronizados - 09/03/2026)
- **ID 15**: Pão Francês - R$ 10.00
- **ID 16**: Coca Cola 2L - R$ 12.00

**Nota**: Banco completamente limpo em 09/03/2026. Removidos 12 produtos duplicados de testes anteriores (cortes de cabelo, pães artesanais, bebidas quentes, doces). Agora apenas estes 2 produtos existem na plataforma e devem aparecer no caixa.

**Sincronização**: Banco local (SQLite) e remoto (Turso) sincronizados.

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
