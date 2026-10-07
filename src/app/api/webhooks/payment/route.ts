import { NextRequest, NextResponse } from 'next/server';
import { processPaymentWebhook } from '@/services/payment-webhook.service';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get('x-signature') ||
      request.headers.get('x-hub-signature-256') ||
      request.headers.get('signature');

    const result = await processPaymentWebhook({
      rawBody,
      signature,
    });

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        error: result.error,
        alreadyProcessed: result.alreadyProcessed,
      },
      { status: result.status }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar webhook.',
      },
      { status: 500 }
    );
  }
}
