import { NextRequest, NextResponse } from 'next/server';
import { processAssistedRefund } from '@/services/admin-operations.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { operatorUserId, reason, revokeRedeemedAccess } = body;

    if (!operatorUserId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Operador e justificativa são obrigatórios para estorno.' },
        { status: 400 }
      );
    }

    const result = await processAssistedRefund({
      orderId,
      operatorUserId,
      reason,
      revokeRedeemedAccess: Boolean(revokeRedeemedAccess),
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao processar estorno assistido.' },
      { status: 500 }
    );
  }
}
