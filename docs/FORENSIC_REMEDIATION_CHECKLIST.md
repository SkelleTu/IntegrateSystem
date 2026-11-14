# Aura System — Checklist Forense de Remediação Integral

**Escopo:** repositório `SkelleTu/IntegrateSystem`, branch `fix/integrated-system-full-remediation`, PR #63.  
**Regra de segurança:** não fazer merge, deploy, migração destrutiva, alteração de credenciais ou escrita na base de produção durante a remediação. Produção só muda após backup restaurável, QA integral, revisão e autorização específica.

## Legenda
- [x] Correção implementada e validada no escopo indicado.
- [ ] Pendente de implementação ou validação.
- [!] Bloqueador: não liberar produção enquanto estiver aberto.
- [~] Parcial: existe correção, mas falta prova operacional.

## 0. Governança, baseline e rastreabilidade
- [x] Separar branch de remediação da `main`.
- [x] Manter PR #63 em draft, sem merge/deploy.
- [x] Suíte isolada anterior: 75 verificações E2E aprovadas em SQLite descartável.
- [ ] Inventariar todas as rotas HTTP, WebSocket, jobs, comandos locais e handlers de UI.
- [ ] Associar cada rota/handler a módulo, papel autorizado, tenant, validação, efeitos colaterais e testes.
- [ ] Gerar matriz de rastreabilidade requisito → arquivo/função → teste → evidência.
- [ ] Garantir logs de auditoria sem senhas, tokens, credenciais, dados fiscais sensíveis ou dados pessoais desnecessários.

## 1. Identidade, autenticação e sessão
- [x] Conta mestre reconhecida por role `owner`, não por username fixo.
- [x] Endpoint `GET /api/admin/users` adicionado e restrito a owner.
- [ ] Revisar login, logout, recuperação/troca de senha e cadastro público.
- [ ] Revisar hash de senha, política de senha, comparação em tempo constante e migração de hashes legados.
- [ ] Revisar cookies de sessão: Secure, HttpOnly, SameSite, expiração, rotação e invalidação.
- [ ] Revisar proteção CSRF em todas as operações mutáveis.
- [ ] Revisar rate limit por IP/conta e proteção contra enumeração/brute force.
- [ ] Revisar serialização de usuário e garantir remoção de senha/hash/token/segredos em todas as respostas.
- [ ] Testar sessão concorrente, expirada, revogada e persistência após restart.

## 2. Autorização e segregação de funções
- [x] Owner navigation baseada em role.
- [x] Cadastro de funcionário valida username/senha e herda enterpriseId do administrador.
- [~] Matriz inicial de papéis aplicada parcialmente: owner/admin para operações administrativas; barber preserva operação do caixa/fila permitida. Falta fechar matriz completa por ação.
- [~] Reforçadas rotas administrativas: CRUD de serviços, reset/definição da fila e leitura de vendas, histórico de caixa e transações agora exigem admin/owner. Faltam as demais rotas e escopo tenant.
- [ ] Garantir que funcionário de caixa só execute operações operacionais necessárias.
- [~] Operações administrativas principais já possuem guards; endpoint legado de emissão fiscal fictícia foi desativado. Falta auditoria rota a rota.
- [~] Rotas públicas de comanda têm rate limit e validação, mas ainda precisam de token de posse não enumerável para impedir alteração de ticket de terceiros por ID sequencial.
- [x] E2E comprovou que usuário barber recebe 403 ao criar serviço, resetar fila, ler vendas e ler transações financeiras.
- [ ] Testar acesso horizontal e vertical com matriz completa de papéis, inclusive por chamadas HTTP diretas.

## 3. Multiempresa / tenant isolation
- [!] Mapear todas as tabelas, índices, relações e queries sem enterpriseId.
- [!] Definir estratégia de tenant para owner multiempresa e usuário vinculado a uma empresa.
- [ ] Planejar backfill determinístico dos dados existentes, sem atribuição ambígua.
- [ ] Adicionar enterpriseId/FKs/índices únicos compostos nas entidades aplicáveis.
- [ ] Propagar tenant em criação, leitura, atualização, exclusão, busca, relatórios e jobs.
- [ ] Garantir isolamento em serviços, tickets, fila, categorias, menu, produtos, lotes, estoque, logs, vendas, itens, pagamentos, transações, caixa, ponto, configurações, fiscal e arquivos.
- [ ] Revisar cache, WebSocket, notificações e exportações por tenant.
- [ ] Adicionar testes automatizados com duas empresas e dados deliberadamente semelhantes.
- [ ] Testar que nenhum tenant lê, altera, exclui ou contabiliza dados do outro.
- [!] Não executar migração na produção até backup restaurável e plano de rollback aprovados.

