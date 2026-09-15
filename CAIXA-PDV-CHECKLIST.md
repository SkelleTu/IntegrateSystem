# Aura System — Checklist de estabilização PDV/Caixa

## Sessão 1 — Base e fonte única
- [x] Estado canônico do Caixa em `/api/cash-control/status`
- [x] Abertura/fechamento administrativos com fonte de verdade no servidor
- [x] Proteção contra abertura duplicada e fechamento repetido
- [x] Sincronização do estado do Caixa com a leitura legada do PDV
- [x] Ponto de restauração: `98c1ab91809aa19015d5edf7fd82fb640dd2cfa3`

## Sessão 2 — Ciclo operacional do Caixa
- [x] Abertura do Caixa reconhecida instantaneamente pelo PDV
- [x] Interface de controle unificada em modal centralizado
- [x] Removidas as interfaces duplicadas de Opções do Caixa no `App`
- [x] Abertura automática centralizada quando não existe Caixa aberto
- [x] Fechamento disponibilizado pelo mesmo controlador do Caixa
- [x] Sangria e suprimento centralizados no mesmo controlador
- [x] Revisões pendentes listadas e acessíveis em detalhe
- [x] Ponto de restauração: `6c431e712202b89e9f1e2499a8f07699818ff962` + `98c1ab91809aa19015d5edf7fd82fb640dd2cfa3`

## Sessão 3 — Persistência e continuidade do PDV
- [x] Após uma venda, invalidação das consultas de vendas
- [x] Após uma venda, invalidação das consultas de estoque
- [x] Após uma venda, invalidação das consultas financeiras
- [x] Atualização do estado do Caixa após venda
- [x] Atualização do catálogo/itens do PDV após alterações de estoque
- [x] O estado do Caixa permanece disponível após sair/reentrar no PDV, conforme homologação funcional atual
- [x] Ponto de restauração: `40cb34307407b72e5f311bf1dff7e6cdf434951f`

## Sessão 4 — Vendas e cadeia operacional
- [x] Venda utiliza `/api/sales` como operação de backend
- [x] Venda grava itens, pagamentos e lançamento financeiro no servidor
- [x] Baixa de estoque ocorre no backend durante a venda
- [x] Cancelamento de venda possui estorno de estoque/financeiro no backend
- [x] O cliente passa a refletir essas gravações por invalidação de cache
- [x] Ponto de restauração: `40cb34307407b72e5f311bf1dff7e6cdf434951f`

## Sessão 5 — Validação funcional anterior
- [x] Abertura após reiniciar/reentrar no PDV
- [x] Estoque 35 → venda de 3 → 32 após sair e entrar novamente
- [x] Venda aparecendo em Financeiro, conforme teste funcional informado
- [x] Venda aparecendo em Relatórios, conforme teste funcional informado
- [x] Ausência de interfaces duplicadas, conforme estado atual do `App`
- [ ] Fechamento com valor esperado correto
- [ ] Sangria sem permitir saldo negativo
- [ ] Suprimento refletindo no Caixa
- [ ] Revisão automática detalhada e conclusão
- [ ] Ponto de restauração final após homologação completa

## Sessão 6 — Relatórios completos de Caixa
- [x] Endpoint dedicado `/api/cash-control/reports/history`
- [x] Relatório recebe abertura e fechamento com data e hora
- [x] Relatório recebe todas as movimentações do caixa
- [x] Sangrias aparecem com valor, data/hora e observação/motivo
- [x] Suprimentos aparecem com valor, data/hora e observação/motivo
- [x] Ajustes aparecem com valor e data/hora
- [x] Vendas vinculadas ao caixa aparecem com data/hora, itens, pagamentos, status e total
- [x] Resumo separa dinheiro, cartão, PIX, suprimentos, sangrias e ajustes
- [x] Detalhamento expansível por caixa
- [x] Impressão do relatório completo por caixa
- [x] Pagamentos em cartão distinguem crédito e débito nos registros e relatórios
- [x] Detalhes da venda incluem dados fiscais disponíveis do item: nome, código, NCM, CFOP, unidade, quantidade, valor unitário e total
- [ ] Homologar visualmente o relatório completo em produção
- [ ] Homologar impressão do relatório em produção
- [ ] Homologar visualização fiscal completa dos itens no detalhe de uma venda real
- [x] Ponto de restauração desta sessão: `8db1e25bd221dc1368f177750b380eb1fdf0a1cd`

