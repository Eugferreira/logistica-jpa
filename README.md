# Logística JPA — Gestão de Itens de Pedido e Fretes

Aplicação interna da JPA Agro que substitui a planilha manual de fretes. Importa os itens de pedido do ERP, permite o preenchimento das informações de frete (transportador, motorista, valor combinado) e registra auditoria de tudo que é alterado.

## Stack
- **Front-end:** React + Vite + TypeScript + Tailwind (shadcn/ui), React Query
- **Back-end:** Supabase (PostgreSQL, Auth, RLS)
- **Deploy:** Vercel (`vercel.json` já configurado)

## Como rodar
1. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Supabase → Settings → API).
2. `npm install`
3. `npm run dev` → http://localhost:8080

No Windows/PowerShell, se aparecer "execução de scripts desabilitada", use `cmd /c "npm install"`.

## Banco de dados
O schema está em `supabase/schema.sql` e já foi aplicado no projeto Supabase via migração.
Tabelas: `profiles`, `itens_pedido`, `itens_pedido_log`, `produtos_ignorados`.

Regras principais:
- `cod_item` (do ERP) é a chave única; a importação **insere só itens novos** e nunca altera os existentes.
- As 6 colunas manuais (`sugestao_frete`, `status`, `transportador`, `motorista`, `frete_combinado`, `obs`) nunca são sobrescritas pela importação.
- Usuário comum não altera colunas automáticas do ERP (garantido por trigger no banco).
- Toda alteração manual gera registro em `itens_pedido_log`.

## Usuários
Novos usuários se cadastram na tela de login e entram como **Operador**. Um **Admin** promove o papel em "Usuários". O primeiro admin é definido diretamente na tabela `profiles` (role = `admin`).

## Estrutura
- `src/lib/api.ts` — toda a comunicação com o Supabase (camada de dados)
- `src/pages/Index.tsx` — tela principal
- `src/components/` — tabela, modais (importação, produtos ignorados, usuários, auditoria) e login
- `dados/` — planilhas de trabalho (ignorada pelo git)
