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
- [x] Ponto de restauração: `40cb34307407b72e5f311bf1dff7e6cdf434951f`

## Sessão 4 — Vendas e cadeia operacional
- [x] Venda já utiliza `/api/sales` como operação de backend
- [x] Venda grava itens, pagamentos e lançamento financeiro no servidor
- [x] Baixa de estoque ocorre no backend durante a venda
- [x] Cancelamento de venda possui estorno de estoque/financeiro no backend
- [x] O cliente passa a refletir essas gravações imediatamente por invalidação de cache
- [x] Ponto de restauração: `40cb34307407b72e5f311bf1dff7e6cdf434951f`

## Sessão 5 — Revisão final
- [ ] Validar abertura após reiniciar/reentrar no PDV
- [ ] Validar estoque 35 → venda de 3 → 32 após sair e entrar novamente
- [ ] Validar venda aparecendo em Financeiro
- [ ] Validar venda aparecendo em Relatórios
- [ ] Validar fechamento com valor esperado correto
- [ ] Validar sangria sem permitir saldo negativo
- [ ] Validar suprimento refletindo no Caixa
- [ ] Validar revisão automática detalhada e conclusão
- [ ] Validar ausência de interfaces duplicadas
- [ ] Ponto de restauração final será criado após a validação integrada

> Observação: os itens marcados `[x]` representam implementação concluída no código. Os itens da Sessão 5 permanecem pendentes porque dependem de validação real no ambiente executado.
