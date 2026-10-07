# Documento de Design e Especificação de Requisitos: Sistema de Vendas

Este documento consolida integralmente a arquitetura, as diretrizes de produto e as regras de negócio para o desenvolvimento do Sistema de Vendas de Produtos Digitais. O sistema foi planejado como uma plataforma de e-commerce moderna, com foco em alta conversão através de checkout transparente com criação de conta em segundo plano, suporte avançado à destinação de itens (compra para consumo próprio versus compra para presente com geração de vouchers e agendamento de envio), liquidação financeira instantânea via Pix e cartão com webhooks idempotentes, e um painel de retaguarda para controle de acessos, auditoria e gestão assistida de estornos.

---

## Terms

- **Pedido de Venda**: Documento formal com itens, cliente e condições comerciais acordadas para execução e faturamento.
  - *Evitar*: Carrinho, Orçamento.
- **Orçamento**: Proposta comercial preliminar com validade determinada, sem reserva garantida de estoque.
  - *Evitar*: Pedido, Cotação.
- **Reserva de Estoque**: Bloqueio temporário de saldo físico de um item enquanto a transação de pagamento é processada.
  - *Evitar*: Baixa definitiva, Bloqueio fiscal.
- **Produto Digital**: Item intangível (curso, e-book, software, licença, assinatura) entregue digitalmente, sem frete físico nem limite de inventário físico de armazém.
  - *Evitar*: Mercadoria física, SKU físico, Item estocável.
- **Licença / Acesso**: Direito individual de uso de um produto digital concedido a uma conta de usuário específica autenticada.
  - *Evitar*: Estoque, Remessa.
- **Voucher de Presente (Gift)**: Código ou convite transferível gerado na compra para ser resgatado por outro beneficiário em sua própria conta.
  - *Evitar*: Cupom de desconto, Transferência de titularidade.
- **Destinação do Item (Allocation Mode)**: Classificação da linha do pedido no carrinho definindo se a compra concede licença direta ao comprador (`Para Mim`) ou gera vouchers/convites distribuíveis (`Para Presente`).
  - *Evitar*: Tipo de produto, Frete.
- **Fila de Atendimento de Estorno**: Backlog operacional onde solicitações de estorno e cancelamento são analisadas por operadores humanos antes do bloqueio de acessos ou cancelamento financeiro.
  - *Evitar*: Estorno automático, Cancelamento direto.
- **Checkout Transparente**: Fluxo de pagamento onde o cliente insere os dados de cartão de crédito ou gera o código Pix diretamente na interface da loja, sem redirecionamento para telas externas de terceiros.
  - *Evitar*: Checkout redirecionado, Página externa de pagamento.
- **Idempotência de Pedido**: Garantia técnica de que requisições repetidas de criação de pedido ou confirmação de pagamento não gerem cobrança ou duplicidade de registros.
  - *Evitar*: Reenvio cego, Duplo clique sem trava.
- **Chave de Idempotência de Webhook**: Identificador único da transação fornecido pelo gateway gravado em banco para garantir que notificações repetidas não processem o pedido mais de uma vez.
  - *Evitar*: ID sequencial, Token temporário.
- **Fila de Tarefas Agendadas (Job Queue)**: Mecanismo para enfileirar e disparar e-mails de presentes na data e horário programados pelo comprador.
  - *Evitar*: Cron no cliente, Thread sleep.

---

## Why

Nas palavras e direcionamentos do negócio:
> "Neste repositório, eu estou querendo criar um sistema de vendas. Eu quero que você me ajude a fazer a consolidação de todo o cenário que eu vou precisar para poder realizar os levantamentos do que eu preciso, do que eu vou desenvolver e como serão as regras de negócio do meu sistema. Nossos produtos serão digitais e a gente vai ter a opção de fazer no seu cadastro a verificação se eu posso comprar mais de um ou se eu posso presentear também uma outra pessoa com esse produto. Neste primeiro momento, acredito que a gente vai utilizar um misto entre a resposta A e a B: pode ser que aconteça um cenário onde eu não tenha uma compra que seja utilizada para a pessoa que está logada no site e sim apenas para presentear."

O objetivo é fornecer um sistema de vendas digital de alto desempenho, eliminando atritos de compra e oferecendo um modelo flexível de aquisição e presentificação sem complicação operacional.

---

## Locked Decisions

As decisões estruturantes abaixo foram avaliadas, debatidas e aprovadas:

### 1. Modelo de Comercialização: B2C Direto / E-commerce (Q1)
- **Decisão**: Adoção do modelo de venda direta ao consumidor final (B2C) com precificação pública em catálogo, checkout transparente e liberação instantânea de conteúdo.
- **Opções Rejeitadas**:
  - *B2B / Venda Corporativa*: Rejeitado por envolver esteiras burocráticas de análise de crédito, orçamentos manuais e faturamento a prazo que não condizem com a velocidade de compra e consumo de produtos digitais no escopo atual.
  - *PDV / Balcão Físico*: Rejeitado porque produtos puramente digitais não exigem frente de caixa física, impressoras fiscais térmicas ou leitores de código de barras.
  - *Omnichannel*: Rejeitado por trazer complexidade excessiva de conciliação entre múltiplos canais para um MVP.

