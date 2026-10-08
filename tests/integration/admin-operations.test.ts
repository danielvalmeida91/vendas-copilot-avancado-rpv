import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  listAdminOrders,
  getAdminOrderDetail,
  processAssistedRefund,
  getAuditLogs,
} from '@/services/admin-operations.service';
import crypto from 'crypto';

describe('Admin Operations, Assisted Refund & Audit Trail Seam (Ticket 09 / Issue #10)', () => {
  let operatorId: string;
  let customerId: string;
  let beneficiaryId: string;
  let productId: string;
  let paidOrderId: string;
  let orderWithClaimedVoucherId: string;

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

    // Create operator user
    const operator = await prisma.user.create({
      data: {
        name: 'Operador Suporte',
        email: 'operador@empresa.com',
        cpf: '00011122233',
        role: 'OPERATOR',
      },
    });
    operatorId = operator.id;

    // Create customer
    const customer = await prisma.user.create({
      data: {
        name: 'Cliente Reclamante',
        email: 'reclamante@example.com',
        cpf: '11133355577',
      },
    });
    customerId = customer.id;

    // Create beneficiary
    const beneficiary = await prisma.user.create({
      data: {
        name: 'Amigo Beneficiario',
        email: 'beneficiario@example.com',
        cpf: '22244466688',
      },
    });
    beneficiaryId = beneficiary.id;

    // Create product
    const prod = await prisma.product.create({
      data: {
        slug: 'curso-admin-test',
        name: 'Curso Gestão & Operações',
        description: 'Curso completo',
        priceInCents: 25000,
        isActive: true,
      },
    });
    productId = prod.id;

    // 1. Order to be refunded (1 self license + 1 unredeemed voucher)
    const o1 = await prisma.order.create({
      data: {
        orderNumber: 'ORD-ADM-REFUND-01',
        userId: customerId,
        status: 'PAID',
        paymentMethod: 'PIX',
        subtotalInCents: 50000,
        totalInCents: 50000,
        items: {
          create: [
            {
              productId,
              quantity: 1,
              unitPriceInCents: 25000,
              totalPriceInCents: 25000,
              allocationMode: 'FOR_SELF',
            },
            {
              productId,
              quantity: 1,
              unitPriceInCents: 25000,
              totalPriceInCents: 25000,
              allocationMode: 'FOR_GIFT',
            },
          ],
        },
      },
      include: { items: true },
    });
    paidOrderId = o1.id;

    // Create purchaser license
    await prisma.license.create({
      data: {
        userId: customerId,
        productId,
        orderId: o1.id,
        status: 'ACTIVE',
      },
    });

    // Create unredeemed voucher
    const giftItem1 = o1.items.find((i) => i.allocationMode === 'FOR_GIFT')!;
    await prisma.giftVoucher.create({
      data: {
        token: crypto.randomBytes(24).toString('hex'),
        orderItemId: giftItem1.id,
        purchaserUserId: customerId,
        productId,
        status: 'ISSUED',
        deliveryType: 'IMMEDIATE_LINK',
      },
    });

    // 2. Order where voucher was ALREADY REDEEMED by third party
    const o2 = await prisma.order.create({
      data: {
        orderNumber: 'ORD-ADM-CLAIMED-02',
        userId: customerId,
        status: 'PAID',
        paymentMethod: 'CREDIT_CARD',
        subtotalInCents: 25000,
        totalInCents: 25000,
        items: {
          create: {
            productId,
            quantity: 1,
            unitPriceInCents: 25000,
            totalPriceInCents: 25000,
            allocationMode: 'FOR_GIFT',
          },
        },
      },
      include: { items: true },
    });
    orderWithClaimedVoucherId = o2.id;

    const giftItem2 = o2.items[0];
    const claimedVoucher = await prisma.giftVoucher.create({
      data: {
        token: crypto.randomBytes(24).toString('hex'),
        orderItemId: giftItem2.id,
        purchaserUserId: customerId,
        recipientUserId: beneficiaryId,
        productId,
        status: 'REDEEMED',
        deliveryType: 'IMMEDIATE_LINK',
        redeemedAt: new Date(),
      },
    });

    await prisma.license.create({
      data: {
        userId: beneficiaryId,
        productId,
        orderId: o2.id,
        giftVoucherId: claimedVoucher.id,
        status: 'ACTIVE',
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

  it('lists admin orders and allows filtering by status and searching by customer/order', async () => {
    const allOrders = await listAdminOrders();
    expect(allOrders.length).toBeGreaterThanOrEqual(2);

    const filtered = await listAdminOrders({ status: 'PAID', search: 'Reclamante' });
    expect(filtered.length).toBeGreaterThanOrEqual(2);
    expect(filtered.every((o) => o.status === 'PAID')).toBe(true);
  });

  it('detects and warns if any gift voucher was already redeemed in order details', async () => {
    const detailWithoutClaim = await getAdminOrderDetail(paidOrderId);
    expect(detailWithoutClaim?.hasRedeemedVouchers).toBe(false);

    const detailWithClaim = await getAdminOrderDetail(orderWithClaimedVoucherId);
    expect(detailWithClaim?.hasRedeemedVouchers).toBe(true);
    expect(detailWithClaim?.items[0].giftVouchers[0].status).toBe('REDEEMED');
  });

  it('executes assisted refund: revokes licenses and vouchers and writes to immutable audit trail', async () => {
    const refundResult = await processAssistedRefund({
      orderId: paidOrderId,
      operatorUserId: operatorId,
      reason: 'Solicitação de cancelamento pelo cliente dentro do prazo legal CDC 7 dias.',
      ipAddress: '192.168.1.100',
    });

    expect(refundResult.success).toBe(true);
    expect(refundResult.auditLogId).toBeDefined();

    // Verify order transitioned to REFUNDED
    const refundedOrder = await prisma.order.findUnique({
      where: { id: paidOrderId },
    });
    expect(refundedOrder?.status).toBe('REFUNDED');
    expect(refundedOrder?.cancelledAt).not.toBeNull();

    // Verify purchaser's license was REVOKED
    const license = await prisma.license.findFirst({
      where: { orderId: paidOrderId, userId: customerId },
    });
    expect(license?.status).toBe('REVOKED');
    expect(license?.revocationReason).toContain('CDC 7 dias');

    // Verify unredeemed voucher was REVOKED
    const vouchers = await prisma.giftVoucher.findMany({
      where: { orderItem: { orderId: paidOrderId } },
    });
    expect(vouchers[0].status).toBe('REVOKED');

    // Verify AuditLog entry
    const auditLogs = await getAuditLogs(paidOrderId);
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].operator.id).toBe(operatorId);
    expect(auditLogs[0].action).toBe('ORDER_REFUNDED');
    expect(auditLogs[0].reason).toContain('CDC 7 dias');
  });

  it('blocks redundant refund on already refunded order', async () => {
    const secondRefund = await processAssistedRefund({
      orderId: paidOrderId,
      operatorUserId: operatorId,
      reason: 'Tentativa de segundo estorno.',
    });

    expect(secondRefund.success).toBe(false);
    expect(secondRefund.error?.toLowerCase()).toContain('estornado');
  });
});
