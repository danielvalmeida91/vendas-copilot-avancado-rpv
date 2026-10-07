import { prisma } from '@/lib/prisma';
import { verifyHmacSignature } from '@/lib/payment-gateway';
import { VoucherStatus } from '@prisma/client';
import crypto from 'crypto';

export interface PaymentWebhookPayload {
  eventId: string;
  eventType: 'PAYMENT_CONFIRMED' | 'PAYMENT_FAILED';
  transactionId: string;
  orderId: string;
  amountInCents: number;
  paidAt?: string;
}

export interface ProcessWebhookResult {
  status: number;
  success: boolean;
  alreadyProcessed?: boolean;
  message?: string;
  error?: string;
}

export function generateHmacSignature(rawBody: string, secret: string): string {
  const hash = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  return `sha256=${hash}`;
}

export async function processPaymentWebhook(params: {
  rawBody: string;
  signature: string | null | undefined;
}): Promise<ProcessWebhookResult> {
  const { rawBody, signature } = params;

  // 1. Authenticate webhook via HMAC signature
  const isValidSignature = verifyHmacSignature(rawBody, signature);
  if (!isValidSignature) {
    return {
      status: 401,
      success: false,
      error: 'Assinatura HMAC inválida ou ausente.',
    };
  }

  let payload: PaymentWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return {
      status: 400,
      success: false,
      error: 'Payload JSON mal formatado.',
    };
  }

  const { eventId, eventType, transactionId, orderId } = payload;
  const gateway = 'MOCK_GATEWAY';

  // 2. Check Idempotency Table
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: {
      gateway_eventId: {
        gateway,
        eventId,
      },
    },
  });

  if (existingEvent && existingEvent.status === 'PROCESSED') {
    return {
      status: 200,
      success: true,
      alreadyProcessed: true,
      message: 'Evento já processado com sucesso anteriormente.',
    };
  }

  // 3. Atomic Database Transaction: fulfill order and generate licenses/vouchers
  try {
    await prisma.$transaction(async (tx) => {
      // Upsert webhook event log in PROCESSING status
      await tx.webhookEvent.upsert({
        where: {
          gateway_eventId: {
            gateway,
            eventId,
          },
        },
        create: {
          gateway,
          eventId,
          eventType,
          transactionId,
          payload: payload as any,
          status: 'PROCESSING',
        },
        update: {
          status: 'PROCESSING',
        },
      });

      // Find target order
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new Error(`Pedido com ID ${orderId} não encontrado.`);
      }

      // If already paid, simply mark event processed
      if (order.status === 'PAID') {
        await tx.webhookEvent.update({
          where: { gateway_eventId: { gateway, eventId } },
          data: { status: 'PROCESSED', processedAt: new Date() },
        });
        return;
      }

      if (eventType === 'PAYMENT_CONFIRMED') {
        // Transition order status
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
            paidAt: payload.paidAt ? new Date(payload.paidAt) : new Date(),
            gatewayTransactionId: transactionId,
          },
        });

        // Record coupon usage and increment uses upon successful payment
        if (order.couponId && order.discountInCents > 0) {
          await tx.couponUsage.create({
            data: {
              couponId: order.couponId,
              orderId: order.id,
              userId: order.userId,
              discountAmountCents: order.discountInCents,
            },
          });

          await tx.coupon.update({
            where: { id: order.couponId },
            data: { currentUses: { increment: 1 } },
          });
        }

        // Fulfill line items
        for (const item of order.items) {
          if (item.allocationMode === 'FOR_SELF') {
            // Grant license to purchaser
            await tx.license.create({
              data: {
                userId: order.userId,
                productId: item.productId,
                orderId: order.id,
                status: 'ACTIVE',
              },
            });
          } else if (item.allocationMode === 'FOR_GIFT') {
            // Emit non-enumerable vouchers for each unit
            for (let i = 0; i < item.quantity; i++) {
              const token = crypto.randomBytes(24).toString('hex');
              let initialStatus: VoucherStatus = VoucherStatus.ISSUED;

              if (
                item.giftDeliveryType === 'SCHEDULED_EMAIL' &&
                item.giftScheduledAt &&
                new Date(item.giftScheduledAt) > new Date()
              ) {
                initialStatus = VoucherStatus.SCHEDULED;
              }

              await tx.giftVoucher.create({
                data: {
                  token,
                  orderItemId: item.id,
                  purchaserUserId: order.userId,
                  productId: item.productId,
                  status: initialStatus,
                  deliveryType: item.giftDeliveryType || 'IMMEDIATE_LINK',
                  recipientName: item.recipientName,
                  recipientEmail: item.recipientEmail,
                  giftMessage: item.giftMessage,
                  scheduledAt: item.giftScheduledAt,
                },
              });
            }
          }
        }
      } else if (eventType === 'PAYMENT_FAILED') {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        });
      }

      // Mark webhook event as PROCESSED
      await tx.webhookEvent.update({
        where: { gateway_eventId: { gateway, eventId } },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });
    });

    return {
      status: 200,
      success: true,
      message: 'Notificação de pagamento processada com sucesso.',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro no processamento do webhook.';
    await prisma.webhookEvent
      .update({
        where: { gateway_eventId: { gateway, eventId } },
        data: { status: 'FAILED', errorMessage: errorMsg },
      })
      .catch(() => {});

    return {
      status: 500,
      success: false,
      error: errorMsg,
    };
  }
}
