# Sincronização de Banco de Dados (Supabase)

Este projeto utiliza **Drizzle ORM** para gerenciar o banco de dados PostgreSQL no Supabase.

## Scripts Disponíveis

### 1. `npm run db:push` (Desenvolvimento Rápido)
Sincroniza o banco de dados diretamente com as mudanças no arquivo `shared/schema.ts`.
*   **Quando usar:** Quando você está alterando o schema localmente e quer ver as mudanças imediatamente no banco sem criar arquivos de migração.
*   **Aviso:** Pode causar perda de dados se houver mudanças destrutivas (ex: deletar coluna).

### 2. `npm run db:generate` (Produção/Controle)
Gera arquivos de migração SQL baseados nas mudanças do schema.
*   **Quando usar:** Sempre que terminar uma alteração importante no schema que deve ser versionada.

### 3. `npm run db:migrate` (Aplicar Migrações)
Aplica os arquivos de migração gerados ao banco de dados Supabase.
*   **Quando usar:** Para atualizar o banco de dados em ambientes de produção ou teste de forma segura.

### 4. `npm run db:studio` (Visualização)
Abre o Drizzle Studio no navegador para visualizar e editar os dados do Supabase.

### 5. `npm run db:pull` (Engenharia Reversa)
Lê o estado atual do banco no Supabase e atualiza o schema local (se necessário).

---

## Como sincronizar agora?

Se você alterou o schema e quer apenas atualizar o Supabase rapidamente:
```bash
npm run db:push
```

Se quiser seguir o fluxo de migrações:
1. Gere a migração: `npm run db:generate`
2. Aplique a migração: `npm run db:migrate`