## 4. Banco de dados, migrations e consistência
- [ ] Comparar schema SQLite, schema PostgreSQL e schema Drizzle efetivamente usado.
- [ ] Inventariar todas as migrations e validar ordem, idempotência e compatibilidade.
- [ ] Validar FKs, índices, constraints, nullability, defaults e tipos monetários/temporais.
- [ ] Revisar dual-write, reconciliação e paridade entre bancos.
- [ ] Garantir transações atômicas em operações que alteram múltiplas tabelas.
- [ ] Testar rollback e recuperação de falha no meio da operação.
- [ ] Testar concorrência, idempotência, repetição de requisições e condições de corrida.
- [ ] Garantir integridade referencial e impedir registros órfãos.

## 5. Produtos, catálogo, categorias e menu digital
- [~] Campos de produto por peso/unidade esclarecidos na interface.
- [ ] Revisar CRUD completo, validação, duplicidade, SKU, código de barras e código de balança.
- [ ] Revisar variantes, lotes, preço, custo, unidade e conversão kg/g/unidade.
- [ ] Revisar categoria, ordenação, imagem, disponibilidade e exclusão com dependências.
- [ ] Validar arredondamento monetário em centavos e quantidade fracionária.
- [ ] Testar importação/exportação e busca por nome, código e código de barras.
- [~] Permissões admin/owner adicionadas também à consulta de lotes, histórico de estoque, reposições e verificação de duplicidade. Testes específicos desses novos guards ainda pendentes.
- [ ] Garantir tenant e permissões em todas as operações.

## 6. Estoque, lotes, validade e reposição
- [x] Quantidade total em kg/unidades explicitada.
- [x] Custo e preço por kg/unidade explicitados.
- [x] Opção “Sem validade” adicionada.
- [x] Preço de venda obrigatório no primeiro lote.
- [ ] Revisar entrada, saída, ajuste, inventário, transferência e exclusão.
- [ ] Revisar FEFO/FIFO e consumo de múltiplos lotes.
- [ ] Revisar validade ausente, vencida, próxima do vencimento e fuso local.
- [ ] Revisar baixa, estorno e cancelamento com concorrência.
- [ ] Revisar estoque negativo, estoque mínimo e alertas.
- [ ] Validar rastreabilidade por usuário, motivo, lote e timestamp.
- [ ] Testar peso decimal, precisão, conversões, arredondamentos e balança.
- [ ] Testar consistência após falha, repetição e cancelamento de venda.

## 7. Caixa, vendas, pagamentos e cancelamentos
- [x] Layout retrato reorganizado no código.
- [x] Peso começa vazio e aceita entrada decimal pt-BR.
- [x] Contraste do Total Geral, Finalizar Venda e Confirmar Peso ajustado.
- [~] Fluxo de venda por peso e estorno coberto por E2E isolado.
- [ ] Revisar abertura/fechamento de caixa, operador, saldo inicial/final e diferença.
- [ ] Revisar dinheiro, troco, débito, crédito, Pix e pagamentos combinados.
- [ ] Validar soma de pagamentos = total da venda e impedir valores negativos/inválidos.
- [~] Preço de cada item agora é recalculado no servidor a partir do cardápio, estoque legado ou lote; o servidor rejeita preço/unidade/subtotal divergentes e valida total contra o catálogo. Falta mover a verificação para a mesma transação e completar escopo tenant.
- [ ] Garantir atomicidade entre venda, itens, pagamentos, estoque, caixa e financeiro.
- [x] Venda de simulação bloqueada fora do QA isolado; status de venda real é definido pelo servidor.
- [ ] Revisar clique duplo, retry de rede e idempotency key.
- [ ] Validar ticketId associado à venda e atualizar ticket atomicamente na mesma transação.
- [ ] Revisar cancelamento total/parcial, estorno de pagamento e reposição de estoque.
- [ ] Validar impressão/recibo e recuperação de venda após refresh.
- [ ] Testar visualmente tablet em retrato/paisagem e resoluções menores.

## 8. Financeiro e relatórios
- [x] Filtros de data ajustados para dia local.
- [ ] Revisar entradas, despesas, categorias, exclusões e vínculos com vendas.
- [ ] Garantir que cancelamento estorne lançamentos relacionados sem duplicidade.
- [ ] Revisar totais, agrupamentos, período, timezone e limites inclusivos.
- [ ] Validar conciliação caixa ↔ vendas ↔ pagamentos ↔ financeiro.
- [ ] Testar exportações e permissões de relatórios.
- [ ] Garantir segregação por tenant e empresa.

