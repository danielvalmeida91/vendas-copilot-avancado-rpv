import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug } from '@/services/catalog.service';
import { formatCurrencyBRL } from '@/lib/formatters';

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ userId?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const product = await getProductBySlug(slug, { userId: resolvedSearchParams.userId });

  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Link
        href="/catalogo"
        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-700 mb-6"
      >
        &larr; Voltar ao Catálogo
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Produto Digital • Liberação Imediata
          </span>
          {product.hasActiveLicense && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              ✓ Licença Ativa na sua conta
            </span>
          )}
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 mb-4 sm:text-4xl">
          {product.name}
        </h1>

        <p className="text-slate-600 text-lg leading-relaxed mb-8 whitespace-pre-line">
          {product.description}
        </p>

        {product.hasActiveLicense && (
          <div className="p-4 mb-8 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-sm">
            <p className="font-semibold">Você já possui este produto em sua conta!</p>
            <p className="mt-1 text-blue-700">
              A compra para uso próprio está desabilitada para evitar cobranças duplicadas. No entanto, você ainda pode adquirir licenças adicionais para presentear amigos ou familiares.
            </p>
          </div>
        )}

        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-sm text-slate-500 block">Preço único</span>
            <span className="text-3xl font-black text-slate-900">
              {formatCurrencyBRL(product.priceInCents)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {product.canPurchaseForSelf ? (
              <form action="/carrinho" method="GET">
                <input type="hidden" name="action" value="add" />
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="allocationMode" value="FOR_SELF" />
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
                >
                  Comprar para Mim
                </button>
              </form>
            ) : (
              <button
                disabled
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-slate-400 bg-slate-200 cursor-not-allowed"
                title="Você já possui este produto ativo."
              >
                Comprar para Mim (Já Adquirido)
              </button>
            )}

            <form action="/carrinho" method="GET">
              <input type="hidden" name="action" value="add" />
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="allocationMode" value="FOR_GIFT" />
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition"
              >
                Comprar para Presente 🎁
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
