import { NextRequest, NextResponse } from 'next/server';
import { listAdminOrders } from '@/services/admin-operations.service';
import { OrderStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as OrderStatus | undefined;
    const search = searchParams.get('search') || undefined;

    const orders = await listAdminOrders({ status, search });
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao carregar lista de pedidos administrativos.' },
      { status: 500 }
    );
  }
}
