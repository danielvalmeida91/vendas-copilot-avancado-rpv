import { prisma } from '@/lib/prisma';
import { calculateCart, CartItemInput } from '@/services/cart.service';
import { findOrCreateCustomer, normalizeCpf } from '@/lib/customer-utils';
import { emailService } from '@/lib/email-service';
import { PaymentMethod } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';

export const checkoutItemSchema = z.object({
  productId: z.string(),
  allocationMode: z.enum(['FOR_SELF', 'FOR_GIFT']),
  quantity: z.number().int().min(1),
  giftDeliveryType: z.enum(['IMMEDIATE_LINK', 'SCHEDULED_EMAIL']).optional(),
  recipientName: z.string().optional(),
  recipientEmail: z.string().email().optional().or(z.literal('')),
  giftScheduledAt: z.union([z.string(), z.date()]).optional(),
  giftMessage: z.string().optional(),
});

export const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.'),
    email: z.string().email('E-mail informado é inválido.'),
    cpf: z
      .string()
      .transform(normalizeCpf)
      .refine((val) => val.length === 11, 'CPF deve conter exatamente 11 dígitos numéricos.'),
  }),
  paymentMethod: z.nativeEnum(PaymentMethod),
  items: z.array(checkoutItemSchema).min(1, 'O carrinho precisa ter ao menos um item.'),
  couponCode: z.string().optional(),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export interface ProcessCheckoutResult {
  success: boolean;
  order?: {
    id: string;
    orderNumber: string;
    userId: string;
    status: string;
    paymentMethod: PaymentMethod;
    subtotalInCents: number;
    discountInCents: number;
    totalInCents: number;
    createdAt: Date;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    cpf: string;
  };
  errors?: string[];
}

export function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${dateStr}-${randomSuffix}`;
}

export async function processCheckout(rawInput: CheckoutInput): Promise<ProcessCheckoutResult> {
  const parseResult = checkoutSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      errors: parseResult.error.errors.map((e) => e.message),
    };
  }

  const { customer, paymentMethod, items, couponCode } = parseResult.data;

  // 1. Resolve or provision guest user in background
  const user = await findOrCreateCustomer(prisma, customer);

  // If user has no password (guest account), dispatch onboarding link per spec
  if (!user.passwordHash && emailService.sendOnboardingEmail) {
    const onboardingToken = crypto.randomBytes(24).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await emailService.sendOnboardingEmail({
      name: user.name,
      email: user.email,
      onboardingUrl: `${baseUrl}/definir-senha?token=${onboardingToken}`,
    });
  }

  // 2. Calculate and validate cart business rules for this user
  const calculation = await calculateCart({
    items: items as CartItemInput[],
    couponCode,
    userId: user.id,
  });

  if (!calculation.isValid) {
    return {
      success: false,
      errors: calculation.errors.map((e) => e.message),
    };
  }

  // 3. Persist order and items within transaction
  const orderNumber = generateOrderNumber();

  const createdOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: user.id,
        status: 'PENDING',
        paymentMethod,
        subtotalInCents: calculation.subtotalInCents,
        discountInCents: calculation.discountInCents,
        totalInCents: calculation.totalInCents,
        couponId: calculation.coupon?.id || null,
        items: {
          create: calculation.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPriceInCents: item.unitPriceInCents,
            totalPriceInCents: item.totalPriceInCents,
            allocationMode: item.allocationMode,
            giftDeliveryType: item.giftDeliveryType || null,
            recipientName: item.recipientName || null,
            recipientEmail: item.recipientEmail || null,
            giftScheduledAt: item.giftScheduledAt || null,
            giftMessage: item.giftMessage || null,
          })),
        },
      },
    });

    return order;
  });

  return {
    success: true,
    order: {
      id: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      userId: createdOrder.userId,
      status: createdOrder.status,
      paymentMethod: createdOrder.paymentMethod,
      subtotalInCents: createdOrder.subtotalInCents,
      discountInCents: createdOrder.discountInCents,
      totalInCents: createdOrder.totalInCents,
      createdAt: createdOrder.createdAt,
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      cpf: user.cpf,
    },
  };
}
