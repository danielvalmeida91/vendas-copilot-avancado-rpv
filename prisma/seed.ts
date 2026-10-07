import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const products = [
    {
      slug: 'curso-nextjs-avancado',
      name: 'Curso Next.js 15 e React Avançado',
      description:
        'Aprenda arquitetura de software moderna com Next.js App Router, Server Actions, TypeScript e Tailwind CSS. Acesso vitalício a todo o conteúdo gravado.',
      priceInCents: 29700,
      isActive: true,
      canPurchaseMultipleSelf: false,
    },
    {
      slug: 'ebook-arquitetura-software',
      name: 'E-book: Arquitetura de Software Prática',
      description:
        'Guia completo com padrões arquiteturais modernos, Domain-Driven Design, Ports & Adapters e casos de estudo reais.',
      priceInCents: 5990,
      isActive: true,
      canPurchaseMultipleSelf: false,
    },
    {
      slug: 'licenca-devtools-pro',
      name: 'Licença DevTools Pro (1 Ano)',
      description:
        'Conjunto de ferramentas essenciais para produtividade de desenvolvedores frontend e backend com integrações na nuvem.',
      priceInCents: 14900,
      isActive: true,
      canPurchaseMultipleSelf: false,
      accessDurationDays: 365,
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: prod,
      create: prod,
    });
  }

  // Seed default discount coupon
  const coupon = {
    code: 'BEMVINDO10',
    description: 'Cupom de boas-vindas com 10% de desconto',
    discountType: 'PERCENTAGE' as const,
    discountValue: 10,
    minOrderAmountCents: 5000,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2030-12-31'),
    isActive: true,
  };

  await prisma.coupon.upsert({
    where: { code: coupon.code },
    update: coupon,
    create: coupon,
  });

  console.log('✅ Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
