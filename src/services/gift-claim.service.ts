import { prisma } from '@/lib/prisma';
import { VoucherStatus } from '@prisma/client';
import { findOrCreateCustomer, normalizeCpf } from '@/lib/customer-utils';

export interface VoucherDetailsResult {
  isValid: boolean;
  canClaim: boolean;
  status?: VoucherStatus;
  redeemedAt?: Date | null;
  voucher?: {
    id: string;
    token: string;
    status: VoucherStatus;
    deliveryType: string;
    recipientName?: string | null;
    recipientEmail?: string | null;
    giftMessage?: string | null;
    product: {
      id: string;
      name: string;
      description: string;
      slug: string;
    };
    purchaserUser: {
      id: string;
      name: string;
      email: string;
    };
  };
  error?: string;
}

export interface ClaimVoucherInput {
  token: string;
  beneficiary: {
    name: string;
    email: string;
    cpf: string;
  };
}

export interface ClaimVoucherResult {
  success: boolean;
  licenseId?: string;
  productName?: string;
  error?: string;
}

export async function getVoucherByToken(token: string): Promise<VoucherDetailsResult> {
  const cleanToken = token.trim();
  const voucher = await prisma.giftVoucher.findUnique({
    where: { token: cleanToken },
    include: {
      product: true,
      purchaserUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!voucher) {
    return {
      isValid: false,
      canClaim: false,
      error: 'Voucher de presente não encontrado.',
    };
  }

  if (voucher.status === 'REDEEMED') {
    return {
      isValid: true,
      canClaim: false,
      status: voucher.status,
      redeemedAt: voucher.redeemedAt,
      voucher,
      error: 'Este presente já foi resgatado.',
    };
  }

  if (voucher.status === 'REVOKED') {
    return {
      isValid: true,
      canClaim: false,
      status: voucher.status,
      voucher,
      error: 'Este presente foi cancelado ou revogado.',
    };
  }

  return {
    isValid: true,
    canClaim: true,
    status: voucher.status,
    voucher,
  };
}

export async function claimGiftVoucher(input: ClaimVoucherInput): Promise<ClaimVoucherResult> {
  const { token, beneficiary } = input;
  const cleanCpf = normalizeCpf(beneficiary.cpf);

  if (!cleanCpf || cleanCpf.length !== 11) {
    return {
      success: false,
      error: 'CPF do beneficiário deve conter 11 dígitos.',
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch voucher with row check
      const voucher = await tx.giftVoucher.findUnique({
        where: { token },
        include: {
          product: true,
          orderItem: true,
        },
      });

      if (!voucher) {
        throw new Error('Voucher de presente não encontrado.');
      }

      if (voucher.status === VoucherStatus.REDEEMED) {
        throw new Error('Este voucher já foi resgatado anteriormente.');
      }

      if (voucher.status === VoucherStatus.REVOKED) {
        throw new Error('Este voucher foi cancelado/estornado.');
      }

      // 2. Resolve or provision beneficiary account in background
      const user = await findOrCreateCustomer(tx, {
        name: beneficiary.name,
        email: beneficiary.email,
        cpf: cleanCpf,
      });

      // 3. Prevent duplicate active license for same product if restricted
      if (!voucher.product.canPurchaseMultipleSelf) {
        const existingLicense = await tx.license.findFirst({
          where: {
            userId: user.id,
            productId: voucher.productId,
            status: 'ACTIVE',
          },
        });

        if (existingLicense) {
          throw new Error('Você já possui uma licença ativa deste produto em sua conta.');
        }
      }

      // 4. Mark voucher as REDEEMED atomically (conditional check against race conditions)
      const updateResult = await tx.giftVoucher.updateMany({
        where: {
          id: voucher.id,
          status: { in: [VoucherStatus.ISSUED, VoucherStatus.SCHEDULED] },
        },
        data: {
          status: VoucherStatus.REDEEMED,
          redeemedAt: new Date(),
          recipientUserId: user.id,
        },
      });

      if (updateResult.count === 0) {
        throw new Error('Este voucher já foi resgatado concorrentemente.');
      }

      // 5. Grant active License to beneficiary
      const license = await tx.license.create({
        data: {
          userId: user.id,
          productId: voucher.productId,
          orderId: voucher.orderItem.orderId,
          giftVoucherId: voucher.id,
          status: 'ACTIVE',
        },
      });

      return {
        licenseId: license.id,
        productName: voucher.product.name,
      };
    });

    return {
      success: true,
      licenseId: result.licenseId,
      productName: result.productName,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao resgatar voucher de presente.',
    };
  }
}
