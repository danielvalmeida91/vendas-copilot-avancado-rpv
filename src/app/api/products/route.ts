import { NextRequest, NextResponse } from 'next/server';
import { listCatalogProducts } from '@/services/catalog.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;

    const products = await listCatalogProducts({ userId });
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao carregar catálogo de produtos.' },
      { status: 500 }
    );
  }
}
