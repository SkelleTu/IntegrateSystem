# Instruções para Build do Aura System Windows

O Replit Agent configurou o projeto para gerar versões de 32 bits (ia32) e 64 bits (x64) automaticamente.

## Problemas Identificados
1. **Incompatibilidade de Arquitetura**: A mensagem "Este aplicativo não pode ser executado em seu PC" ocorre quando um app de 64 bits tenta rodar em Windows 32 bits ou quando o binário está corrompido/mal assinado.
2. **Ambiente de Build**: O Replit roda em Linux. Para gerar o executável de Windows (.exe) com `electron-builder` a partir do Linux, é necessário o `wine`. Como o ambiente do Replit não possui `wine` pré-instalado por padrão e não temos permissão `sudo` para instalar, o build completo deve ser feito em uma máquina Windows ou via CI (GitHub Actions).

## Como gerar o executável (Localmente no seu Windows)
1. Baixe a pasta `Aura System (Windows Version)` para o seu PC.
2. Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.
3. Abra o terminal na pasta e execute:
   ```bash
   npm install
   npm run dist
   ```
4. Os instaladores (32 e 64 bits) estarão na pasta `dist/`.

## Configurações Aplicadas
- Adicionado `electron-builder` como dependência de desenvolvimento.
- Configurado `package.json` com `appId`, `author` e alvos `ia32` e `x64`.
- Movido `electron` para `devDependencies` (requisito do builder).
- Adicionado script `npm run dist`.