## 9. Fila, senhas e serviços
- [ ] Revisar cadastro/edição/ativação/exclusão de serviços.
- [~] Reset e definição manual de senha agora exigem admin/owner; avançar/retroceder continua autenticado para operação diária. Falta tenant isolation e concorrência.
- [ ] Garantir atomicidade e concorrência entre vários dispositivos.
- [x] Reset e definição manual da fila protegidos por admin/owner.
- [ ] Isolar fila, tickets e serviços por tenant.
- [ ] Revisar WebSocket: autenticação, autorização, tenant, reconexão e mensagens.
- [ ] Testar reconexão e múltiplos operadores simultâneos.

## 10. Ponto e WebAuthn
- [x] Sequência server-side de entrada/intervalo/retorno/saída.
- [!] Implementar WebAuthn real: challenge aleatório, origem/RP ID, ceremony, assinatura, public key, counter e verificação de flags.
- [x] Até a validação real existir, produção falha fechado: cadastro e batida de ponto respondem 503; QA isolado mantém o fluxo sintético para testes.
- [x] Interface informa que a verificação do servidor está pendente, desabilita as ações em produção e não rotula mais credenciais como biometria verificada.
- [ ] Criar schema seguro para credenciais e chaves públicas.
- [ ] Implementar registro e autenticação com challenge de uso único e expiração.
- [ ] Remover confiança em fingerprintId enviado pelo cliente.
- [ ] Proteger vinculação, revogação e recuperação de credenciais.
- [ ] Testar replay, assertion adulterada, credencial de outro usuário e counter inválido.
- [ ] Se WebAuthn não puder ser concluído, retirar qualquer indicação de biometria validada.

## 11. Fiscal / NFC-e / SEFAZ
- [~] Rotas de configuração, logs, histórico e emissão fiscal agora exigem empresa ativa selecionada; removido fallback silencioso para empresa 1. Ainda falta isolamento completo das tabelas e validação de ponta a ponta.
- [ ] Revisar certificado A1, armazenamento seguro, senha e expiração.
- [ ] Revisar CSC, ID do CSC, UF, NCM, CFOP, CST/CSOSN, ICMS e regras tributárias.
- [ ] Validar XML, assinatura, QR Code, contingência, cancelamento e inutilização.
- [~] Camada de transporte SEFAZ endurecida: validação TLS do servidor habilitada por padrão e HTTP não-2xx rejeitado; UFs sem endpoint mapeado agora falham fechado em vez de enviar para SP. Falta homologação real com A1/CSC.
- [ ] Testar rejeições, timeout, duplicidade e consulta de protocolo.
- [ ] Garantir que venda não seja marcada como autorizada sem protocolo válido.
- [x] Respostas de configuração fiscal removem CSC Token, certificado A1 e senha; retornam apenas indicadores booleanos de configuração.
- [ ] Proteger XML, chaves e dados fiscais em repouso e em respostas.
- [ ] Documentar limitações por UF/regime tributário; não declarar emissão real sem homologação.

## 12. Backup, restore e continuidade
- [x] Backup falha fechado quando Neon/DB remoto não tem backup remoto comprovado.
- [!] Configurar backup remoto consistente e independente do banco primário.
- [ ] Definir frequência, retenção, criptografia e segregação de credenciais.
- [ ] Criar cópia antes de cada migration/deploy com alteração de dados.
- [ ] Executar restore real em ambiente isolado e comparar contagens/checksums.
- [ ] Testar PITR ou recuperação equivalente e documentar RPO/RTO.
- [ ] Monitorar idade, tamanho, resultado e integridade dos backups.
- [ ] Só marcar backup como completo após cópia remota verificada e restore de teste.

## 13. Integrações: Google Drive, impressão e balança
- [ ] Configurar OAuth/credenciais do Google Drive com escopo mínimo.
- [ ] Implementar refresh token, revogação, tratamento de quota e falhas.
- [ ] Confirmar upload, listagem, download e restore de arquivo de teste.
- [ ] Revisar bridge Windows: autenticação por token, pareamento e heartbeat.
- [ ] Validar impressão em Urano POP-S/PL2303GT e impressora térmica compatível.
- [ ] Validar reconexão USB/COM, seleção de porta, spool, encoding e corte.
- [ ] Validar leitura de peso/código de barras com dados reais da balança.
- [ ] Tratar bridge offline sem exibir status falso de conectado.
- [ ] Testar funcionamento local/offline e sincronização posterior.

