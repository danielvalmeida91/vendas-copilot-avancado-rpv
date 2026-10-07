# 04: Guest Checkout Transparente com Criação de Conta em Background e Persistência do Pedido

**GitHub Issue:** #5

**What to build:** Formulário de checkout transparente de alta conversão para captura dos dados do comprador (nome, e-mail, CPF e dados de faturamento) sem exigir senha antecipada. Em segundo plano, o sistema associa o pedido ao usuário existente ou cria uma nova conta transparente vinculada ao e-mail/CPF, persistindo o pedido de venda com status PENDING e armazenando a destinação de cada item e os metadados de agendamento de presentes (quando aplicável).

**Blocked by:** #4 (03: Carrinho de Compras com Destinação ('Para Mim' vs 'Para Presente') e Motor de Cupons)

**Status:** ready-for-agent

- [ ] Compradores não logados conseguem preencher o checkout informando apenas nome, e-mail e CPF válidos
- [ ] O sistema localiza o usuário existente ou provisiona uma conta automaticamente em background sem interromper o fluxo
- [ ] O pedido de venda é criado no banco de dados com status PENDING, registrando itens, destinações ('Para Mim' ou 'Para Presente'), cupons aplicados e totais calculados
- [ ] Para itens com destinação 'Para Presente' onde o comprador selecionou agendamento por e-mail, os dados do destinatário (nome, e-mail e data/hora agendada) são salvos junto aos itens
- [ ] Testes de integração cobrem o fluxo de criação de pedido, resolução de usuário guest e consistência dos itens persistidos
