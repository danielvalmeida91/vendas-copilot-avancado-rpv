import { NextRequest, NextResponse } from 'next/server';
import { calculateCart, CartItemInput } from '@/services/cart.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: CartItemInput[] = body.items || [];
    const couponCode: string | undefined = body.couponCode;
    const userId: string | undefined = body.userId;

    const result = await calculateCart({ items, couponCode, userId });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao calcular carrinho de compras.' },
      { status: 500 }
    );
  }
}