## 14. Uploads, arquivos e documentos
- [ ] Revisar MIME real por assinatura do arquivo, extensão e tamanho.
- [ ] Impedir path traversal, nomes maliciosos e execução de arquivos.
- [ ] Proteger documentos privados e URLs de download.
- [ ] Revisar retenção, exclusão e vínculo ao tenant.
- [ ] Garantir armazenamento persistente no Render e no modo Windows.
- [ ] Testar limites, falhas parciais e arquivos corrompidos.

## 15. Interface, acessibilidade e responsividade
- [x] Contrastes solicitados em Dashboard, Estoque, modal e Caixa ajustados no código.
- [ ] Revisar todas as páginas em tema claro/escuro.
- [ ] Revisar tablet retrato/paisagem, desktop e mobile.
- [ ] Corrigir overflow, sobreposição, scroll, teclado virtual e modais.
- [ ] Padronizar estados loading/empty/error/success e feedback de validação.
- [ ] Validar foco, navegação por teclado, labels, contraste e alvos touch.
- [ ] Conferir todos os botões: texto, borda, hover, disabled e loading.
- [ ] Executar regressão visual em preview/QA com screenshots comparáveis.

## 16. Aplicação Windows / Electron / operação local
- [ ] Revisar scripts BAT, PowerShell, inicialização e encerramento.
- [ ] Garantir que erro não feche a janela sem mensagem/log.
- [ ] Revisar Electron Forge, preload, IPC e contextIsolation.
- [ ] Garantir que renderer não tenha Node integration desnecessária.
- [ ] Revisar instalação, atualização, rollback e migração local.
- [ ] Testar modo offline, reconexão e persistência.
- [ ] Testar build limpo em Windows real e inicialização após reboot.

## 17. Segurança de aplicação e dependências
- [ ] Reexecutar `npm audit` e classificar vulnerabilidades diretas/transitivas.
- [ ] Atualizar dependências em grupos pequenos, sem major upgrade cego.
- [ ] Corrigir vulnerabilidades altas/criticas alcançáveis e registrar exceções.
- [ ] Revisar CORS, CSP, headers, cookies e exposição de stack traces.
- [ ] Revisar SQL injection, XSS, SSRF, CSRF, IDOR/BOLA e mass assignment.
- [ ] Revisar segredos no repositório, logs, build e variáveis de ambiente.
- [ ] Revisar WebSocket e endpoints de diagnóstico/observabilidade.
- [ ] Adicionar SAST/dependency scanning e testes de segurança no CI.

## 18. Observabilidade e operação
- [ ] Padronizar requestId/traceId e logs estruturados.
- [ ] Remover dados pessoais e segredos dos logs.
- [ ] Criar alertas para erros, latência, falhas de integração e backup.
- [ ] Monitorar saúde de banco, pool, sessões, WebSocket e bridge.
- [ ] Definir readiness/liveness e comportamento durante indisponibilidade.
- [ ] Documentar runbooks de incidente, restauração e rollback.

## 19. Testes e critérios de aceite
- [x] 75 verificações E2E isoladas aprovadas no baseline informado.
- [x] Nova execução E2E após hardening de papéis passou: barber negado em 4 operações administrativas/financeiras.
- [ ] Unit tests para regras monetárias, quantidades, FEFO, permissões e timezone.
- [ ] Integração para cada rota mutável e cada rota protegida.
- [ ] Testes multi-tenant com pelo menos duas empresas.
- [ ] Testes de concorrência, repetição, falha e rollback.
- [ ] E2E ponta a ponta: compra/entrada → estoque → venda → pagamento → caixa → financeiro → fiscal → cancelamento.
- [ ] Teste explícito de produção: endpoints WebAuthn devem retornar 503 e não gravar ponto/credencial; QA isolado deve continuar com 200.
- [ ] Testes visuais em dispositivo real/tablet e desktop.
- [ ] Teste de restore real do backup.
- [ ] Homologação fiscal com certificado/CSC reais.
- [ ] Impressão física e balança reais validadas.
- [ ] CI verde no commit final, sem testes ignorados para mascarar falhas.
- [ ] Revisão final de diff e confirmação de que nenhuma alteração alcançou `main`.

## 20. Liberação controlada
- [ ] Backup remoto concluído e restore comprovado.
- [ ] Migrations revisadas, ensaiadas em cópia e com rollback.
- [ ] Todos os bloqueadores de segurança encerrados.
- [ ] QA aprovado por módulo e por perfil.
- [ ] Preview visual aprovado.
- [ ] Plano de deploy, monitoramento e rollback documentado.
- [ ] Aprovação explícita antes de merge/deploy da aplicação original.

