import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier = body.identifier;

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json(
        { success: false, error: 'E-mail ou CPF é obrigatório.' },
        { status: 400 }
      );
    }

    const result = await authenticateUser({ identifier });
    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    // Set cookie valid for 30 days
    response.cookies.set('auth_user_id', result.user.id, {
      path: '/',
      httpOnly: false, // accessible to client for greeting display
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao realizar login.' },
      { status: 500 }
    );
  }
}
