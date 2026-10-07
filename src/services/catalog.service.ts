import { prisma } from '@/lib/prisma';

export interface CatalogProductDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceInCents: number;
  isActive: boolean;
  canPurchaseMultipleSelf: boolean;
  accessDurationDays: number | null;
  hasActiveLicense?: boolean;
  canPurchaseForSelf?: boolean;
}

export async function checkUserProductOwnership(userId: string, productId: string): Promise<boolean> {
  const activeLicense = await prisma.license.findFirst({
    where: {
      userId,
      productId,
      status: 'ACTIVE',
    },
  });
  return Boolean(activeLicense);
}

export async function listCatalogProducts(options?: { userId?: string }): Promise<CatalogProductDto[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  let ownedProductIds = new Set<string>();
  if (options?.userId) {
    const licenses = await prisma.license.findMany({
      where: {
        userId: options.userId,
        status: 'ACTIVE',
      },
      select: { productId: true },
    });
    ownedProductIds = new Set(licenses.map((l) => l.productId));
  }

  return products.map((product) => {
    const hasActiveLicense = options?.userId ? ownedProductIds.has(product.id) : false;
    const canPurchaseForSelf = product.canPurchaseMultipleSelf || !hasActiveLicense;

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      priceInCents: product.priceInCents,
      isActive: product.isActive,
      canPurchaseMultipleSelf: product.canPurchaseMultipleSelf,
      accessDurationDays: product.accessDurationDays,
      hasActiveLicense,
      canPurchaseForSelf,
    };
  });
}

export async function getProductBySlug(
  slug: string,
  options?: { userId?: string }
): Promise<CatalogProductDto | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
  });

  if (!product || !product.isActive) {
    return null;
  }

  let hasActiveLicense = false;
  if (options?.userId) {
    hasActiveLicense = await checkUserProductOwnership(options.userId, product.id);
  }

  const canPurchaseForSelf = product.canPurchaseMultipleSelf || !hasActiveLicense;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    priceInCents: product.priceInCents,
    isActive: product.isActive,
    canPurchaseMultipleSelf: product.canPurchaseMultipleSelf,
    accessDurationDays: product.accessDurationDays,
    hasActiveLicense,
    canPurchaseForSelf,
  };
}
