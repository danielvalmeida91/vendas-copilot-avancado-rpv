import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getVoucherByToken, claimGiftVoucher } from '@/services/gift-claim.service';
import crypto from 'crypto';

describe('Gift Voucher Claim & Anti-Double-Dipping Seam (Ticket 06 / Issue #7)', () => {
  let purchaserId: string;
  let beneficiaryId: string;
  let productId: string;
  let orderId: string;
  let orderItemId: string;
  let validToken: string;
  let alreadyRedeemedToken: string;

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
    const purchaser = await prisma.user.create({
      data: {
        name: 'Ana Compradora',
        email: 'ana.presente@example.com',
        cpf: '44455566677',
      },
    });
    purchaserId = purchaser.id;

    // Create beneficiary
    const beneficiary = await prisma.user.create({
      data: {
        name: 'Bruno Amigo',
        email: 'bruno.amigo@example.com',
        cpf: '55566677788',
      },
    });
    beneficiaryId = beneficiary.id;

    // Create product
    const product = await prisma.product.create({
      data: {
        slug: 'curso-typescript-pro',
        name: 'Curso TypeScript Pro',
        description: 'Curso avançado de tipagem estática.',
        priceInCents: 15000,
        isActive: true,
      },
    });
    productId = product.id;

    // Create paid order
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-GIFT-TEST-001',
        userId: purchaserId,
        status: 'PAID',
        paymentMethod: 'PIX',
        subtotalInCents: 15000,
        totalInCents: 15000,
        items: {
          create: {
            productId,
            quantity: 2,
            unitPriceInCents: 15000,
            totalPriceInCents: 30000,
            allocationMode: 'FOR_GIFT',
          },
        },
      },
      include: { items: true },
    });
    orderId = order.id;
    orderItemId = order.items[0].id;

    validToken = crypto.randomBytes(24).toString('hex');
    await prisma.giftVoucher.create({
      data: {
        token: validToken,
        orderItemId,
        purchaserUserId: purchaserId,
        productId,
        status: 'ISSUED',
        deliveryType: 'IMMEDIATE_LINK',
      },
    });

    alreadyRedeemedToken = crypto.randomBytes(24).toString('hex');
    await prisma.giftVoucher.create({
      data: {
        token: alreadyRedeemedToken,
        orderItemId,
        purchaserUserId: purchaserId,
        productId,
        status: 'REDEEMED',
        deliveryType: 'IMMEDIATE_LINK',
        redeemedAt: new Date(),
        recipientUserId: beneficiaryId,
      },
    });
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

  it('retrieves voucher information by token for public claim landing page', async () => {
    const details = await getVoucherByToken(validToken);

    expect(details.isValid).toBe(true);
    expect(details.canClaim).toBe(true);
    expect(details.voucher?.product.name).toBe('Curso TypeScript Pro');
    expect(details.voucher?.purchaserUser.name).toBe('Ana Compradora');
  });

  it('identifies already redeemed voucher and prevents re-claiming', async () => {
    const details = await getVoucherByToken(alreadyRedeemedToken);

    expect(details.isValid).toBe(true);
    expect(details.canClaim).toBe(false);
    expect(details.status).toBe('REDEEMED');
    expect(details.error?.toLowerCase()).toContain('resgatado');
  });

  it('claims voucher atomically and grants active license to beneficiary account', async () => {
    const claimResult = await claimGiftVoucher({
      token: validToken,
      beneficiary: {
        name: 'Carlos Beneficiario',
        email: 'carlos.beneficiario@example.com',
        cpf: '77788899900',
      },
    });

    expect(claimResult.success).toBe(true);
    expect(claimResult.licenseId).toBeDefined();

    // Verify voucher is now REDEEMED in DB
    const voucher = await prisma.giftVoucher.findUnique({
      where: { token: validToken },
    });
    expect(voucher?.status).toBe('REDEEMED');
    expect(voucher?.redeemedAt).not.toBeNull();
    expect(voucher?.recipientUserId).toBeDefined();

    // Verify license created for beneficiary
    const license = await prisma.license.findUnique({
      where: { id: claimResult.licenseId },
    });
    expect(license).not.toBeNull();
    expect(license?.status).toBe('ACTIVE');
    expect(license?.productId).toBe(productId);
    expect(license?.userId).toBe(voucher!.recipientUserId);
  });

  it('rejects subsequent claim on previously redeemed voucher', async () => {
    const secondClaim = await claimGiftVoucher({
      token: validToken,
      beneficiary: {
        name: 'Outro Usuario',
        email: 'outro@example.com',
        cpf: '99988877766',
      },
    });

    expect(secondClaim.success).toBe(false);
    expect(secondClaim.error?.toLowerCase()).toContain('resgatado');
  });
});
