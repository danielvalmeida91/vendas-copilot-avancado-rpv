import { NextRequest, NextResponse } from 'next/server';
import { dispatchDueScheduledGifts } from '@/services/scheduled-dispatch.service';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const result = await dispatchDueScheduledGifts();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao processar rotina de disparo.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
