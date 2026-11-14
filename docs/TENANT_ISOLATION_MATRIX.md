# Aura System — Matriz de Isolamento Multiempresa

**Status:** plano técnico de implementação. Ainda não aplicado em produção.  
**Motivo:** o schema atual possui enterpriseId em usuários, configurações gerais e configurações fiscais, mas a maior parte das tabelas operacionais não possui vínculo direto com empresa. A autorização da interface não substitui isolamento de dados no banco.

## Princípios obrigatórios
1. O tenant vem da sessão autenticada (users.enterpriseId), nunca de um enterpriseId livre enviado pelo navegador.
2. Owner precisa selecionar explicitamente uma empresa ativa para operar módulos de negócio.
3. Todas as consultas, inserções, atualizações, exclusões, buscas, relatórios, exportações, jobs, WebSockets e backups devem respeitar o tenant.
4. IDs globais não são autorização. Toda operação por ID deve filtrar também por enterpriseId.
5. Dados derivados herdam o tenant do registro-pai e validam que pai e filho pertencem à mesma empresa.
6. Não usar enterpriseId = 1 como fallback silencioso. Contexto ausente ou ambíguo deve falhar fechado.
7. Migração deve ser aditiva, auditável, reversível e testada em cópia restaurada.

## Matriz por tabela

| Tabela | Tenant atual | Origem correta do tenant | Regra de integridade |
|---|---|---|---|
| users | Parcial | vínculo do usuário | Owner pode selecionar empresa; funcionário deve ter empresa obrigatória |
| enterprises | Global | não aplicável | Owner administra; admin só acessa empresas que possui |
| services | Ausente | contexto autenticado | CRUD e leitura por empresa |
| tickets | Ausente | empresa da fila/serviço no momento da emissão | Número de senha único por empresa |
| queue_state | Ausente | contexto autenticado | Uma linha por empresa; atualização atômica |
| categories | Ausente | contexto autenticado | Categoria e ordenação por empresa |
| menu_items | Ausente | categoria vinculada | category_id e enterprise_id precisam coincidir |
| cash_register | Ausente | user_id → users.enterprise_id | Caixa e operador pertencem à mesma empresa |
| sales | Ausente | caixa e usuário vinculados | Venda, operador e caixa pertencem à mesma empresa |
| sale_items | Ausente | sale_id → sales.enterprise_id | Item pertence ao catálogo/estoque da mesma empresa |
| payments | Ausente | sale_id → sales.enterprise_id | Pagamento pertence à venda do mesmo tenant |
| transactions | Ausente | contexto autenticado | Toda entrada/despesa recebe tenant no servidor |
| time_clock | Ausente | user_id → users.enterprise_id | Funcionário só registra/consulta o próprio ponto |
| inventory | Ausente | contexto autenticado | SKU/código/barcode com escopo por empresa |
| inventory_logs | Ausente | inventory_id → inventory.enterprise_id | Log herda empresa do item |
| inventory_restocks | Ausente | inventory_id → inventory.enterprise_id | Reposição herda empresa do item |
| products | Ausente | contexto autenticado | Produto, SKU e código interno isolados por empresa |
| batches | Ausente | product_id → products.enterprise_id | Lote não aponta para produto de outra empresa |
| batch_logs | Ausente | product_id → products.enterprise_id | Log herda empresa do produto e valida lote |
| stock_snapshots | Ausente | contexto autenticado | Snapshot contém somente dados da empresa |
| fiscal_settings | Já possui | contexto autenticado | Unicidade por empresa; segredos nunca retornam à UI |
| nfce | Ausente | sale_id → sales.enterprise_id | Documento fiscal pertence à venda e à empresa |
| settings | Já possui | contexto autenticado | Uma configuração ativa por empresa |
| user_sessions | Ausente | user_id → users.enterprise_id | Auditoria identifica empresa do usuário |
| runtime_events | Global/operacional | enterpriseId opcional | Eventos de negócio precisam do tenant |
| aura_sessions | Global/técnica | sessão autenticada | Validar tenant em cada requisição |
| data_backups | Global ou por tenant | owner/tenant do snapshot | Backup global só para owner; backup empresarial não cruza dados |

## Backfill e migração

### Pré-condições
- [ ] Obter backup remoto íntegro da base primária.
- [ ] Restaurar esse backup em ambiente isolado.
- [ ] Contar empresas e registros sem tenant em todas as tabelas.
- [ ] Mapear relações órfãs e registros sem usuário/empresa de origem.
- [ ] Definir tratamento para dados sem origem confiável. Nunca atribuir silenciosamente a uma empresa arbitrária.

