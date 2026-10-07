import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { dispatchDueScheduledGifts } from '@/services/scheduled-dispatch.service';
import { EmailServicePort, SendGiftEmailParams } from '@/lib/email-service';
import crypto from 'crypto';

class MockEmailService implements EmailServicePort {
  public sentEmails: SendGiftEmailParams[] = [];
  public shouldFailForEmail: string | null = null;

  async sendGiftEmail(params: SendGiftEmailParams) {
    if (this.shouldFailForEmail === params.recipientEmail) {
      return { success: false, error: 'Simulated SMTP connection timeout' };
    }
    this.sentEmails.push(params);
    return { success: true, messageId: `msg_${Date.now()}` };
  }
}

describe('Scheduled Gift Dispatcher Cron Seam (Ticket 08 / Issue #9)', () => {
  let purchaserId: string;
  let productId: string;
  let orderItemId: string;
  let dueVoucherId: string;
  let futureVoucherId: string;
  let failingVoucherId: string;

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

    // Create purchaser
    const user = await prisma.user.create({
      data: {
        name: 'Roberto Doador',
        email: 'roberto.cron@example.com',
        cpf: '99911122233',
      },
    });
    purchaserId = user.id;

    // Create product
    const prod = await prisma.product.create({
      data: {
        slug: 'curso-cron-dispatch',
        name: 'Curso Inteligência Artificial',
        description: 'Curso avançado',
        priceInCents: 20000,
        isActive: true,
      },
    });
    productId = prod.id;

    // Create paid order
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-CRON-001',
        userId: purchaserId,
        status: 'PAID',
        paymentMethod: 'PIX',
        subtotalInCents: 60000,
        totalInCents: 60000,
        items: {
          create: {
            productId,
            quantity: 3,
            unitPriceInCents: 20000,
            totalPriceInCents: 60000,
            allocationMode: 'FOR_GIFT',
            giftDeliveryType: 'SCHEDULED_EMAIL',
          },
        },
      },
      include: { items: true },
    });
    orderItemId = order.items[0].id;

    // 1. Voucher DUE for dispatch (scheduled in the past)
    const v1 = await prisma.giftVoucher.create({
      data: {
        token: crypto.randomBytes(24).toString('hex'),
        orderItemId,
        purchaserUserId: purchaserId,
        productId,
        status: 'SCHEDULED',
        deliveryType: 'SCHEDULED_EMAIL',
        recipientName: 'Amigo Aniversariante',
        recipientEmail: 'aniversariante@example.com',
        scheduledAt: new Date(Date.now() - 3600000), // 1 hour ago
        giftMessage: 'Feliz Aniversário!',
      },
    });
    dueVoucherId = v1.id;

    // 2. Voucher for FUTURE date (must NOT be dispatched)
    const v2 = await prisma.giftVoucher.create({
      data: {
        token: crypto.randomBytes(24).toString('hex'),
        orderItemId,
        purchaserUserId: purchaserId,
        productId,
        status: 'SCHEDULED',
        deliveryType: 'SCHEDULED_EMAIL',
        recipientName: 'Amigo Natal',
        recipientEmail: 'natal@example.com',
        scheduledAt: new Date(Date.now() + 86400000 * 30), // 30 days ahead
      },
    });
    futureVoucherId = v2.id;

    // 3. Voucher that will encounter SMTP failure
    const v3 = await prisma.giftVoucher.create({
      data: {
        token: crypto.randomBytes(24).toString('hex'),
        orderItemId,
        purchaserUserId: purchaserId,
        productId,
        status: 'SCHEDULED',
        deliveryType: 'SCHEDULED_EMAIL',
        recipientName: 'Amigo Falha',
        recipientEmail: 'falha@example.com',
        scheduledAt: new Date(Date.now() - 7200000), // 2 hours ago
      },
    });
    failingVoucherId = v3.id;
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

  it('selects and dispatches due scheduled vouchers while leaving future vouchers untouched', async () => {
    const mockEmail = new MockEmailService();
    mockEmail.shouldFailForEmail = 'falha@example.com';

    const result = await dispatchDueScheduledGifts({
      now: new Date(),
      emailService: mockEmail,
      baseUrl: 'http://localhost:3000',
    });

    expect(result.processed).toBe(2); // dueVoucher and failingVoucher
    expect(result.dispatched).toBe(1);
    expect(result.failed).toBe(1);

    // Verify successful email delivery
    expect(mockEmail.sentEmails).toHaveLength(1);
    expect(mockEmail.sentEmails[0].recipientEmail).toBe('aniversariante@example.com');
    expect(mockEmail.sentEmails[0].productName).toBe('Curso Inteligência Artificial');
    expect(mockEmail.sentEmails[0].claimUrl).toContain('/resgatar/');

    // Verify due voucher status transitioned to ISSUED with dispatchedAt timestamp
    const dispatchedVoucher = await prisma.giftVoucher.findUnique({
      where: { id: dueVoucherId },
    });
    expect(dispatchedVoucher?.status).toBe('ISSUED');
    expect(dispatchedVoucher?.dispatchedAt).not.toBeNull();

    // Verify future voucher remains SCHEDULED and untouched
    const futureVoucher = await prisma.giftVoucher.findUnique({
      where: { id: futureVoucherId },
    });
    expect(futureVoucher?.status).toBe('SCHEDULED');
    expect(futureVoucher?.dispatchedAt).toBeNull();

    // Verify failed voucher remains SCHEDULED for retry
    const failedVoucher = await prisma.giftVoucher.findUnique({
      where: { id: failingVoucherId },
    });
    expect(failedVoucher?.status).toBe('SCHEDULED');
    expect(failedVoucher?.dispatchedAt).toBeNull();
  });
});
