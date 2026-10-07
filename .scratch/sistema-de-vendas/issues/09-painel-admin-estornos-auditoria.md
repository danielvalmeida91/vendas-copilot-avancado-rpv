# 09: Painel Administrativo de Vendas, Fila de Atendimento de Estorno e Trilha de Auditoria

**GitHub Issue:** #10

**What to build:** Módulo de retaguarda administrativa para gestão operacional dos pedidos de venda. Permite aos operadores e administradores visualizar os pedidos, filtrar por status, inspecionar a destinação dos itens e verificar o status de resgate dos vouchers vinculados. Inclui o fluxo assistido de atendimento a solicitações de estorno/cancelamento (CDC 7 dias): o operador analisa se os vouchers foram resgatados/consumidos, executa a revogação de acessos e cancela vouchers não resgatados, gravando obrigatoriamente um registro detalhado na trilha de auditoria com operador, data e justificativa.

**Blocked by:** #6 (05: Liquidação Financeira Instantânea (Pix/Cartão) e Webhook com HMAC e Idempotência), #7 (06: Fluxo Híbrido de Resgate de Presentes (Token Seguro e Ativação na Conta))

**Status:** ready-for-agent

- [ ] Operadores autenticados conseguem listar pedidos de venda com filtros de status e busca por cliente/pedido
- [ ] A tela de detalhes do pedido exibe os itens, valores, meio de pagamento e a listagem de vouchers com status de resgate
- [ ] A interface alerta o operador caso algum voucher do pedido já tenha sido resgatado por terceiros antes da execução de um cancelamento
- [ ] A ação de estorno/cancelamento revoga as licenças do comprador, invalida vouchers pendentes e atualiza o pedido para CANCELLED/REFUNDED
- [ ] Cada ação administrativa gera um registro imutável na tabela de auditoria com identificação do operador, data/hora e justificativa textual
- [ ] Testes de integração cobrem a listagem administrativa, o fluxo assistido de estorno e a persistência na trilha de auditoria
