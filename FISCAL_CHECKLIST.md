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
- [x] Build TypeScript e build de produção na branch (GitHub Actions, execução 3 de Cash Register Forensic Validation: sucesso).
- [x] Testes de integração SQLite isolados por execução no GitHub Actions (arquivo temporário em `/tmp`, sem reutilizar `sqlite.db` do repositório), cobrindo abertura concorrente, sangria concorrente, venda em dinheiro, reposição, ajuste, baixa/estorno de estoque, cancelamento, idempotência e fechamento concorrente (`scripts/test-cash-register-flow.ts`; execução 16: sucesso).
- [x] Verificação estática de paridade do esquema SQLite/Turso (script `verify-db-schema.mjs`, execução 52: sucesso). Pendentes testes de execução contra ambos os bancos.
- [x] Revisar cancelamento de venda: vendas canceladas deixam de compor o saldo em dinheiro, o estoque é estornado e o financeiro recebe estorno; teste de idempotência confirma que cancelar duas vezes não duplica o estorno.
- [x] Abertura única por operador reforçada por índice único parcial em SQLite e Turso; a inicialização falha de forma explícita se detectar caixas abertos duplicados para reconciliação.
- [x] Fechamento concorrente protegido por atualização condicional; operações críticas de caixa/venda/cancelamento são serializadas no processo e executadas em transação por banco. Testes concorrentes confirmam exatamente uma abertura, uma sangria permitida e um fechamento bem-sucedidos.
- [x] Cancelamento de venda limitado ao próprio operador ou administrador.
- [ ] Validar a execução com SQLite e Turso ativos simultaneamente e implementar/validar recuperação de divergência entre bancos. Limitação arquitetural remanescente: não existe transação distribuída com rollback atômico entre SQLite e Turso; o teste automatizado se recusa a executar contra uma conexão Turso configurada para evitar tocar em dados reais.

## Neon PostgreSQL — validação de caixa e estoque

- [x] Criar projeto isolado `IntegrateSystem` no Neon (PostgreSQL 17, região `aws-sa-east-1`, São Paulo), sem conectar nem modificar os projetos existentes UPcar/Invista PRO.
- [x] Criar 27 tabelas e aplicar 30 migrações de colunas derivadas do DDL atual para preparar o ambiente de teste Neon.
- [x] Executar smoke test SQL em PostgreSQL cobrindo abertura única, livro de movimentos, reposição/sangria/ajuste, saldo esperado, entrada de estoque, histórico de reposição, produto/lote/log de lote, venda em dinheiro, baixa de estoque, cancelamento, estorno financeiro idempotente e fechamento único.
- [x] Confirmar após o teste que não restaram registros de teste nas tabelas de caixa, estoque ou produtos.
- [x] Salvar o teste reproduzível em `scripts/test-neon-cash-register.sql`.
- [ ] Integrar a aplicação ao Neon em runtime. O servidor atual ainda instancia Drizzle com `drizzle-orm/sql-js` e o esquema compartilhado usa `drizzle-orm/sqlite-core`; portanto, a criação das tabelas e o smoke test SQL **não significam que a aplicação já usa PostgreSQL**. É necessário adaptar o esquema/driver e os caminhos SQLite específicos, preservando os testes SQLite até a migração ser validada.
- [ ] Executar testes de integração da camada `DatabaseStorage` diretamente contra Neon, incluindo concorrência real e rollback transacional, depois da adaptação do driver.
- [ ] Executar teste operacional de interface com Kernel para abertura/fechamento de caixa, reposição/sangria/ajuste, venda, baixa e estorno de estoque. O preview Vercel atual redireciona para a tela de login da Vercel antes de carregar a aplicação; a validação visual permanece bloqueada por essa proteção de acesso.
- [ ] Só considerar a validação completa quando os testes de runtime PostgreSQL, o teste operacional no navegador e os workflows de CI estiverem aprovados.

