# 07: Painel do Cliente para Gestão de Licenças e Acompanhamento de Vouchers de Presente

**GitHub Issue:** #8

**What to build:** Área logada do cliente que comprou produtos no sistema. O painel apresenta duas seções centrais: 'Meus Produtos', onde o usuário acessa as licenças ativas adquiridas para si mesmo, e 'Meus Presentes Enviados', onde o comprador visualiza a lista de todos os vouchers de presente adquiridos. Na seção de presentes, o comprador acompanha o status de cada voucher (pendente de envio, aguardando resgate ou resgatado), copia o link seguro para reenvio e pode atualizar o e-mail e data programada de presentes ainda não disparados.

**Blocked by:** #7 (06: Fluxo Híbrido de Resgate de Presentes (Token Seguro e Ativação na Conta))

**Status:** ready-for-agent

- [ ] O cliente autenticado visualiza seus produtos digitais adquiridos para uso próprio
- [ ] O cliente acessa a listagem de vouchers de presente comprados, identificando claramente o produto, data e status de resgate
- [ ] Para vouchers não resgatados de link imediato, o cliente conta com botão de cópia rápida do link de resgate
- [ ] Para vouchers agendados ainda não enviados, o cliente pode editar o e-mail do destinatário e a data programada de envio
- [ ] Vouchers já resgatados exibem a data do resgate e não permitem mais alteração de destinatário
- [ ] Testes de integração cobrem a listagem, regras de permissão de acesso aos dados e operações de atualização de presentes pelo comprador
