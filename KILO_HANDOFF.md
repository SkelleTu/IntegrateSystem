# Aura System: entrega segura para o Kilo

## Fonte oficial

A branch `main` contém o código-fonte oficial do aplicativo.

A branch `runtime-live` é exclusiva para dados gerados durante execuções do Aura System. Ela não deve ser incorporada à `main`.

## Procedimento de substituição total

Para substituir a cópia local do projeto pela versão oficial da `main`:

```bash
git fetch origin
git checkout main
git reset --hard origin/main
git clean -fd
```

Depois confirme:

```bash
git rev-parse HEAD
git status --short
```

O `status` deve ficar limpo.

Não executar `git clean -fdx`, porque isso também remove ferramentas/artefatos locais ignorados, inclusive dependências que podem ser reutilizadas.

## Regras obrigatórias

- Não fazer merge de `runtime-live` na `main`.
- Não adicionar `runtime/*.json`, `runtime/*.jsonl`, `runtime/.sync-repo/` ou `runtime/runtime-sync.log` a commits.
- Não modificar o sincronizador de runtime para apontar para outro repositório.
- Não apagar o `.gitignore` do runtime.
- Não substituir o monitor por logs manuais espalhados pelas telas sem preservar o monitor global.
- Não usar `git reset --hard` contra uma branch de trabalho diferente de `main`.
- Não fazer push automático de alterações do Kilo para `main`.

## Objetivo do runtime

Durante a execução, o Aura registra localmente:

- bootstrap do `.bat`
- ambiente e dependências
- build e empacotamento
- servidor e lifecycle do Node
- banco, rotas e serviços de inicialização
- requisições HTTP
- Electron e lifecycle da janela
- renderer e React
- console, warnings e erros
- `fetch` e `XMLHttpRequest`
- navegação e interações da interface
- heartbeat e saúde do processo

O sincronizador `tools/runtime-sync.ps1` publica esse estado em `runtime-live` usando a autenticação Git já disponível na máquina. Nenhuma credencial do GitHub deve ser gravada no código.

## Critério de integridade

Antes de alterar o código, o Kilo deve verificar se o HEAD local corresponde a `origin/main`.

Depois de alterar o código, deve executar as verificações do projeto e informar claramente qualquer falha. Não deve esconder erros nem afirmar sucesso sem evidência.

## Atualização futura

Quando a `main` receber uma nova versão oficial, repetir o mesmo procedimento de `fetch` + atualização limpa da `main`, sem trazer `runtime-live` para o código.
