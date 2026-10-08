import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { calculateCart, validateCoupon } from '@/services/cart.service';

describe('Cart Allocation & Coupon Engine Seam (Ticket 03 / Issue #4)', () => {
  let userId: string;
  let productAId: string;
  let productBId: string;
  let expiredCouponCode: string;
  let percentageCouponCode: string;
  let fixedCouponCode: string;
  let maxUsesCouponCode: string;
  let minAmountCouponCode: string;

  beforeAll(async () => {
    await prisma.giftVoucher.deleteMany();
    await prisma.license.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.couponUsage.deleteMany();
    await prisma.order.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // Create user
    const user = await prisma.user.create({
      data: {
        name: 'Maria Compradora',
        email: 'maria.carrinho@test.com',
        cpf: '22233344455',
      },
    });
    userId = user.id;

    // Create products
    const prodA = await prisma.product.create({
      data: {
        slug: 'curso-cart-a',
        name: 'Curso React e Next',
        description: 'Curso intensivo',
        priceInCents: 10000, // R$ 100,00
        isActive: true,
      },
    });
    productAId = prodA.id;

    const prodB = await prisma.product.create({
      data: {
        slug: 'ebook-cart-b',
        name: 'E-book TypeScript',
        description: 'Ebook avançado',
        priceInCents: 5000, // R$ 50,00
        isActive: true,
      },
    });
    productBId = prodB.id;

    // Create user's existing license for Product B
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-CART-PREV-01',
        userId,
        status: 'PAID',
        paymentMethod: 'PIX',
        subtotalInCents: 5000,
        totalInCents: 5000,
      },
    });

    await prisma.license.create({
      data: {
        userId,
        productId: productBId,
        orderId: order.id,
        status: 'ACTIVE',
      },
    });

    // Create test coupons
    const c1 = await prisma.coupon.create({
      data: {
        code: 'PROMO10',
        description: '10% de desconto',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2030-12-31'),
        isActive: true,
      },
    });
    percentageCouponCode = c1.code;

    const c2 = await prisma.coupon.create({
      data: {
        code: 'FIXO25',
        description: 'R$ 25 de desconto',
        discountType: 'FIXED_AMOUNT',
        discountValue: 2500,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2030-12-31'),
        isActive: true,
      },
    });
    fixedCouponCode = c2.code;

    const c3 = await prisma.coupon.create({
      data: {
        code: 'EXPIRADO',
        description: 'Cupom do ano passado',
        discountType: 'PERCENTAGE',
        discountValue: 50,
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2021-01-01'),
        isActive: true,
      },
    });
    expiredCouponCode = c3.code;

    const c4 = await prisma.coupon.create({
      data: {
        code: 'ESGOTADO',
        description: 'Cupom com limite de uso atingido',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        maxUses: 2,
        currentUses: 2,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2030-12-31'),
        isActive: true,
      },
    });
    maxUsesCouponCode = c4.code;

    const c5 = await prisma.coupon.create({
      data: {
        code: 'MINIMO200',
        description: 'Desconto para pedidos acima de R$ 200',
        discountType: 'FIXED_AMOUNT',
        discountValue: 3000,
        minOrderAmountCents: 20000,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2030-12-31'),
        isActive: true,
      },
    });
    minAmountCouponCode = c5.code;
  });

  afterAll(async () => {
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

  describe('Allocation Rules: FOR_SELF vs FOR_GIFT', () => {
    it('allows 1 unit for FOR_SELF of unowned product', async () => {
      const result = await calculateCart({
        items: [
          {
            productId: productAId,
            allocationMode: 'FOR_SELF',
            quantity: 1,
          },
        ],
        userId,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.subtotalInCents).toBe(10000);
      expect(result.totalInCents).toBe(10000);
    });

    it('rejects adding > 1 quantity for FOR_SELF', async () => {
      const result = await calculateCart({
        items: [
          {
            productId: productAId,
            allocationMode: 'FOR_SELF',
            quantity: 2,
          },
        ],
        userId,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'SELF_PURCHASE_LIMIT')).toBe(true);
    });

    it('rejects FOR_SELF if user already owns an active license for the product', async () => {
      const result = await calculateCart({
        items: [
          {
            productId: productBId,
            allocationMode: 'FOR_SELF',
            quantity: 1,
          },
        ],
        userId,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'ALREADY_OWNED')).toBe(true);
    });

    it('allows arbitrary quantity for FOR_GIFT even if user owns the product', async () => {
      const result = await calculateCart({
        items: [
          {
            productId: productBId,
            allocationMode: 'FOR_GIFT',
            quantity: 3,
          },
        ],
        userId,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.subtotalInCents).toBe(15000); // 3 * 5000
      expect(result.totalInCents).toBe(15000);
    });

    it('supports mixed cart: 1 FOR_SELF + N FOR_GIFT items', async () => {
      const result = await calculateCart({
        items: [
          {
            productId: productAId,
            allocationMode: 'FOR_SELF',
            quantity: 1,
          },
          {
            productId: productBId,
            allocationMode: 'FOR_GIFT',
            quantity: 2,
          },
        ],
        userId,
      });

      expect(result.isValid).toBe(true);
      expect(result.subtotalInCents).toBe(20000); // 10000 + 2 * 5000
      expect(result.items).toHaveLength(2);
    });
  });

  describe('Coupon Engine & Discounts', () => {
    it('applies valid percentage coupon correctly', async () => {
      const result = await calculateCart({
        items: [
          {
            productId: productAId,
            allocationMode: 'FOR_SELF',
            quantity: 1,
          },
        ],
        couponCode: percentageCouponCode,
      });

      expect(result.isValid).toBe(true);
      expect(result.subtotalInCents).toBe(10000);
      expect(result.discountInCents).toBe(1000); // 10% of 10000
      expect(result.totalInCents).toBe(9000);
      expect(result.coupon?.code).toBe(percentageCouponCode);
    });

    it('applies valid fixed amount coupon correctly', async () => {
      const result = await calculateCart({
        items: [
          {
            productId: productAId,
            allocationMode: 'FOR_SELF',
            quantity: 1,
          },
        ],
        couponCode: fixedCouponCode,
      });

      expect(result.isValid).toBe(true);
      expect(result.subtotalInCents).toBe(10000);
      expect(result.discountInCents).toBe(2500); // R$ 25,00
      expect(result.totalInCents).toBe(7500);
    });

    it('rejects expired coupon with clear error', async () => {
      const couponCheck = await validateCoupon({
        code: expiredCouponCode,
        subtotalInCents: 10000,
      });

      expect(couponCheck.isValid).toBe(false);
      expect(couponCheck.error?.toLowerCase()).toContain('expirado');
    });

    it('rejects coupon that reached maximum usage limit', async () => {
      const couponCheck = await validateCoupon({
        code: maxUsesCouponCode,
        subtotalInCents: 10000,
      });

      expect(couponCheck.isValid).toBe(false);
      expect(couponCheck.error?.toLowerCase()).toContain('limite');
    });

    it('rejects coupon when subtotal is below minimum order amount', async () => {
      const couponCheck = await validateCoupon({
        code: minAmountCouponCode,
        subtotalInCents: 10000, // below 20000
      });

      expect(couponCheck.isValid).toBe(false);
      expect(couponCheck.error?.toLowerCase()).toContain('mínimo');
    });
  });
});
