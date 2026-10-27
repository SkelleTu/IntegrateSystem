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
- [x] Testes de integração SQLite isolados por execução no GitHub Actions (arquivo temporário em `/tmp`), cobrindo abertura/sangria/fechamento concorrentes, reposição e histórico de estoque, cadastro/atualização de inventário via storage, venda em dinheiro, baixa/estorno de estoque, cancelamento e idempotência (`scripts/test-cash-register-flow.ts`; execução 30: sucesso).
- [x] Verificação estática de paridade do esquema SQLite/Turso (script `verify-db-schema.mjs`, execução 52: sucesso). Pendentes testes de execução contra ambos os bancos.
- [x] Revisar cancelamento de venda: vendas canceladas deixam de compor o saldo em dinheiro, o estoque é estornado e o financeiro recebe estorno; teste de idempotência confirma que cancelar duas vezes não duplica o estorno.
- [x] Abertura única por operador reforçada por índice único parcial em SQLite e Turso; a inicialização falha de forma explícita se detectar caixas abertos duplicados para reconciliação.
- [x] Fechamento concorrente protegido por atualização condicional; operações críticas de caixa/venda/cancelamento são serializadas no processo e executadas em transação por banco. Testes concorrentes confirmam exatamente uma abertura, uma sangria permitida e um fechamento bem-sucedidos.
- [x] Cancelamento de venda limitado ao próprio operador ou administrador.
- [ ] Legado SQLite+Turso em espelhamento simultâneo segue sem teste de transação distribuída/recuperação de divergência. O novo modo Neon seleciona PostgreSQL como fonte única de verdade e desativa o espelhamento para o SQLite efêmero; não habilitar o modo misto sem testes próprios.

## Neon PostgreSQL — validação de caixa e estoque

- [x] Criar projeto isolado `IntegrateSystem` no Neon (PostgreSQL 17, região `aws-sa-east-1`), sem alterar os projetos UPcar/Invista PRO.
- [x] Preparar as 27 tabelas e aplicar 30 migrações aditivas no banco isolado.
- [x] Executar smoke test SQL no PostgreSQL para abertura única, movimentos de caixa, reposição, sangria, ajuste, entrada de estoque, histórico, produto/lote/log, venda em dinheiro, baixa, cancelamento, restauração do estoque, estorno idempotente e fechamento.
- [x] Confirmar limpeza dos registros de teste: zero registros remanescentes nas tabelas verificadas de caixa, estoque e produtos.
- [x] Adicionar seleção de runtime por `DATABASE_URL`, conexão com `pg`/Drizzle Node Postgres e Neon como fonte única de escrita, sem espelhamento para SQLite efêmero nesse modo.
- [x] Adicionar bootstrap idempotente das tabelas/migrações PostgreSQL e índice único parcial para impedir mais de um caixa aberto por operador.
- [x] Adaptar compatibilidade de IDs gerados nas operações Drizzle legadas e caminhos de produto/snapshot que dependiam diretamente do SQLite local.
- [x] Modelar `stock_snapshots` no schema compartilhado.
- [x] Criar `scripts/test-cash-register-postgres.ts` para testar a camada real `DatabaseStorage` contra PostgreSQL, incluindo concorrência, caixa, venda, estoque e cancelamento.
- [x] Adicionar execução condicional desse teste ao GitHub Actions via segredo `NEON_DATABASE_URL`.
- [x] GitHub Actions, execução 30 (caixa) e execução 85 (observabilidade): TypeScript, build de produção, paridade estática do esquema e testes SQLite aprovados.
- [ ] Executar o teste de runtime contra Neon. A execução CI foi pulada porque o segredo `NEON_DATABASE_URL` não está configurado no repositório; o smoke test SQL direto no Neon não substitui o teste do driver da aplicação.
- [ ] Testar a interface via Kernel. O preview Vercel redireciona para a tela de login antes de carregar o app, então nenhuma operação real de interface foi reportada como concluída.
- [ ] Configurar `DATABASE_URL` no ambiente de deploy que deve usar Neon e confirmar health check/consultas após a conexão. Não foi feito deploy de produção.
- [ ] Fechar o checklist operacional apenas após os testes PostgreSQL de runtime e os fluxos completos de interface serem aprovados.

