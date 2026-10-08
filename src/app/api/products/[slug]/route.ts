import { NextRequest, NextResponse } from 'next/server';
import { getProductBySlug } from '@/services/catalog.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;

    const product = await getProductBySlug(slug, { userId });
    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao carregar detalhes do produto.' },
      { status: 500 }
    );
  }
}