### 2. Natureza dos Produtos: 100% Digitais com Regras de Compra Múltipla (Q2)
- **Decisão**: Catálogo exclusivamente voltado a produtos digitais intangíveis (infoprodutos, cursos, e-books, acessos), sem frete físico e com validação de inventário baseada em regras lógicas de posse da conta.
- **Opções Rejeitadas**:
  - *Estoque Único Local Físico*: Rejeitado após constatação de que a venda é de conteúdo digital, tornando irrelevante controle de armazém físico.
  - *Multi-filial / Multi-depósito*: Rejeitado pelo mesmo motivo de intangibilidade dos produtos.
  - *Sob Encomenda com Lead Time de Fabricação*: Rejeitado porque a entrega do produto digital é imediata após a liquidação do pagamento.

### 3. Tratamento de Quantidade e Compras de Lote vs. Trava de Duplicidade (Q4)
- **Decisão**: Política mista: o produto possui uma regra de trava que impede a compra de mais de 1 licença para uso próprio pelo mesmo usuário logado (evitando que ele recompre acidentalmente o que já possui), mas permite que ele adquira livremente itens destinados para presente no mesmo ou em outro pedido.
- **Opções Rejeitadas**:
  - *Trava Global Inflexível*: Rejeitado porque impediria o usuário de comprar o mesmo produto para presentear múltiplos amigos, familiares ou colaboradores.
  - *Compra Livre Total sem Diferenciação*: Rejeitado porque causaria alta taxa de suporte devido a clientes comprando acidentalmente duas vezes o mesmo produto digital para si próprios.

### 4. Mecanismo de Resgate de Presentes: Híbrido (Link Imediato OU E-mail Agendado) (Q5)
- **Decisão**: O comprador que adquire um item para presente tem a liberdade de escolher entre: (a) Gerar um link de resgate seguro imediato (tokenizado) para enviar via WhatsApp/mensageiro; ou (b) Informar nome, e-mail e data/hora para disparo programado de e-mail de presente pelo sistema.
- **Opções Rejeitadas**:
  - *Apenas Link/Código*: Rejeitado pois perderia a conveniência de agendamentos em datas especiais (como aniversários).
  - *Apenas Indicação de E-mail Obrigatória no Checkout*: Rejeitado por elevar o atrito no checkout caso o comprador não saiba de imediato o e-mail formal do recebedor ou deseje entregar o presente pessoalmente por mensagem instantânea.

### 5. Modelagem do Carrinho: Linhas Separadas com Seletor de Destinação (Q7)
- **Decisão**: Cada produto no carrinho pode ser adicionado em linhas independentes com o seletor `Para Mim` (limitado a 1 unidade e com checagem de propriedade) ou `Para Presente` (com quantidade livre e campos opcionais de agendamento de destinatário). O comprador pode fechar um pedido exclusivamente composto por presentes, ou misto (1 para si + presentes).
- **Opções Rejeitadas**:
  - *Flag Global no Pedido*: Rejeitado por forçar o cliente a fazer duas compras separadas caso quisesse comprar algo para si e um presente para outra pessoa na mesma sessão.
  - *Pool de Vouchers Pós-Compra Genérico*: Rejeitado por exigir etapas extras de ativação para o próprio comprador após a compra.

### 6. Autenticação no Funil: Guest Checkout com Criação Transparente de Conta (Q10)
- **Decisão**: O cliente não é obrigado a passar por um formulário prévio de cadastro/login com senha antes de comprar. Ele informa e-mail, nome e CPF no checkout; em background, o sistema localiza a conta ou cria um usuário automaticamente, associando as licenças adquiridas e enviando um link seguro de acesso/definição de senha.
- **Opções Rejeitadas**:
  - *Login Obrigatório Prévio*: Rejeitado pelo impacto negativo comprovado na conversão de vendas e abandono de carrinho.
  - *Apenas Login Social*: Rejeitado por excluir clientes que não utilizam as contas sociais pré-configuradas ou que compram com dados corporativos/pessoais distintos.

### 7. Arquitetura da Aplicação: Next.js Full-Stack com TypeScript e PostgreSQL (Q13)
- **Decisão**: Next.js (App Router) com TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL e ORM (Prisma/Drizzle), unificando storefront, checkout, painel do cliente e área administrativa no mesmo repositório com validação de ponta a ponta via Zod.
- **Opções Rejeitadas**:
  - *Arquitetura Desacoplada SPA + API Dedicada*: Rejeitado pelo esforço duplicado de manutenção de repositórios, tipos e deploy para o escopo inicial.
  - *Monólito Python/Go com HTMX*: Rejeitado pela perda de agilidade de componentes de UI interativos de checkout e ecossistema de SDKs de gateways de pagamento modernos em TypeScript.

