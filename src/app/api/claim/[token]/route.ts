import { NextRequest, NextResponse } from 'next/server';
import { getVoucherByToken, claimGiftVoucher } from '@/services/gift-claim.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const result = await getVoucherByToken(token);

    if (!result.isValid) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao consultar voucher de presente.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const beneficiary = body.beneficiary;

    if (!beneficiary) {
      return NextResponse.json(
        { success: false, error: 'Dados do beneficiário são obrigatórios.' },
        { status: 400 }
      );
    }

    const result = await claimGiftVoucher({ token, beneficiary });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao resgatar voucher.' },
      { status: 500 }
    );
  }
}
