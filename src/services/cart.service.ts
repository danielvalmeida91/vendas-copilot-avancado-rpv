import { prisma } from '@/lib/prisma';
import { AllocationMode, DiscountType } from '@prisma/client';

export interface CartItemInput {
  productId: string;
  allocationMode: AllocationMode;
  quantity: number;
  giftDeliveryType?: 'IMMEDIATE_LINK' | 'SCHEDULED_EMAIL';
  recipientName?: string;
  recipientEmail?: string;
  giftScheduledAt?: string | Date;
  giftMessage?: string;
}

export interface ValidatedCartItem {
  productId: string;
  productName: string;
  slug: string;
  unitPriceInCents: number;
  quantity: number;
  totalPriceInCents: number;
  allocationMode: AllocationMode;
  giftDeliveryType?: 'IMMEDIATE_LINK' | 'SCHEDULED_EMAIL';
  recipientName?: string;
  recipientEmail?: string;
  giftScheduledAt?: Date;
  giftMessage?: string;
}

export interface CartError {
  code: 'SELF_PURCHASE_LIMIT' | 'ALREADY_OWNED' | 'PRODUCT_NOT_FOUND' | 'INVALID_QUANTITY' | 'COUPON_INVALID';
  message: string;
  productId?: string;
}

export interface CartCalculationResult {
  isValid: boolean;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  items: ValidatedCartItem[];
  coupon?: {
    id: string;
    code: string;
    description?: string | null;
    discountType: DiscountType;
    discountValue: number;
    discountInCents: number;
  };
  errors: CartError[];
}

export interface ValidateCouponInput {
  code: string;
  subtotalInCents: number;
  userId?: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  coupon?: {
    id: string;
    code: string;
    description?: string | null;
    discountType: DiscountType;
    discountValue: number;
    discountInCents: number;
  };
  error?: string;
}

export async function validateCoupon(input: ValidateCouponInput): Promise<CouponValidationResult> {
  const code = input.code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({
    where: { code },
  });

  if (!coupon || !coupon.isActive) {
    return {
      isValid: false,
      error: 'Cupom inválido ou inativo.',
    };
  }

  const now = new Date();
  if (now < coupon.validFrom || now > coupon.validUntil) {
    return {
      isValid: false,
      error: 'Cupom expirado ou fora do período de validade.',
    };
  }

  if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
    return {
      isValid: false,
      error: 'Limite de utilizações deste cupom foi atingido.',
    };
  }

  if (input.subtotalInCents < coupon.minOrderAmountCents) {
    const minFormatted = (coupon.minOrderAmountCents / 100).toFixed(2);
    return {
      isValid: false,
      error: `Valor mínimo do pedido para este cupom é de R$ ${minFormatted}.`,
    };
  }

  let discountInCents = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discountInCents = Math.round((input.subtotalInCents * coupon.discountValue) / 100);
  } else {
    discountInCents = Math.min(coupon.discountValue, input.subtotalInCents);
  }

  return {
    isValid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountInCents,
    },
  };
}

export async function calculateCart(params: {
  items: CartItemInput[];
  couponCode?: string;
  userId?: string;
}): Promise<CartCalculationResult> {
  const errors: CartError[] = [];
  const validatedItems: ValidatedCartItem[] = [];

  const productIds = Array.from(new Set(params.items.map((i) => i.productId)));
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true,
    },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let ownedProductIds = new Set<string>();
  if (params.userId) {
    const licenses = await prisma.license.findMany({
      where: {
        userId: params.userId,
        productId: { in: productIds },
        status: 'ACTIVE',
      },
      select: { productId: true },
    });
    ownedProductIds = new Set(licenses.map((l) => l.productId));
  }

  const selfAllocatedCount = new Map<string, number>();

  for (const item of params.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      errors.push({
        code: 'PRODUCT_NOT_FOUND',
        message: `Produto com id ${item.productId} não encontrado ou inativo.`,
        productId: item.productId,
      });
      continue;
    }

    if (item.quantity <= 0) {
      errors.push({
        code: 'INVALID_QUANTITY',
        message: 'A quantidade deve ser de pelo menos 1 unidade.',
        productId: item.productId,
      });
      continue;
    }

    if (item.allocationMode === 'FOR_SELF') {
      const currentCount = (selfAllocatedCount.get(item.productId) || 0) + item.quantity;
      selfAllocatedCount.set(item.productId, currentCount);

      if (currentCount > 1 && !product.canPurchaseMultipleSelf) {
        errors.push({
          code: 'SELF_PURCHASE_LIMIT',
          message: 'Apenas 1 unidade é permitida para uso próprio.',
          productId: item.productId,
        });
      }

      if (params.userId && ownedProductIds.has(item.productId) && !product.canPurchaseMultipleSelf) {
        errors.push({
          code: 'ALREADY_OWNED',
          message: 'Você já possui uma licença ativa deste produto em sua conta.',
          productId: item.productId,
        });
      }
    }

    const itemTotalPrice = product.priceInCents * item.quantity;
    validatedItems.push({
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      unitPriceInCents: product.priceInCents,
      quantity: item.quantity,
      totalPriceInCents: itemTotalPrice,
      allocationMode: item.allocationMode,
      giftDeliveryType: item.giftDeliveryType,
      recipientName: item.recipientName,
      recipientEmail: item.recipientEmail,
      giftScheduledAt: item.giftScheduledAt ? new Date(item.giftScheduledAt) : undefined,
      giftMessage: item.giftMessage,
    });
  }

  const subtotalInCents = validatedItems.reduce((acc, item) => acc + item.totalPriceInCents, 0);

  let appliedCoupon: CartCalculationResult['coupon'] = undefined;
  let discountInCents = 0;

  if (params.couponCode && subtotalInCents > 0) {
    const couponValidation = await validateCoupon({
      code: params.couponCode,
      subtotalInCents,
      userId: params.userId,
    });

    if (couponValidation.isValid && couponValidation.coupon) {
      appliedCoupon = couponValidation.coupon;
      discountInCents = couponValidation.coupon.discountInCents;
    } else if (couponValidation.error) {
      errors.push({
        code: 'COUPON_INVALID',
        message: couponValidation.error,
      });
    }
  }

  const totalInCents = Math.max(0, subtotalInCents - discountInCents);

  return {
    isValid: errors.length === 0,
    subtotalInCents,
    discountInCents,
    totalInCents,
    items: validatedItems,
    coupon: appliedCoupon,
    errors,
  };
}
