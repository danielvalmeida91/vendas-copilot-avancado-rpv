# 03: Carrinho de Compras com Destinação ('Para Mim' vs 'Para Presente') e Motor de Cupons

**GitHub Issue:** #4

**What to build:** Carrinho de compras interativo com suporte completo a linhas de produtos diferenciadas pelo modo de destinação ('Para Mim' ou 'Para Presente'). Garante a aplicação das regras de negócio de trava unitária para posse própria e liberdade de compras em quantidade para presentes. O carrinho também incorpora o motor de cupons promocionais para aplicação de descontos monetários ou percentuais com validações de validade, limite de uso e valor mínimo de pedido.

**Blocked by:** #3 (02: Catálogo de Produtos Digitais com Validação de Posse de Licença)

**Status:** ready-for-agent

- [ ] Clientes podem adicionar produtos na destinação 'Para Mim', restrito a no máximo 1 unidade por produto
- [ ] O sistema rejeita e notifica caso o usuário tente adicionar mais de 1 unidade de um item 'Para Mim' ou se já possuir posse prévia do produto digital
- [ ] Clientes podem adicionar produtos na destinação 'Para Presente' com seleção de quantidade arbitrária (>= 1)
- [ ] Carrinhos com composição mista (1 item 'Para Mim' + N itens 'Para Presente') ou exclusivamente de presentes são calculados corretamente
- [ ] O cliente pode aplicar um cupom de desconto válido e visualizar a redução percentual ou de valor fixo no total
- [ ] Cupons inválidos, expirados, esgotados ou com valor de pedido inferior ao mínimo estipulado exibem mensagens de erro claras
- [ ] Testes de integração na borda da aplicação cobrem todos os cenários de trava, alocação e cálculo de cupons
