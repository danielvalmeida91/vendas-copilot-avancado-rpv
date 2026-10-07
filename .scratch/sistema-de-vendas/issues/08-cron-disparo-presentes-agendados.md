# 08: Rotina Periódica (Cron) de Disparo de E-mails para Presentes Agendados

**GitHub Issue:** #9

**What to build:** Rotina assíncrona executada periodicamente (via cron/endpoint seguro agendado) que consulta o banco de dados relacional em busca de vouchers no estado SCHEDULED cuja data de envio programada tenha sido atingida. Para cada registro elegível, dispara um e-mail transacional formatado ao destinatário contendo o nome do comprador, o produto presenteado e o link seguro de resgate, atualizando o status do voucher para ISSUED com registro de timestamp de despacho.

**Blocked by:** #7 (06: Fluxo Híbrido de Resgate de Presentes (Token Seguro e Ativação na Conta))

**Status:** ready-for-agent

- [ ] A rotina identifica com precisão os vouchers agendados com send_scheduled_at <= NOW() e status SCHEDULED
- [ ] Vouchers com datas futuras não são selecionados nem disparados prematuramente
- [ ] O e-mail transacional é despachado via provedor de e-mail com template customizado e link de resgate
- [ ] Após o envio bem-sucedido, o voucher é atualizado para status ISSUED e a data de envio real é gravada
- [ ] Falhas transitórias no envio de e-mail são registradas em log de erro sem corromper o estado do voucher, permitindo nova tentativa segura
- [ ] Testes de integração na borda da aplicação validam a seleção temporal, idempotência do processamento e despacho de e-mails mockados
