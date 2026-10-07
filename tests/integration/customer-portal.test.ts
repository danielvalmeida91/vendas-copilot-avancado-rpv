import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  getCustomerLicenses,
  getCustomerPurchasedGifts,
  updateScheduledGiftRecipient,
} from '@/services/customer-portal.service';
import crypto from 'crypto';

describe('Customer Portal & Gift Management Seam (Ticket 07 / Issue #8)', () => {
  let customer1Id: string;
  let customer2Id: string;
  let productId: string;
  let scheduledVoucherId: string;
  let redeemedVoucherId: string;

  beforeAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.webhookEvent.deleteMany();
    await prisma.giftVoucher.deleteMany();
    await prisma.license.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.couponUsage.deleteMany();
    await prisma.order.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // Create customers
    const c1 = await prisma.user.create({
      data: {
        name: 'Cliente Portal 1',
        email: 'cliente1.portal@example.com',
        cpf: '88877766655',
      },
    });
    customer1Id = c1.id;

    const c2 = await prisma.user.create({
      data: {
        name: 'Cliente Portal 2',
        email: 'cliente2.portal@example.com',
        cpf: '77766655544',
      },
    });
    customer2Id = c2.id;

    // Create product
    const prod = await prisma.product.create({
      data: {
        slug: 'curso-portal-test',
        name: 'Curso Portal Test',
        description: 'Curso para testes do painel',
        priceInCents: 10000,
        isActive: true,
      },
    });
    productId = prod.id;

    // Create paid order for c1
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-PORTAL-001',
        userId: customer1Id,
        status: 'PAID',
        paymentMethod: 'PIX',
        subtotalInCents: 30000,
        totalInCents: 30000,
        items: {
          create: [
            {
              productId,
              quantity: 1,
              unitPriceInCents: 10000,
              totalPriceInCents: 10000,
              allocationMode: 'FOR_SELF',
            },
            {
              productId,
              quantity: 2,
              unitPriceInCents: 10000,
              totalPriceInCents: 20000,
              allocationMode: 'FOR_GIFT',
            },
          ],
        },
      },
      include: { items: true },
    });

    // Create license for c1
    await prisma.license.create({
      data: {
        userId: customer1Id,
        productId,
        orderId: order.id,
        status: 'ACTIVE',
      },
    });

    const giftItem = order.items.find((i) => i.allocationMode === 'FOR_GIFT')!;

    // Create scheduled voucher for c1
    const v1 = await prisma.giftVoucher.create({
      data: {
        token: crypto.randomBytes(24).toString('hex'),
        orderItemId: giftItem.id,
        purchaserUserId: customer1Id,
        productId,
        status: 'SCHEDULED',
        deliveryType: 'SCHEDULED_EMAIL',
        recipientName: 'Amigo Original',
        recipientEmail: 'original@example.com',
        scheduledAt: new Date(Date.now() + 86400000 * 5),
      },
    });
    scheduledVoucherId = v1.id;

    // Create redeemed voucher for c1
    const v2 = await prisma.giftVoucher.create({
      data: {
        token: crypto.randomBytes(24).toString('hex'),
        orderItemId: giftItem.id,
        purchaserUserId: customer1Id,
        productId,
        status: 'REDEEMED',
        deliveryType: 'IMMEDIATE_LINK',
        redeemedAt: new Date(),
        recipientUserId: customer2Id,
      },
    });
    redeemedVoucherId = v2.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.webhookEvent.deleteMany();
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

  it('lists active products and licenses owned by the customer', async () => {
    const licenses = await getCustomerLicenses(customer1Id);
    expect(licenses).toHaveLength(1);
    expect(licenses[0].product.slug).toBe('curso-portal-test');
    expect(licenses[0].status).toBe('ACTIVE');
  });

  it('lists purchased gifts with their respective statuses', async () => {
    const gifts = await getCustomerPurchasedGifts(customer1Id);
    expect(gifts).toHaveLength(2);
    expect(gifts.some((g) => g.status === 'SCHEDULED')).toBe(true);
    expect(gifts.some((g) => g.status === 'REDEEMED')).toBe(true);
  });

  it('allows purchaser to update recipient and scheduled date on a SCHEDULED voucher', async () => {
    const newDate = new Date(Date.now() + 86400000 * 10);
    const result = await updateScheduledGiftRecipient({
      voucherId: scheduledVoucherId,
      purchaserUserId: customer1Id,
      recipientName: 'Amigo Atualizado',
      recipientEmail: 'novo.amigo@example.com',
      scheduledAt: newDate,
    });

    expect(result.success).toBe(true);
    expect(result.voucher?.recipientEmail).toBe('novo.amigo@example.com');
    expect(result.voucher?.recipientName).toBe('Amigo Atualizado');

    const updatedDb = await prisma.giftVoucher.findUnique({
      where: { id: scheduledVoucherId },
    });
    expect(updatedDb?.recipientEmail).toBe('novo.amigo@example.com');
  });

  it('forbids updating a voucher that belongs to another customer', async () => {
    const result = await updateScheduledGiftRecipient({
      voucherId: scheduledVoucherId,
      purchaserUserId: customer2Id, // customer2 did not purchase this
      recipientEmail: 'hacker@example.com',
      scheduledAt: new Date(),
    });

    expect(result.success).toBe(false);
    expect(result.error?.toLowerCase()).toContain('permissão');
  });

  it('forbids updating a voucher that is already REDEEMED', async () => {
    const result = await updateScheduledGiftRecipient({
      voucherId: redeemedVoucherId,
      purchaserUserId: customer1Id,
      recipientEmail: 'tentativa@example.com',
      scheduledAt: new Date(),
    });

    expect(result.success).toBe(false);
    expect(result.error?.toLowerCase()).toContain('resgatado');
  });
});
