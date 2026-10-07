import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { processCheckout } from '@/services/checkout.service';

describe('Guest Checkout & Order Persistence Seam (Ticket 04 / Issue #5)', () => {
  let product1Id: string;
  let product2Id: string;
  let existingUserEmail = 'existing.customer@example.com';
  let existingUserCpf = '12345678901';
  let existingUserId: string;

  beforeAll(async () => {
    await prisma.giftVoucher.deleteMany();
    await prisma.license.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.couponUsage.deleteMany();
    await prisma.order.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // Create existing user
    const user = await prisma.user.create({
      data: {
        name: 'Cliente Antigo',
        email: existingUserEmail,
        cpf: existingUserCpf,
      },
    });
    existingUserId = user.id;

    // Create products
    const p1 = await prisma.product.create({
      data: {
        slug: 'curso-checkout-1',
        name: 'Curso Full-Stack Checkout',
        description: 'Curso completo',
        priceInCents: 15000, // R$ 150,00
        isActive: true,
      },
    });
    product1Id = p1.id;

    const p2 = await prisma.product.create({
      data: {
        slug: 'ebook-checkout-2',
        name: 'E-book Microsserviços',
        description: 'Ebook prático',
        priceInCents: 6000, // R$ 60,00
        isActive: true,
      },
    });
    product2Id = p2.id;
  });

  afterAll(async () => {
    await prisma.giftVoucher.deleteMany();
    await prisma.license.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.couponUsage.deleteMany();
    await prisma.order.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('creates a new guest user automatically in background and persists order with PENDING status', async () => {
    const scheduledDate = new Date(Date.now() + 86400000 * 7); // 7 days ahead

    const result = await processCheckout({
      customer: {
        name: 'Novo Comprador Guest',
        email: 'novo.guest@example.com',
        cpf: '98765432100',
      },
      paymentMethod: 'PIX',
      items: [
        {
          productId: product1Id,
          allocationMode: 'FOR_SELF',
          quantity: 1,
        },
        {
          productId: product2Id,
          allocationMode: 'FOR_GIFT',
          quantity: 2,
          giftDeliveryType: 'SCHEDULED_EMAIL',
          recipientName: 'Amigo Presenteado',
          recipientEmail: 'amigo@example.com',
          giftScheduledAt: scheduledDate,
          giftMessage: 'Parabéns pelo seu dia!',
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.order).toBeDefined();
    expect(result.order?.status).toBe('PENDING');
    expect(result.order?.paymentMethod).toBe('PIX');
    expect(result.order?.subtotalInCents).toBe(27000); // 15000 + 2 * 6000
    expect(result.order?.totalInCents).toBe(27000);

    // Verify user was created in DB
    const createdUser = await prisma.user.findUnique({
      where: { email: 'novo.guest@example.com' },
    });
    expect(createdUser).not.toBeNull();
    expect(createdUser?.cpf).toBe('98765432100');
    expect(createdUser?.passwordHash).toBeNull(); // Guest account created in background

    // Verify order items in DB
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: result.order!.id },
      orderBy: { allocationMode: 'asc' },
    });
    expect(orderItems).toHaveLength(2);

    const giftItem = orderItems.find((i) => i.allocationMode === 'FOR_GIFT');
    expect(giftItem).toBeDefined();
    expect(giftItem?.recipientName).toBe('Amigo Presenteado');
    expect(giftItem?.recipientEmail).toBe('amigo@example.com');
    expect(giftItem?.giftDeliveryType).toBe('SCHEDULED_EMAIL');
    expect(giftItem?.quantity).toBe(2);
  });

  it('links order to existing user when email already matches without creating duplicate user', async () => {
    const result = await processCheckout({
      customer: {
        name: 'Cliente Antigo',
        email: existingUserEmail,
        cpf: existingUserCpf,
      },
      paymentMethod: 'CREDIT_CARD',
      items: [
        {
          productId: product2Id,
          allocationMode: 'FOR_SELF',
          quantity: 1,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.order?.userId).toBe(existingUserId);

    // Verify no duplicate users with same email
    const usersCount = await prisma.user.count({
      where: { email: existingUserEmail },
    });
    expect(usersCount).toBe(1);
  });

  it('rejects checkout with clear validation error if CPF or email is invalid', async () => {
    const result = await processCheckout({
      customer: {
        name: 'Teste Inválido',
        email: 'email-invalido',
        cpf: '123',
      },
      paymentMethod: 'PIX',
      items: [
        {
          productId: product1Id,
          allocationMode: 'FOR_SELF',
          quantity: 1,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});
