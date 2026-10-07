import { prisma } from '@/lib/prisma';
import { VoucherStatus } from '@prisma/client';

export interface UpdateVoucherParams {
  voucherId: string;
  purchaserUserId: string;
  recipientEmail: string;
  scheduledAt: Date;
  recipientName?: string;
}

export async function getCustomerLicenses(userId: string) {
  return prisma.license.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      product: true,
      order: {
        select: {
          orderNumber: true,
          paidAt: true,
        },
      },
    },
    orderBy: {
      activatedAt: 'desc',
    },
  });
}

export async function getCustomerPurchasedGifts(purchaserUserId: string) {
  return prisma.giftVoucher.findMany({
    where: {
      purchaserUserId,
    },
    include: {
      product: true,
      recipientUser: {
        select: {
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

export async function updateScheduledGiftRecipient(params: UpdateVoucherParams) {
  const { voucherId, purchaserUserId, recipientEmail, scheduledAt, recipientName } = params;

  const voucher = await prisma.giftVoucher.findUnique({
    where: { id: voucherId },
  });

  if (!voucher) {
    return {
      success: false,
      error: 'Voucher não encontrado.',
    };
  }

  if (voucher.purchaserUserId !== purchaserUserId) {
    return {
      success: false,
      error: 'Você não tem permissão para alterar este presente.',
    };
  }

  if (voucher.status === 'REDEEMED') {
    return {
      success: false,
      error: 'Não é possível alterar dados de um presente que já foi resgatado.',
    };
  }

  if (voucher.status === 'REVOKED') {
    return {
      success: false,
      error: 'Este presente foi cancelado e não pode ser editado.',
    };
  }

  const updated = await prisma.giftVoucher.update({
    where: { id: voucherId },
    data: {
      recipientEmail,
      recipientName: recipientName ?? voucher.recipientName,
      scheduledAt,
      status: VoucherStatus.SCHEDULED,
    },
  });

  return {
    success: true,
    voucher: updated,
  };
}