## Sessão 7 — Fechamento e revisão administrativa
- [x] Fechamento registra `closedAt` com data/hora no servidor
- [x] Revisão administrativa registra `reviewedAt`
- [x] Fechamento/revisão preservam observação administrativa
- [x] Revisão consegue calcular dinheiro, cartão, PIX, suprimentos, sangrias e ajustes
- [x] Relatório consegue exibir a linha do tempo completa do caixa
- [x] Abertura e fechamento administrativos possuem integração com setores financeiros/relatórios
- [ ] Homologar fechamento normal com diferença zero
- [ ] Homologar fechamento com diferença positiva
- [ ] Homologar fechamento com diferença negativa
- [ ] Homologar revisão pendente até resolução completa

## Sessão 8 — Persistência de dados e continuidade global da plataforma
- [x] Diagnóstico `/api/system/persistence-health` criado
- [x] Diagnóstico informa se Turso está habilitado
- [x] Diagnóstico informa quantidade de registros nas tabelas críticas
- [x] Diagnóstico informa estado do arquivo SQLite local
- [x] Produção passa a exigir `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- [x] Sem armazenamento remoto configurado, a aplicação falha explicitamente em produção em vez de operar silenciosamente sobre `/tmp`
- [x] PDV invalida leituras derivadas após vendas, estoque e operações administrativas
- [x] Operações do Caixa invalidam estado de PDV, Financeiro e Relatórios
- [x] Banco operacional local foi retirado do repositório Git
- [x] `sqlite.db` e `sessions.db` deixaram de ser fontes de runtime/versionadas
- [x] SQLite local operacional passa a usar diretório persistente do sistema operacional, fora do repositório
- [x] O runtime não usa mais `process.cwd()/sqlite.db` como banco operacional
- [x] O runtime não importa automaticamente um banco legado/checkpoint vindo do Git
- [x] Migração do banco legado, quando necessária, é exclusivamente explícita via `AURA_MIGRATE_LEGACY_SQLITE=1`
- [x] Git passa a conter código/schema, não o estado operacional atual do estabelecimento
- [x] A regra de precedência fica explícita: dados persistidos em runtime/remoto são autoridade; commits não substituem estado operacional
- [ ] Executar `/api/system/persistence-health` em produção
- [ ] Confirmar `remoteEnabled: true`
- [ ] Fazer venda e verificar incremento nas tabelas críticas
- [ ] Alterar estoque/produto/lote e verificar persistência no banco
- [ ] Alterar configurações e verificar persistência no banco
- [ ] Reiniciar a aplicação e confirmar que os mesmos dados continuam presentes
- [ ] Reentrar no PDV e confirmar o mesmo estado do Caixa
- [ ] Confirmar estoque, produtos, lotes, vendas, itens, pagamentos, transações e movimentos após reinício
- [ ] Confirmar configurações fiscais e demais configurações após reinício
- [ ] Confirmar que nenhum dado novo volta para valores padrão após nova inicialização
- [ ] Confirmar que nenhum dado novo some ou duplica após nova inicialização
- [ ] Confirmar continuidade dos estados de todos os módulos que dependem de dados persistidos
- [ ] Ponto de restauração final desta sessão será criado após a homologação real

## Sessão 9 — Auditoria final de arquitetura
- [ ] Não existe segundo dono real para abertura do Caixa
- [ ] Não existe segundo dono real para fechamento do Caixa
- [ ] Rotas legadas permanecem somente como compatibilidade, sem criar estado paralelo
- [ ] Um único cálculo canônico é usado para fechamento e relatórios
- [x] Idempotência impede duplicação de operações críticas
- [ ] Backup inclui todas as tabelas necessárias ao estado operacional
- [ ] Nenhum componente legado é montado simultaneamente no `App`
- [ ] Nenhuma funcionalidade da plataforma depende exclusivamente de estado temporário de sessão para dados operacionais
- [ ] Todo estado operacional persistente possui leitura de retorno do banco após inicialização
- [ ] Nenhum valor padrão de frontend pode sobrescrever silenciosamente um valor já persistido

> Convenção: `[x]` = implementação confirmada no código ou comportamento funcional já informado/homologado. `[ ]` = ainda requer teste real ou auditoria final.
