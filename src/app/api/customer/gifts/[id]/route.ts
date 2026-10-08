import { NextRequest, NextResponse } from 'next/server';
import { updateScheduledGiftRecipient } from '@/services/customer-portal.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: voucherId } = await params;
    const body = await request.json();
    const { purchaserUserId, recipientEmail, scheduledAt, recipientName } = body;

    if (!purchaserUserId || !recipientEmail || !scheduledAt) {
      return NextResponse.json(
        { success: false, error: 'Dados incompletos para atualização do presente.' },
        { status: 400 }
      );
    }

    const result = await updateScheduledGiftRecipient({
      voucherId,
      purchaserUserId,
      recipientEmail,
      scheduledAt: new Date(scheduledAt),
      recipientName,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar presente.' },
      { status: 500 }
    );
  }
}