### 8. Resiliência e Segurança de Webhooks: Assinatura HMAC + Tabela de Idempotência (Q15)
- **Decisão**: Toda notificação de pagamento recebida do gateway é autenticada via verificação criptográfica de assinatura (HMAC secret). Os eventos são registrados em uma tabela `webhook_events` com chave de idempotência (`transaction_id` + `event_type`), executando a ativação de acessos e geração de vouchers dentro de uma transação atômica no banco de dados.
- **Opções Rejeitadas**:
  - *Consulta Ativa Básica*: Rejeitado pelo aumento de latência e consumo de rate limit na API do gateway.
  - *Processamento sem HMAC*: Rejeitado categoricamente pelo risco de injeção de transações falsas e fraudes financeiras.

---

## Routine Choices

- **Q3 (Liquidação Financeira Instantânea)**: Suporte a Pix e Cartão de Crédito integrados via gateway de pagamento com webhooks em tempo real, permitindo liberação de acesso em poucos segundos.
- **Q6 (Política de Estorno Manual)**: Solicitações de cancelamento ou arrependimento (CDC 7 dias) são encaminhadas para uma fila administrativa de atendimento, permitindo que operadores verifiquem o histórico de consumo e resgate antes da revogação manual.
- **Q8 (Validade de Vouchers de Presente)**: Os vouchers de presente não expiram automaticamente; o comprador tem acesso a uma aba "Meus Presentes Enviados" no painel, onde pode acompanhar o status de resgate, reenviar o link ou atualizar o e-mail do recebedor caso ainda não tenha sido ativado.
- **Q9 (Painel Administrativo com Auditoria)**: Interface administrativa com listagem completa de pedidos, detalhes dos vouchers emitidos, botão de ação direta para bloqueio de licença/voucher e log de auditoria registrando operador, data e justificativa.
- **Q11 (Motor de Cupons Promocionais)**: Implementação de cupons de desconto no checkout com regras de percentual (%) ou valor fixo (R$), data de validade, quantidade máxima de utilizações e valor mínimo de pedido.
- **Q12 (Emissão de Documentos Fiscais)**: Geração de relatórios e exportações estruturadas de vendas (CSV/JSON) para envio à contabilidade/software emissor em lote, postergando integrações síncronas de NFS-e para etapas futuras.
- **Q14 (Disparo Agendado de Presentes)**: Execução de rotina periódica simples via Cron consultando o banco de dados relacional para disparar e-mails com data programada através de provedor transacional confiável (ex: Resend).

---

## Verified Facts

- O repositório atual foi iniciado em estado limpo, proporcionando total liberdade arquitetural para adotar Next.js com App Router e tipagem estrita desde o primeiro commit.
- A natureza 100% digital dos produtos elimina a necessidade de tabelas de transportadoras, pesos, dimensões de embalagens, faixas de CEP de entrega e regras de split shipment.
- O inventário para bens digitais é estritamente lógico, focado na gestão de entidades `licenses` e `gift_vouchers` atreladas a `users`.

---

## Risks

1. **Tentativa de resgate duplo ou concorrente de vouchers**:
   - *Mitigação*: Restrição de unicidade no banco (`redeemed_at IS NULL`) e transação com lock atômico durante a vinculação do voucher à conta do recebedor.
2. **Estorno de pedido com voucher já resgatado e consumido por terceiro**:
   - *Mitigação*: A política de fila manual de atendimento (Q6 e Q9) garante que o operador veja se o terceiro já consumiu o conteúdo antes de efetuar o reembolso financeiro e bloquear o acesso de ambos.
3. **Falha de entregabilidade em e-mails agendados**:
   - *Mitigação*: Utilização de serviço transacional com reputação de IP estabelecida (Resend/SendGrid) e logs de entrega armazenados na entidade de agendamento de presentes.
4. **Duplicidade de ativação por retransmissão de webhooks**:
   - *Mitigação*: Proteção por chave de idempotência de transação gravada no banco de dados antes da execução da regra de concessão de acessos.

---

## Deferred

- **Emissão Automática Síncrona de NFS-e**: Diferida para a fase pós-validação comercial; no MVP, a conciliação será feita por relatórios contábeis periódicos.
- **Fila Distribuída com Redis/BullMQ**: Diferida até que a volumetria de envios de e-mails justifique a manutenção de nós de infraestrutura Redis dedicados.
- **Multi-filiais e Produtos Físicos**: Totalmente fora do escopo do produto digital atual.

---

## Open Threads

- Definição de eventuais faixas de bonificação ou desconto extra automático para pagamentos via Pix (ex: 5% cumulativo com cupons promocionais em campanhas sazonais).
- Possibilidade de futuras expansões para assinaturas recorrentes (SaaS / clubes de conteúdo) reaproveitando o mesmo motor de pagamentos e webhooks.
