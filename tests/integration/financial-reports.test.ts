import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  generateFinancialReport,
  exportReportAsCsv,
  exportReportAsJson,
} from '@/services/financial-reports.service';

describe('Financial Reporting & Accounting Export Seam (Ticket 10 / Issue #11)', () => {
  let customer1Id: string;
  let customer2Id: string;
  let productId: string;

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

    const c1 = await prisma.user.create({
      data: {
        name: 'Cliente Fiscal 1',
        email: 'fiscal1@example.com',
        cpf: '12312312312',
      },
    });
    customer1Id = c1.id;

    const c2 = await prisma.user.create({
      data: {
        name: 'Cliente Fiscal 2',
        email: 'fiscal2@example.com',
        cpf: '32132132132',
      },
    });
    customer2Id = c2.id;

    const prod = await prisma.product.create({
      data: {
        slug: 'curso-financas',
        name: 'Curso Gestão Financeira',
        description: 'Curso contábil',
        priceInCents: 10000,
        isActive: true,
      },
    });
    productId = prod.id;

    // Order 1: PAID (R$ 100 gross, R$ 10 discount -> R$ 90 net)
    await prisma.order.create({
      data: {
        orderNumber: 'ORD-FIN-001',
        userId: customer1Id,
        status: 'PAID',
        paymentMethod: 'PIX',
        gatewayTransactionId: 'tx_pix_fin_1',
        subtotalInCents: 10000,
        discountInCents: 1000,
        totalInCents: 9000,
        createdAt: new Date('2025-03-01T10:00:00Z'),
        items: {
          create: {
            productId,
            quantity: 1,
            unitPriceInCents: 10000,
            totalPriceInCents: 10000,
            allocationMode: 'FOR_SELF',
          },
        },
      },
    });

    // Order 2: PAID (R$ 200 gross, R$ 0 discount -> R$ 200 net)
    await prisma.order.create({
      data: {
        orderNumber: 'ORD-FIN-002',
        userId: customer2Id,
        status: 'PAID',
        paymentMethod: 'CREDIT_CARD',
        gatewayTransactionId: 'tx_cc_fin_2',
        subtotalInCents: 20000,
        discountInCents: 0,
        totalInCents: 20000,
        createdAt: new Date('2025-03-02T15:00:00Z'),
        items: {
          create: {
            productId,
            quantity: 2,
            unitPriceInCents: 10000,
            totalPriceInCents: 20000,
            allocationMode: 'FOR_GIFT',
          },
        },
      },
    });

    // Order 3: REFUNDED (R$ 100)
    await prisma.order.create({
      data: {
        orderNumber: 'ORD-FIN-003',
        userId: customer1Id,
        status: 'REFUNDED',
        paymentMethod: 'PIX',
        gatewayTransactionId: 'tx_pix_fin_3',
        subtotalInCents: 10000,
        discountInCents: 0,
        totalInCents: 10000,
        createdAt: new Date('2025-03-03T11:00:00Z'),
        items: {
          create: {
            productId,
            quantity: 1,
            unitPriceInCents: 10000,
            totalPriceInCents: 10000,
            allocationMode: 'FOR_SELF',
          },
        },
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

  it('generates consolidated financial summary for paid orders in date range', async () => {
    const report = await generateFinancialReport({
      startDate: new Date('2025-03-01T00:00:00Z'),
      endDate: new Date('2025-03-05T23:59:59Z'),
      includeCancelled: false,
    });

    expect(report.totalOrders).toBe(2);
    expect(report.totalGrossInCents).toBe(30000); // 10000 + 20000
    expect(report.totalDiscountsInCents).toBe(1000);
    expect(report.totalNetInCents).toBe(29000); // 30000 - 1000
    expect(report.byPaymentMethod.PIX.count).toBe(1);
    expect(report.byPaymentMethod.CREDIT_CARD.count).toBe(1);
  });

  it('includes refunded orders when includeCancelled is true', async () => {
    const report = await generateFinancialReport({
      startDate: new Date('2025-03-01T00:00:00Z'),
      endDate: new Date('2025-03-05T23:59:59Z'),
      includeCancelled: true,
    });

    expect(report.totalOrders).toBe(3);
    expect(report.rows.some((r) => r.status === 'REFUNDED')).toBe(true);
  });

  it('exports structured CSV format with required fiscal headers and customer identifiers', async () => {
    const report = await generateFinancialReport({
      startDate: new Date('2025-03-01T00:00:00Z'),
      endDate: new Date('2025-03-05T23:59:59Z'),
      includeCancelled: false,
    });

    const csv = exportReportAsCsv(report);

    expect(csv).toContain('Data;Pedido;Status;Meio;Cliente;CPF;Itens;Valor_Bruto;Desconto;Valor_Liquido');
    expect(csv).toContain('ORD-FIN-001');
    expect(csv).toContain('12312312312');
    expect(csv).toContain('100.00');
    expect(csv).toContain('90.00');
  });

  it('exports structured JSON format conforming to accounting specs', async () => {
    const report = await generateFinancialReport({
      startDate: new Date('2025-03-01T00:00:00Z'),
      endDate: new Date('2025-03-05T23:59:59Z'),
      includeCancelled: false,
    });

    const jsonStr = exportReportAsJson(report);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.totalOrders).toBe(2);
    expect(parsed.totalNetInCents).toBe(29000);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].orderNumber).toBeDefined();
    expect(parsed.rows[0].customerCpf).toBeDefined();
  });
});
