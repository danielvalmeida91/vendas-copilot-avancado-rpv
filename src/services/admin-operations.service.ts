import { prisma } from '@/lib/prisma';
import { AuditAction, OrderStatus, VoucherStatus } from '@prisma/client';

export interface ListAdminOrdersParams {
  status?: OrderStatus;
  search?: string;
}

export interface ProcessRefundParams {
  orderId: string;
  operatorUserId: string;
  reason: string;
  revokeRedeemedAccess?: boolean;
  ipAddress?: string;
}

export interface RefundResult {
  success: boolean;
  orderId?: string;
  status?: OrderStatus;
  auditLogId?: string;
  error?: string;
}

export async function listAdminOrders(params: ListAdminOrdersParams = {}) {
  const where: any = {};

  if (params.status) {
    where.status = params.status;
  }

  if (params.search) {
    const s = params.search.trim();
    where.OR = [
      { orderNumber: { contains: s, mode: 'insensitive' } },
      { user: { name: { contains: s, mode: 'insensitive' } } },
      { user: { email: { contains: s, mode: 'insensitive' } } },
      { user: { cpf: { contains: s } } },
    ];
  }

  return prisma.order.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
        },
      },
      items: {
        include: {
          product: true,
          giftVouchers: true,
        },
      },
      auditLogs: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getAdminOrderDetail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      coupon: true,
      items: {
        include: {
          product: true,
          giftVouchers: {
            include: {
              recipientUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      licenses: true,
      auditLogs: {
        include: {
          operator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!order) return null;

  const hasRedeemedVouchers = order.items.some((item) =>
    item.giftVouchers.some((v) => v.status === VoucherStatus.REDEEMED)
  );

  return {
    ...order,
    hasRedeemedVouchers,
  };
}

export async function processAssistedRefund(params: ProcessRefundParams): Promise<RefundResult> {
  const { orderId, operatorUserId, reason, revokeRedeemedAccess = false, ipAddress } = params;

  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      error: 'A justificativa do estorno deve conter ao menos 5 caracteres.',
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              giftVouchers: true,
            },
          },
          licenses: true,
        },
      });

      if (!order) {
        throw new Error('Pedido não encontrado.');
      }

      if (order.status === OrderStatus.REFUNDED || order.status === OrderStatus.CANCELLED) {
        throw new Error('Este pedido já se encontra estornado ou cancelado.');
      }

      // Count vouchers by status
      const allVouchers = order.items.flatMap((i) => i.giftVouchers);
      const redeemedVouchers = allVouchers.filter((v) => v.status === VoucherStatus.REDEEMED);
      const unredeemedVouchers = allVouchers.filter((v) => v.status !== VoucherStatus.REDEEMED);

      // 1. Update order status to REFUNDED
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.REFUNDED,
          cancelledAt: new Date(),
        },
      });

      // 2. Revoke buyer's direct licenses
      await tx.license.updateMany({
        where: {
          orderId,
          status: 'ACTIVE',
        },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revocationReason: reason,
        },
      });

      // 3. Revoke unredeemed vouchers
      const unredeemedIds = unredeemedVouchers.map((v) => v.id);
      if (unredeemedIds.length > 0) {
        await tx.giftVoucher.updateMany({
          where: {
            id: { in: unredeemedIds },
          },
          data: {
            status: VoucherStatus.REVOKED,
            revokedAt: new Date(),
            revocationReason: reason,
          },
        });
      }

      // 4. Optionally revoke redeemed vouchers & their granted licenses
      if (revokeRedeemedAccess && redeemedVouchers.length > 0) {
        const redeemedIds = redeemedVouchers.map((v) => v.id);
        await tx.license.updateMany({
          where: {
            giftVoucherId: { in: redeemedIds },
            status: 'ACTIVE',
          },
          data: {
            status: 'REVOKED',
            revokedAt: new Date(),
            revocationReason: `Estorno assistido do pedido original: ${reason}`,
          },
        });

        await tx.giftVoucher.updateMany({
          where: {
            id: { in: redeemedIds },
          },
          data: {
            status: VoucherStatus.REVOKED,
            revokedAt: new Date(),
            revocationReason: reason,
          },
        });
      }

      // 5. Create immutable audit log entry
      const auditLog = await tx.auditLog.create({
        data: {
          operatorUserId,
          action: AuditAction.ORDER_REFUNDED,
          targetEntity: 'Order',
          targetId: orderId,
          orderId,
          reason,
          ipAddress: ipAddress || null,
          metadata: {
            previousStatus: order.status,
            totalInCents: order.totalInCents,
            revokeRedeemedAccess,
            redeemedVouchersCount: redeemedVouchers.length,
          },
        },
      });

      return {
        orderId: order.id,
        auditLogId: auditLog.id,
      };
    });

    return {
      success: true,
      orderId: result.orderId,
      status: OrderStatus.REFUNDED,
      auditLogId: result.auditLogId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao processar estorno.',
    };
  }
}

export async function getAuditLogs(orderId?: string) {
  const where: any = {};
  if (orderId) {
    where.orderId = orderId;
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      operator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
