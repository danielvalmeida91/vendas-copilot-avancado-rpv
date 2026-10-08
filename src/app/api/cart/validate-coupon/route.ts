import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/services/cart.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, subtotalInCents, userId } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { isValid: false, error: 'Código de cupom obrigatório.' },
        { status: 400 }
      );
    }

    const result = await validateCoupon({
      code,
      subtotalInCents: Number(subtotalInCents) || 0,
      userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { isValid: false, error: 'Erro ao validar cupom promocional.' },
      { status: 500 }
    );
  }
}
