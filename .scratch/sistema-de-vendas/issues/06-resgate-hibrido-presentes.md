# 06: Fluxo Híbrido de Resgate de Presentes (Token Seguro e Ativação na Conta)

**GitHub Issue:** #7

**What to build:** Mecanismo completo de geração de vouchers com tokens criptograficamente seguros e não enumeráveis para itens comprados como presente. Inclui a página pública de resgate do voucher onde o beneficiário visualiza quem o presenteou e o produto recebido, e realiza a ativação atômica na sua conta (existente ou recém-criada). O processo garante trava atômica estrita contra resgate duplo concorrente e invalidação após o uso.

**Blocked by:** #6 (05: Liquidação Financeira Instantânea (Pix/Cartão) e Webhook com HMAC e Idempotência)

**Status:** ready-for-agent

- [ ] Vouchers emitidos recebem tokens seguros, aleatórios e com URL amigável de resgate
- [ ] A página pública de resgate apresenta o produto concedido e mensagem do comprador
- [ ] O beneficiário consegue autenticar ou criar sua conta diretamente na tela de resgate
- [ ] O resgate vincula a licença de acesso definitiva à conta do beneficiário e marca o voucher como REDEEMED com data e hora
- [ ] Tentativas subsequentes ou concorrentes de resgatar o mesmo voucher são bloqueadas com erro amigável informando que o voucher já foi utilizado
- [ ] Testes de integração cobrem geração de token, visualização, ativação com sucesso e contenção de concorrência no resgate
