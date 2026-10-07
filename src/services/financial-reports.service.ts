import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export interface FinancialReportParams {
  startDate: Date;
  endDate: Date;
  includeCancelled?: boolean;
}

export interface FinancialReportRow {
  date: string;
  orderNumber: string;
  gatewayTransactionId: string | null;
  customerName: string;
  customerEmail: string;
  customerCpf: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  grossAmountInCents: number;
  discountAmountInCents: number;
  netAmountInCents: number;
  estimatedTaxInCents: number;
}

export interface FinancialReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  totalOrders: number;
  totalGrossInCents: number;
  totalDiscountsInCents: number;
  totalNetInCents: number;
  totalEstimatedTaxesInCents: number;
  byPaymentMethod: {
    PIX: { count: number; totalInCents: number };
    CREDIT_CARD: { count: number; totalInCents: number };
  };
  rows: FinancialReportRow[];
}

export async function generateFinancialReport(
  params: FinancialReportParams
): Promise<FinancialReportData> {
  const { startDate, endDate, includeCancelled = false } = params;

  const statusFilter: OrderStatus[] = includeCancelled
    ? [OrderStatus.PAID, OrderStatus.REFUNDED, OrderStatus.CANCELLED]
    : [OrderStatus.PAID];

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: statusFilter,
      },
    },
    include: {
      user: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  let totalGrossInCents = 0;
  let totalDiscountsInCents = 0;
  let totalNetInCents = 0;
  let totalEstimatedTaxesInCents = 0;

  const byPaymentMethod = {
    PIX: { count: 0, totalInCents: 0 },
    CREDIT_CARD: { count: 0, totalInCents: 0 },
  };

  const rows: FinancialReportRow[] = orders.map((o) => {
    // For net reporting, cancelled/refunded can be considered 0 net or tracked as recorded
    const isSettled = o.status === OrderStatus.PAID;
    const gross = o.subtotalInCents;
    const discount = o.discountInCents;
    const net = o.totalInCents;
    // Estimated tax 6% on net settled revenue
    const estimatedTax = isSettled ? Math.round(net * 0.06) : 0;

    if (isSettled) {
      totalGrossInCents += gross;
      totalDiscountsInCents += discount;
      totalNetInCents += net;
      totalEstimatedTaxesInCents += estimatedTax;

      if (o.paymentMethod === PaymentMethod.PIX) {
        byPaymentMethod.PIX.count += 1;
        byPaymentMethod.PIX.totalInCents += net;
      } else if (o.paymentMethod === PaymentMethod.CREDIT_CARD) {
        byPaymentMethod.CREDIT_CARD.count += 1;
        byPaymentMethod.CREDIT_CARD.totalInCents += net;
      }
    }

    return {
      date: o.createdAt.toISOString(),
      orderNumber: o.orderNumber,
      gatewayTransactionId: o.gatewayTransactionId,
      customerName: o.user.name,
      customerEmail: o.user.email,
      customerCpf: o.user.cpf,
      status: o.status,
      paymentMethod: o.paymentMethod,
      grossAmountInCents: gross,
      discountAmountInCents: discount,
      netAmountInCents: net,
      estimatedTaxInCents: estimatedTax,
    };
  });

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    totalOrders: orders.length,
    totalGrossInCents,
    totalDiscountsInCents,
    totalNetInCents,
    totalEstimatedTaxesInCents,
    byPaymentMethod,
    rows,
  };
}

export function exportReportAsCsv(report: FinancialReportData): string {
  const header = [
    'Data',
    'Pedido',
    'Status',
    'Meio',
    'Cliente',
    'CPF',
    'Valor_Bruto',
    'Desconto',
    'Valor_Liquido',
    'Tributo_Estimado',
    'Transacao_Gateway',
  ].join(';');

  const lines = report.rows.map((r) => {
    return [
      `"${r.date}"`,
      `"${r.orderNumber}"`,
      `"${r.status}"`,
      `"${r.paymentMethod}"`,
      `"${r.customerName.replace(/"/g, '""')}"`,
      `"${r.customerCpf}"`,
      (r.grossAmountInCents / 100).toFixed(2),
      (r.discountAmountInCents / 100).toFixed(2),
      (r.netAmountInCents / 100).toFixed(2),
      (r.estimatedTaxInCents / 100).toFixed(2),
      `"${r.gatewayTransactionId || ''}"`,
    ].join(';');
  });

  return [header, ...lines].join('\n');
}

export function exportReportAsJson(report: FinancialReportData): string {
  return JSON.stringify(report, null, 2);
}
