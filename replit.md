# Aura System

Sistema de gestão para estabelecimentos (barbearias, salões, etc.) com PDV, controle de estoque, agendamentos e integração fiscal SEFAZ (NFC-e/NF-e).

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Express + TypeScript (tsx)
- **Banco local:** SQLite via better-sqlite3 + Drizzle ORM
- **Banco remoto (opcional):** Turso (libSQL) — ativa automaticamente se `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` estiverem definidos

## Como rodar

```bash
npm install
npm run dev
```

O servidor sobe na porta `5000`. O workflow "Start application" já está configurado no Replit.

## Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|---|---|---|
| `SESSION_SECRET` | Sim | Segredo da sessão Express |
| `TURSO_DATABASE_URL` | Não | URL do banco Turso (sincronização remota) |
| `TURSO_AUTH_TOKEN` | Não | Token de autenticação Turso |

## Scripts úteis

- `npm run dev` — inicia em modo desenvolvimento
- `npm run build` — gera bundle de produção
- `npm run db:push` — aplica schema no banco (Drizzle)
- `npm run check` — verifica tipos TypeScript

## User preferences

- Idioma preferido: Português (BR)
