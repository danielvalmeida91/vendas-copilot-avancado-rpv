# 01: Scaffolding da Aplicação, Baseline de Banco de Dados e Suíte de Testes

**GitHub Issue:** #2

**What to build:** Estrutura fundamental da aplicação full-stack em Next.js com TypeScript, Tailwind CSS, shadcn/ui e PostgreSQL. Entrega o ambiente executável, a conexão com o banco relacional para gerenciamento de dados de vendas, a infraestrutura inicial de testes de integração na borda da aplicação (Application Service Boundary) e um endpoint de verificação de integridade operacional (healthcheck).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A aplicação inicializa em modo desenvolvimento e produção sem erros
- [ ] O banco de dados PostgreSQL conecta com sucesso e suporta migrações de schema automatizadas
- [ ] A suíte de testes de integração automatizados executa na borda da aplicação contra banco de dados relacional e passa com sucesso
- [ ] Um endpoint de healthcheck responde com status 200 e confirmação de prontidão da aplicação e do banco de dados
