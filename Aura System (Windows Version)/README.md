# Aura System - Windows Desktop (Offline First)

Esta pasta contém o código-fonte da versão desktop do Aura System, convertida para rodar nativamente no Windows utilizando Electron.

## 🚀 Como gerar os instaladores (32-bit e 64-bit)

Devido a restrições técnicas (o Replit roda em Linux e não possui o software 'Wine' para gerar arquivos .exe diretamente), você deve realizar o passo final no seu próprio computador Windows:

1.  **Baixe esta pasta** `Aura System (Windows Version)` para o seu computador.
2.  **Instale o Node.js** (caso não tenha): [nodejs.org](https://nodejs.org/)
3.  **Abra o terminal** (CMD ou PowerShell) dentro da pasta baixada.
4.  **Execute os comandos:**
    ```bash
    npm install
    npm run dist
    ```

Os instaladores serão gerados na pasta `dist/`:
-   `Aura System Setup 1.0.0.exe` (Instalador universal que detecta a arquitetura)
-   Versões específicas na subpasta de build.

## 🛠️ O que foi corrigido
-   **Suporte Multi-arquitetura**: Configurado para gerar binários `ia32` (32 bits) e `x64` (64 bits).
-   **Configuração de Empacotamento**: Adicionado `electron-builder` com as configurações corretas de `appId`, `author` e ícone.
-   **Dependências**: Corrigida a separação entre dependências de produção e desenvolvimento para evitar erros de compilação.
-   **Offline-First**: O sistema tenta carregar o servidor local (`localhost:5000`) e possui fallback para a versão web caso o servidor demore a iniciar.

## 📂 Estrutura do Projeto
-   `main.js`: Arquivo principal do Electron (gerencia as janelas).
-   `server/`: Backend em Node.js (Express/SQLite).
-   `client/`: Frontend em React/Vite.
-   `dist/`: Onde os arquivos compilados e instaladores residem.
