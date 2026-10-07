# 05: Liquidação Financeira Instantânea (Pix/Cartão) e Webhook com HMAC e Idempotência

**GitHub Issue:** #6

**What to build:** Integração de pagamento com Pix (QR Code dinâmico e código copia-e-cola) e Cartão de Crédito via checkout transparente com gateway de pagamento. Implementação do endpoint de recepção de webhooks de status de pagamento com verificação rigorosa de assinatura HMAC e controle de idempotência por tabela de eventos. Após a confirmação do pagamento, executa transação atômica que transiciona o pedido para PAID, gera a licença do comprador (para itens 'Para Mim') e emite os registros de vouchers de presente (para itens 'Para Presente').

**Blocked by:** #5 (04: Guest Checkout Transparente com Criação de Conta em Background e Persistência do Pedido)

**Status:** ready-for-agent

- [ ] Cobranças via Pix geram payload com QR Code dinâmico e código copia-e-cola válidos
- [ ] Cobranças via Cartão de Crédito processam a transação de forma síncrona ou assíncrona com tratamento adequado de aprovação/recusa
- [ ] O endpoint de webhook valida a assinatura HMAC do payload e rejeita notificações não autenticadas com HTTP 401
- [ ] Notificações repetidas do mesmo evento utilizam a chave de idempotência para responder com sucesso sem duplicar concessões de acesso ou vouchers
- [ ] A confirmação de pagamento executa uma transação de banco de dados atômica: marca o pedido como PAID, concede a licença do usuário comprador para itens 'Para Mim' e cria os vouchers para itens 'Para Presente'
- [ ] Testes de integração na borda da aplicação cobrem validação de HMAC, idempotência em requisições duplicadas e atomicidade da concessão de licenças/vouchers
