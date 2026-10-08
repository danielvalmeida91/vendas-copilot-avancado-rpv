import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  listCatalogProducts,
  getProductBySlug,
  checkUserProductOwnership,
} from '@/services/catalog.service';

describe('Catalog & License Ownership Seam (Ticket 02 / Issue #3)', () => {
  let testUserId: string;
  let ownedProductId: string;
  let unownedProductId: string;

  beforeAll(async () => {
    // Clean up test data in correct foreign key order
    await prisma.giftVoucher.deleteMany();
    await prisma.license.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.couponUsage.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // Create a test user
    const user = await prisma.user.create({
      data: {
        name: 'Cliente Teste Catálogo',
        email: 'cliente.catalogo@test.com',
        cpf: '11122233344',
      },
    });
    testUserId = user.id;

    // Create products
    const prod1 = await prisma.product.create({
      data: {
        slug: 'curso-nextjs-avancado',
        name: 'Curso Next.js Avançado',
        description: 'Domine Next.js com App Router, Server Actions e TypeScript.',
        priceInCents: 19900,
        isActive: true,
      },
    });
    ownedProductId = prod1.id;

    const prod2 = await prisma.product.create({
      data: {
        slug: 'ebook-padroes-projeto',
        name: 'E-book Padrões de Projeto',
        description: 'Guia completo de arquitetura limpa e microsserviços.',
        priceInCents: 4900,
        isActive: true,
      },
    });
    unownedProductId = prod2.id;

    // Create an inactive product to test filtering
    await prisma.product.create({
      data: {
        slug: 'produto-desativado',
        name: 'Produto Desativado',
        description: 'Não deve aparecer no catálogo.',
        priceInCents: 9900,
        isActive: false,
      },
    });

    // Create an active license for ownedProductId
    const dummyOrder = await prisma.order.create({
      data: {
        orderNumber: 'ORD-TEST-CAT-001',
        userId: testUserId,
        status: 'PAID',
        paymentMethod: 'PIX',
        subtotalInCents: 19900,
        totalInCents: 19900,
      },
    });

    await prisma.license.create({
      data: {
        userId: testUserId,
        productId: ownedProductId,
        orderId: dummyOrder.id,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await prisma.giftVoucher.deleteMany();
    await prisma.license.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.couponUsage.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('lists only active products for public visitors', async () => {
    const products = await listCatalogProducts();
    expect(products.length).toBe(2);
    expect(products.some((p) => p.slug === 'curso-nextjs-avancado')).toBe(true);
    expect(products.some((p) => p.slug === 'ebook-padroes-projeto')).toBe(true);
    expect(products.some((p) => p.slug === 'produto-desativado')).toBe(false);
  });

  it('detects active license ownership when user is logged in', async () => {
    const products = await listCatalogProducts({ userId: testUserId });
    const owned = products.find((p) => p.slug === 'curso-nextjs-avancado');
    const unowned = products.find((p) => p.slug === 'ebook-padroes-projeto');

    expect(owned?.hasActiveLicense).toBe(true);
    expect(owned?.canPurchaseForSelf).toBe(false);

    expect(unowned?.hasActiveLicense).toBe(false);
    expect(unowned?.canPurchaseForSelf).toBe(true);
  });

  it('retrieves detailed product by slug with license ownership status', async () => {
    const productDetail = await getProductBySlug('curso-nextjs-avancado', { userId: testUserId });
    expect(productDetail).not.toBeNull();
    expect(productDetail?.name).toBe('Curso Next.js Avançado');
    expect(productDetail?.hasActiveLicense).toBe(true);
    expect(productDetail?.canPurchaseForSelf).toBe(false);

    const unownedDetail = await getProductBySlug('ebook-padroes-projeto', { userId: testUserId });
    expect(unownedDetail).not.toBeNull();
    expect(unownedDetail?.hasActiveLicense).toBe(false);
    expect(unownedDetail?.canPurchaseForSelf).toBe(true);
  });

  it('returns false for checkUserProductOwnership when user has no active license or revoked license', async () => {
    const hasLicense = await checkUserProductOwnership(testUserId, unownedProductId);
    expect(hasLicense).toBe(false);
  });
});