---

## Próxima execução
1. Fechar inventário de rotas e permissões server-side.
2. Desenhar tenant model e plano de backfill sem tocar na produção.
3. Implementar isolamento em schema, storage, routes, WebSocket e testes isolados.
4. Só depois avançar para WebAuthn, backup/restore, fiscal, integrações físicas e regressão final.

**Definição de 100%:** todos os itens aplicáveis marcados, testes reproduzíveis aprovados, integrações reais validadas quando dependem de hardware/credenciais e nenhum bloqueador crítico aberto. Código alterado ou CI verde isoladamente não significa 100%.


## Registro de execução — 14/11/2026
- [x] Criado este checklist como artefato versionado na branch de remediação.
- [x] Serviços: criação, edição e exclusão agora exigem papel admin/owner.
- [x] Fila: reset e definição manual agora exigem papel admin/owner; avançar/retroceder seguem disponíveis a funcionário autenticado.
- [x] Relatórios sensíveis: leitura de vendas, histórico de caixas e transações financeiras agora exige admin/owner.
- [x] Atualização de itens de comanda exige sessão autenticada.
- [x] Endpoint legado `/api/sales/:id/emit-fiscal` desativado (HTTP 410), pois gerava XML fictício e marcava venda como emitida sem prova SEFAZ.
- [~] CI e E2E após estas alterações: em execução/aguardando conclusão; não marcar como validado até os workflows terminarem.

- [x] GitHub Actions `Aura isolated operational E2E` do commit `253347735f96de123801b4019888822246ea0394`: sucesso; incluiu os novos casos de negação para barber.

- [x] Endpoints de custo/rastreabilidade do estoque (`inventory-restocks`, reposições por item, lotes, logs de lote e checagem de duplicidade) agora exigem admin/owner; validar regressão específica no próximo E2E.

- [x] Implementado fail-closed para ponto em produção até a verificação criptográfica WebAuthn ser concluída; fluxo sintético limitado ao ambiente QA identificado por branch/service.

- [x] Corrigido vazamento de segredos fiscais: GET/POST `/api/fiscal/settings` não devolvem CSC Token, certificado A1 ou senha do certificado; a UI informa quando o CSC já está configurado sem revelar o valor.

- [x] No commit `5adb7a1bd65c5b4f8c60e88920f9895064e81c2c`: Integrated System CI, Aura isolated operational E2E, Aura MCP Full Audit, Aura Observability Hardening e Forensic audit PR checks concluíram com sucesso.
- [x] E2E cobriu 14 rotas de leitura de módulos, o ciclo completo de caixa/estoque/financeiro/PIX/cancelamento/limpeza e os quatro bloqueios de papel barber já descritos.

- [x] Corrigida configuração TLS da transmissão fiscal: certificado do servidor SEFAZ agora é validado; resposta HTTP fora de 2xx falha; certificado A1 sem chave/certificado válidos é rejeitado; UF sem endpoint configurado não usa fallback incorreto para SP.

- [x] Rotas fiscais deixam de usar empresa 1 como fallback: exigem contexto ativo de empresa para GET/POST de configurações, logs, histórico e emissão.

- [x] Preservado o fluxo público de autoatendimento em /cart: o endpoint de itens não exige login do cliente, mas valida JSON, IDs e quantidades, usa nome/preço do catálogo no servidor e aplica rate limit. A criação/consulta pública de senhas também ganhou rate limit e verificação de serviço ativo.

- [x] Commit `7ac22535ac32d4ef79176e1b7dd0b0c690738097`: Integrated System CI, E2E isolado, observabilidade e forensic checks concluíram com sucesso após hardening do autoatendimento. O teste E2E dedicado para preço do carrinho ainda precisa ser acrescentado.

- [x] Caixa/vendas: cliente envia apenas referência da origem do item; servidor busca preço e unidade oficiais em cardápio/estoque/lote, recalcula subtotais e rejeita adulteração. Venda de simulação não pode ser criada em produção e o botão só aparece em build de desenvolvimento.
- [x] E2E isolado tentou venda com preço adulterado (rejeitada), concluiu venda com preço oficial, cancelou e confirmou reposição do lote.

- [x] E2E isolado do commit `37c228e5c71e8386c553a905c4d53695eaad35bf` passou com a nova validação de preço e o bloqueio de venda simulada fora do QA.
