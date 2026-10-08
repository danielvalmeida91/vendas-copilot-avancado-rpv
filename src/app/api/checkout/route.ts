import { NextRequest, NextResponse } from 'next/server';
import { processCheckout } from '@/services/checkout.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await processCheckout(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.errors },
        { status: 400 }
      );
    }

    const response = NextResponse.json(result, { status: 201 });
    if (result.user?.id) {
      response.cookies.set('auth_user_id', result.user.id, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        errors: [error instanceof Error ? error.message : 'Erro ao processar checkout.'],
      },
      { status: 500 }
    );
  }
}
