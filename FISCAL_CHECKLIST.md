# Integração Fiscal SEFAZ (NFC-e/NF-e) - Checklist de Implementação

## Fase 1: Configurações e Infraestrutura Básica [ ]
- [x] Criar schema de banco de dados para configurações fiscais (`fiscal_settings`).
- [x] Criar campos fiscais na tabela de vendas (`fiscal_status`, `fiscal_key`, etc).
- [x] Criar interface de usuário para configuração fiscal (Certificado A1, CSC, CNPJ, etc).
- [x] Implementar interface para upload de Certificado Digital (A1).
- [x] Criar rota no backend para salvar/carregar configurações fiscais.

## Fase 2: Geração e Assinatura de XML [ ]
- [x] Mapear campos de produtos para tributação (NCM, CEST, CFOP, ICMS).
- [x] Implementar estrutura básica para geração de XML.
- [ ] Implementar assinatura digital do XML usando o certificado A1.
- [ ] Validar XML contra os schemas (XSD) da SEFAZ.

## Fase 3: Comunicação com SEFAZ [ ]
- [ ] Implementar WebServices de consulta de status de serviço.
- [ ] Implementar envio de lote de NFC-e (Síncrono/Assíncrono).
- [ ] Tratar retornos de autorização, rejeição e denegação.
- [ ] Implementar consulta de protocolo de autorização.

## Fase 4: Contingência e Impressão [ ]
- [ ] Implementar modo de contingência offline (EPEC/FS-DA).
- [ ] Gerar DANFE (Documento Auxiliar da Nota Fiscal Eletrônica) em PDF/HTML.
- [ ] Gerar QR Code para consulta da NFC-e.
- [ ] Implementar envio de XML/DANFE por e-mail para o cliente.

## Fase 5: Eventos Fiscais [ ]
- [ ] Implementar cancelamento de nota fiscal dentro do prazo legal.
- [ ] Implementar Carta de Correção Eletrônica (CC-e) - apenas para NF-e.
- [ ] Relatório de notas emitidas para contabilidade.


## Caixa — implementação em branch de correção
- [x] Adicionar tabela de movimentos auditáveis para abertura, reposição, sangria, ajuste e fechamento.
- [x] Calcular saldo esperado no servidor em centavos: abertura + dinheiro recebido + reposições − sangrias + ajustes.
- [x] Registrar abertura/fechamento no livro de caixa, sem lançar abertura como receita financeira.
- [x] Exigir motivo nos ajustes e nas movimentações; validar valores e sangria contra saldo disponível.
- [x] Disponibilizar API de resumo e movimentações e usá-la no fechamento da interface.
- [x] Adicionar controles de reposição e sangria ao PDV.
- [x] Build TypeScript e build de produção na branch (GitHub Actions, execução 52: sucesso).
- [ ] Testes de integração para abertura, venda em dinheiro, sangria, reposição, ajuste e fechamento.
- [x] Verificação estática de paridade do esquema SQLite/Turso (script `verify-db-schema.mjs`, execução 52: sucesso). Pendentes testes de execução contra ambos os bancos.
- [ ] Revisar cancelamento de venda e seus efeitos sobre caixa/estoque/financeiro.
- [ ] Revisar fechamento concorrente e atomicidade entre os bancos (bloqueador identificado: `multiWrite` executa operações independentes em paralelo e não garante transação distribuída/rollback entre SQLite e Turso).
