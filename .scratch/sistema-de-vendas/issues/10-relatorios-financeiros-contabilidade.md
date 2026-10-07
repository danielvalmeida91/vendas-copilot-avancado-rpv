# 10: Relatórios Financeiros e Exportação Consolidada de Vendas para Contabilidade

**GitHub Issue:** #11

**What to build:** Funcionalidade de geração e exportação de relatórios financeiros consolidados de vendas liquidadas para atendimento contábil e fiscal. Permite ao gestor financeiro selecionar um período (diário, semanal ou mensal) e extrair os dados em formatos estruturados (CSV e JSON) contendo dados do cliente (nome, CPF), identificador da transação, valor bruto, descontos aplicados, tributos estimados e status do pedido para emissão fiscal em lote.

**Blocked by:** #6 (05: Liquidação Financeira Instantânea (Pix/Cartão) e Webhook com HMAC e Idempotência)

**Status:** ready-for-agent

- [ ] Administradores conseguem filtrar vendas liquidadas (status PAID) por intervalo de datas
- [ ] A exportação gera arquivo CSV e JSON contendo cabeçalhos e campos fiscais padronizados (data, ID do pedido, cliente, CPF, itens, valor bruto, desconto, valor líquido e meio de pagamento)
- [ ] Vendas canceladas ou estornadas são identificadas claramente na exportação para conciliação contábil correta
- [ ] Testes de integração na borda da aplicação validam a precisão dos cálculos e a conformidade dos dados exportados