### Estratégia
1. Adicionar enterprise_id inicialmente nullable às tabelas operacionais, nos schemas PostgreSQL e SQLite.
2. Fazer backfill por relações pai/filho: venda → itens/pagamentos/NFC-e; produto → lotes/logs; inventário → reposições/logs; usuário → caixa/ponto.
3. Para registros sem relação que permita inferência, só atribuir automaticamente se houver exatamente uma empresa e o relatório de impacto for aprovado. Se houver zero ou mais de uma, abortar e exigir reconciliação explícita.
4. Criar índices por tenant e índices compostos para códigos e numeração.
5. Validar que não restam registros de negócio sem tenant e que nenhuma relação cruza empresas.
6. Só então aplicar NOT NULL às tabelas em que tenant é obrigatório e constraints/FKs apropriadas.
7. Implantar filtros tenant-aware em todas as funções de storage e rotas antes de liberar uma segunda empresa.
8. Testar rollback em cópia e medir duração/bloqueios antes da janela de manutenção.

### Índices e unicidade a revisar
- services(enterprise_id, id)
- tickets(enterprise_id, ticket_number)
- queue_state(enterprise_id) único
- categories(enterprise_id, name)
- menu_items(enterprise_id, category_id)
- products(enterprise_id, codigo_produto)
- batches(enterprise_id, sku) e barcode conforme regra comercial
- cash_register(enterprise_id, user_id, status)
- sales(enterprise_id, created_at) e sales(enterprise_id, cash_register_id)
- transactions(enterprise_id, created_at, business_type)
- time_clock(enterprise_id, user_id, timestamp)
- fiscal_settings(enterprise_id) único
- nfce(enterprise_id, sale_id) e chave de acesso única

## Mudanças de código necessárias
- [ ] Criar helper server-side para resolver empresa ativa a partir da sessão.
- [ ] Exigir contexto de empresa para todas as rotas operacionais, exceto endpoints públicos explicitamente desenhados.
- [ ] Atualizar IStorage para receber tenant/contexto em todas as operações de negócio.
- [ ] Atualizar implementações SQLite/Neon/Turso e filtrar SELECT, UPDATE, DELETE e INSERT.
- [ ] Atualizar rotas REST e WebSocket para nunca confiar em tenant enviado pelo cliente.
- [ ] Atualizar APIs públicas de menu/fila para resolver empresa por slug/URL pública e aplicar rate limit por tenant.
- [ ] Atualizar caixa/venda/financeiro para propagar tenant e validar referências cruzadas.
- [ ] Atualizar estoque/FEFO/lotes/snapshots para operar dentro do tenant.
- [ ] Atualizar fiscal, numeração e certificado por empresa.
- [ ] Atualizar relatórios, exportações, backup e restauração.
- [ ] Atualizar jobs, logs de auditoria e eventos WebSocket.
- [ ] Atualizar cache/query keys para incluir tenant quando aplicável.

## Testes obrigatórios de isolamento
- [ ] Criar empresa A e empresa B com produtos, códigos, lotes e usuários semelhantes.
- [ ] Usuário A não lista, consulta, altera ou exclui registros de B por API, UI, WebSocket, busca ou relatório.
- [ ] Usuário A não acessa venda, item, pagamento, caixa, transação, ponto ou documento fiscal de B por ID direto.
- [ ] Ticket público de A não revela fila, serviço ou itens de B.
- [ ] Alterar enterpriseId no payload não muda o escopo da sessão.
- [ ] Owner seleciona A e B explicitamente e cada troca altera todas as consultas e operações.
- [ ] Relatórios, totais e snapshots de A não incluem registros de B.
- [ ] Cancelar venda de A não altera estoque/financeiro de B.
- [ ] Jobs e WebSockets não transmitem eventos entre tenants.
- [ ] Testes concorrentes de caixa, fila, venda e estoque permanecem consistentes por tenant.

## Critério de conclusão
O isolamento só será considerado concluído quando cada tabela operacional tiver tenant válido, cada função de storage aplicar o escopo, todas as rotas e integrações estiverem cobertas e a bateria automatizada com duas empresas provar negação horizontal e vertical. A simples inclusão de uma coluna enterprise_id não encerra o risco.
