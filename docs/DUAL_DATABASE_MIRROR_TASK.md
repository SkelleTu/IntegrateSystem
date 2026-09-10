# Aura System — migração segura para banco duplo simultâneo

## Objetivo

Turso e SQLite local devem ser duas cópias vivas do mesmo banco.

Toda operação de **escrita de dados da aplicação** deve executar a mesma alteração em:

1. Turso
2. SQLite local

As duas execuções devem começar em paralelo e ambas devem concluir com sucesso. Exportação `.sql` é somente manual, pelo controle de banco. Não criar `.sql` automaticamente a cada alteração.

## Estado já preparado

`server/db.ts` agora faz `multiWrite()` em paralelo com `Promise.allSettled()` e lança erro quando qualquer destino falha. O arquivo não deve voltar ao modelo "primário primeiro + espelho depois".

## Regra crítica para storage.ts e routes.ts

Auditar **todas** as escritas reais e eliminar escritas diretas em `db`, `dbRemote` ou `dbLocal` quando forem dados da aplicação.

Procure pelo menos por:

- `db.insert(`
- `db.update(`
- `db.delete(`
- `dbLocal.insert(`
- `dbLocal.update(`
- `dbLocal.delete(`
- `dbRemote.insert(`
- `dbRemote.update(`
- `dbRemote.delete(`
- qualquer `.run()`, `.execute()` ou SQL DML (`INSERT`, `UPDATE`, `DELETE`) que altere dados fora de `multiWrite()`/`dualWrite()`.

Não alterar consultas `select` somente para este motivo.

## Como converter uma escrita

Usar o helper existente:

```ts
await dualWrite(async (database) => {
  // toda a escrita referente a esta operação usa `database`
});
```

Nunca fazer:

```ts
await db.insert(...);
await dbLocal.insert(...);
```

porque isso reintroduz sequência e duplica lógica.

## Operações com várias escritas dependentes

Quando uma operação cria um registro e depois precisa do ID recém-criado para criar registros dependentes, **todas as escritas dependentes devem ficar dentro do mesmo callback `dualWrite`**.

Exemplo conceitual:

```ts
return await dualWrite(async (database) => {
  const [enterprise] = await database.insert(enterprises).values(data).returning();
  await database.insert(settings).values({ enterpriseId: enterprise.id });
  await database.insert(users).values({ ...admin, enterpriseId: enterprise.id });
  return enterprise;
});
```

Isso é especialmente importante para:

- `createEnterprise`
- criação de venda + itens + pagamentos
- operações que criam snapshot e depois limpam/alteram registros
- qualquer fluxo que dependa do ID retornado pelo banco

Cada banco mantém seus próprios IDs locais, portanto nunca copiar manualmente o ID produzido pelo outro banco durante a mesma operação.

## Queue state

`getQueueState()` e `updateQueueState()` não podem criar/alterar `queue_state` somente no banco retornado por `db`.

A criação inicial deve usar `dualWrite`.

Cuidado com corrida: se dois pedidos tentarem inicializar o estado ao mesmo tempo, manter o comportamento atual da aplicação e evitar criar duas linhas de estado por banco.

## Snapshots / clearAllProducts

A criação de snapshot precisa respeitar a mesma regra de duplicação.

Não executar um snapshot em SQLite manualmente e depois outro caminho de sincronização. A operação de dados deve possuir um único fluxo por `dualWrite`.

A exportação `.sql` continua separada e manual.

## Fingerprint / autenticação em routes.ts

Auditar endpoints que alteram usuário ou outro dado persistido diretamente no route handler. Preferir delegar ao storage ou envolver a escrita em `multiWrite`/`dualWrite`.

Não alterar lógica de autenticação, sessão, cookies ou autorização além da camada de persistência necessária.

## Tratamento de falha

Não engolir erro de um dos bancos.

A API deve receber erro quando Turso ou SQLite falhar. O frontend deve continuar tratando erro normalmente, sem afirmar que a alteração foi salva quando apenas um banco recebeu a mudança.

Não implementar sincronização assíncrona silenciosa neste passo.

## Auto-backup

`dualWrite()` pode continuar chamando `scheduleAutoBackup()` depois de uma escrita bem-sucedida.

Não transformar o auto-backup JSON em parte da escrita dupla dos dados.

Não criar auto-save `.sql`.

## Não mexer

Não alterar sem necessidade:

- schema das tabelas
- nomes de colunas
- componentes React
- layout/status bar
- `DatabaseControl`
- fluxo manual de exportação/importação SQL
- comportamento do PDV/estoque/fiscal além da persistência dupla

## Verificação obrigatória antes de concluir

1. `git diff` deve mostrar somente as mudanças necessárias para a persistência dupla e eventuais testes/auditoria.
2. TypeScript deve compilar sem novos erros.
3. Executar o teste/build existente do projeto apropriado.
4. Fazer uma operação real de criação/alteração de dados em desenvolvimento e verificar que o mesmo registro/efeito existe no SQLite local e no Turso.
5. Testar uma operação de atualização e uma exclusão.
6. Testar que uma falha em um destino não é silenciosamente ignorada.
7. Confirmar que o botão de banco e a exportação `.sql` continuam funcionando.

## Critério final

Somente considerar a migração concluída quando **não houver mais escrita de dados da aplicação fora do caminho de escrita dupla**, exceto operações explicitamente técnicas de inicialização/migração do banco.
