# 02: Catálogo de Produtos Digitais com Validação de Posse de Licença

**GitHub Issue:** #3

**What to build:** Exibição pública do catálogo de produtos digitais da loja e página individual de produto com apresentação de título, descrição detalhada, precificação pública e identificação visual de itens digitais. Quando um usuário autenticado acessa o catálogo ou a página do produto, o sistema avalia se ele já possui uma licença ativa e sinaliza de forma clara que o produto já pertence à sua conta.

**Blocked by:** #2 (01: Scaffolding da Aplicação, Baseline de Banco de Dados e Suíte de Testes)

**Status:** ready-for-agent

- [ ] Visitantes e clientes conseguem visualizar a lista pública de produtos digitais cadastrados com seus respectivos preços
- [ ] A página de detalhes de um produto digital exibe as informações completas, benefícios e valor comercial
- [ ] Para usuários logados que já possuem licença ativa do produto, a interface exibe aviso de produto já adquirido e desabilita a opção de compra para uso próprio
- [ ] Testes de integração cobrem a renderização e consulta de catálogo e a regra de detecção de licença ativa por usuário
