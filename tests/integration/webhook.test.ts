import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { processPaymentWebhook, generateHmacSignature } from '@/services/payment-webhook.service';
import { generatePixCharge } from '@/lib/payment-gateway';

describe('Payment Liquidation & Idempotent Webhook Seam (Ticket 05 / Issue #6)', () => {
  let userId: string;
  let productSelfId: string;
  let productGiftId: string;
  let testOrderId: string;
  const webhookSecret = process.env.WEBHOOK_SECRET || 'super-secret-hmac-key-for-development-32chars';

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

    // Create user
    const user = await prisma.user.create({
      data: {
        name: 'Carlos Comprador',
        email: 'carlos.webhook@example.com',
        cpf: '33344455566',
      },
    });
    userId = user.id;

    // Create products
    const p1 = await prisma.product.create({
      data: {
        slug: 'curso-webhook-self',
        name: 'Curso Arquitetura Limpa',
        description: 'Curso para uso próprio',
        priceInCents: 12000,
        isActive: true,
      },
    });
    productSelfId = p1.id;

    const p2 = await prisma.product.create({
      data: {
        slug: 'ebook-webhook-gift',
        name: 'E-book Presente Especial',
        description: 'Ebook para presentear',
        priceInCents: 4000,
        isActive: true,
      },
    });
    productGiftId = p2.id;

    // Create a pending order with mixed items: 1 FOR_SELF + 2 FOR_GIFT
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-WH-TEST-001',
        userId,
        status: 'PENDING',
        paymentMethod: 'PIX',
        subtotalInCents: 20000, // 12000 + 2 * 4000
        totalInCents: 20000,
        items: {
          create: [
            {
              productId: productSelfId,
              quantity: 1,
              unitPriceInCents: 12000,
              totalPriceInCents: 12000,
              allocationMode: 'FOR_SELF',
            },
            {
              productId: productGiftId,
              quantity: 2,
              unitPriceInCents: 4000,
              totalPriceInCents: 8000,
              allocationMode: 'FOR_GIFT',
              giftDeliveryType: 'IMMEDIATE_LINK',
            },
          ],
        },
      },
    });
    testOrderId = order.id;
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

  it('generates Pix dynamic payload with valid QR code and copia-e-cola string', () => {
    const pix = generatePixCharge('ORD-WH-TEST-001', 20000);
    expect(pix.transactionId).toBeDefined();
    expect(pix.copiaECola).toContain('000201');
    expect(pix.qrCodeDataUrl).toContain('data:image');
  });

  it('rejects webhook payload with invalid HMAC signature', async () => {
    const payload = JSON.stringify({
      eventId: 'evt_test_invalid_sig',
      eventType: 'PAYMENT_CONFIRMED',
      transactionId: 'tx_fake_001',
      orderId: testOrderId,
      amountInCents: 20000,
    });

    const result = await processPaymentWebhook({
      rawBody: payload,
      signature: 'sha256=invalid_signature_hex',
    });

    expect(result.status).toBe(401);
    expect(result.success).toBe(false);
    expect(result.error).toContain('HMAC');
  });

  it('fulfills order atomically on valid PAYMENT_CONFIRMED webhook: activates license and issues gift vouchers', async () => {
    const payloadObj = {
      eventId: 'evt_test_valid_001',
      eventType: 'PAYMENT_CONFIRMED',
      transactionId: 'tx_gateway_success_123',
      orderId: testOrderId,
      amountInCents: 20000,
      paidAt: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(payloadObj);
    const signature = generateHmacSignature(rawBody, webhookSecret);

    const result = await processPaymentWebhook({
      rawBody,
      signature,
    });

    expect(result.status).toBe(200);
    expect(result.success).toBe(true);

    // Verify order status transitioned to PAID
    const updatedOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
    });
    expect(updatedOrder?.status).toBe('PAID');
    expect(updatedOrder?.gatewayTransactionId).toBe('tx_gateway_success_123');
    expect(updatedOrder?.paidAt).not.toBeNull();

    // Verify user received 1 active license for FOR_SELF item
    const licenses = await prisma.license.findMany({
      where: { orderId: testOrderId },
    });
    expect(licenses).toHaveLength(1);
    expect(licenses[0].productId).toBe(productSelfId);
    expect(licenses[0].userId).toBe(userId);
    expect(licenses[0].status).toBe('ACTIVE');

    // Verify 2 GiftVouchers were created for FOR_GIFT item with non-enumerable tokens
    const vouchers = await prisma.giftVoucher.findMany({
      where: { purchaserUserId: userId },
    });
    expect(vouchers).toHaveLength(2);
    expect(vouchers[0].token).toHaveLength(48); // 24 bytes hex
    expect(vouchers[1].token).toHaveLength(48);
    expect(vouchers[0].token).not.toBe(vouchers[1].token);
    expect(vouchers[0].status).toBe('ISSUED');
  });

  it('handles duplicate webhook notifications idempotently without duplicating licenses or vouchers', async () => {
    const payloadObj = {
      eventId: 'evt_test_valid_001', // Same eventId as previous test
      eventType: 'PAYMENT_CONFIRMED',
      transactionId: 'tx_gateway_success_123',
      orderId: testOrderId,
      amountInCents: 20000,
      paidAt: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(payloadObj);
    const signature = generateHmacSignature(rawBody, webhookSecret);

    const result = await processPaymentWebhook({
      rawBody,
      signature,
    });

    expect(result.status).toBe(200);
    expect(result.alreadyProcessed).toBe(true);

    // Verify licenses and vouchers counts are unchanged
    const licensesCount = await prisma.license.count({
      where: { orderId: testOrderId },
    });
    expect(licensesCount).toBe(1);

    const vouchersCount = await prisma.giftVoucher.count({
      where: { purchaserUserId: userId },
    });
    expect(vouchersCount).toBe(2);
  });

  it('allows identifying order by orderNumber string (e.g. ORD-...) in webhook payload', async () => {
    // Create another pending order
    const order2 = await prisma.order.create({
      data: {
        orderNumber: 'ORD-WH-TEST-BY-NUMBER',
        userId,
        status: 'PENDING',
        paymentMethod: 'PIX',
        subtotalInCents: 12000,
        totalInCents: 12000,
        items: {
          create: {
            productId: productSelfId,
            quantity: 1,
            unitPriceInCents: 12000,
            totalPriceInCents: 12000,
            allocationMode: 'FOR_SELF',
          },
        },
      },
    });

    const payloadObj = {
      eventId: 'evt_test_by_number_001',
      eventType: 'PAYMENT_CONFIRMED',
      transactionId: 'tx_number_123',
      orderId: 'ORD-WH-TEST-BY-NUMBER',
      amountInCents: 12000,
    };
    const rawBody = JSON.stringify(payloadObj);
    const signature = generateHmacSignature(rawBody, webhookSecret);

    const result = await processPaymentWebhook({
      rawBody,
      signature,
    });

    expect(result.status).toBe(200);
    expect(result.success).toBe(true);

    const updated = await prisma.order.findUnique({
      where: { id: order2.id },
    });
    expect(updated?.status).toBe('PAID');
  });
});
