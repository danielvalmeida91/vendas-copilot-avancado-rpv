import { prisma } from '@/lib/prisma';
import { EmailServicePort, emailService as defaultEmailService } from '@/lib/email-service';
import { VoucherStatus } from '@prisma/client';

export interface DispatchOptions {
  now?: Date;
  emailService?: EmailServicePort;
  baseUrl?: string;
}

export interface DispatchResult {
  processed: number;
  dispatched: number;
  failed: number;
}

export async function dispatchDueScheduledGifts(
  options: DispatchOptions = {}
): Promise<DispatchResult> {
  const now = options.now ?? new Date();
  const mailer = options.emailService ?? defaultEmailService;
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // 1. Query vouchers scheduled on or before current timestamp
  const dueVouchers = await prisma.giftVoucher.findMany({
    where: {
      status: VoucherStatus.SCHEDULED,
      deliveryType: 'SCHEDULED_EMAIL',
      scheduledAt: { lte: now },
      recipientEmail: { not: null },
    },
    include: {
      product: true,
      purchaserUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  let dispatched = 0;
  let failed = 0;

  for (const voucher of dueVouchers) {
    if (!voucher.recipientEmail) continue;

    const claimUrl = `${baseUrl}/resgatar/${voucher.token}`;

    try {
      const sendResult = await mailer.sendGiftEmail({
        recipientName: voucher.recipientName || 'Presenteado(a)',
        recipientEmail: voucher.recipientEmail,
        purchaserName: voucher.purchaserUser.name,
        productName: voucher.product.name,
        claimUrl,
        giftMessage: voucher.giftMessage,
      });

      if (sendResult.success) {
        // Transition status to ISSUED with actual dispatch timestamp
        await prisma.giftVoucher.update({
          where: { id: voucher.id },
          data: {
            status: VoucherStatus.ISSUED,
            dispatchedAt: new Date(),
          },
        });
        dispatched++;
      } else {
        console.error(
          `[ScheduledDispatch] Failed to dispatch email for voucher ${voucher.id}: ${sendResult.error}`
        );
        failed++;
      }
    } catch (err) {
      console.error(
        `[ScheduledDispatch] Unexpected exception dispatching email for voucher ${voucher.id}:`,
        err
      );
      failed++;
    }
  }

  return {
    processed: dueVouchers.length,
    dispatched,
    failed,
  };
}
