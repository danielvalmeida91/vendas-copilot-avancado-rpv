import Link from 'next/link';
import { listCatalogProducts } from '@/services/catalog.service';
import { formatCurrencyBRL } from '@/lib/formatters';

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams?: Promise<{ userId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const products = await listCatalogProducts({ userId: resolvedParams.userId });

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-sm font-semibold tracking-wider text-indigo-600 uppercase">
            Loja Oficial
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Catálogo de Produtos Digitais
          </h1>
          <p className="mt-2 text-slate-600">
            Acesso imediato a cursos, infoprodutos e licenças com entrega 100% digital.
          </p>
        </div>
        <Link
          href="/carrinho"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition"
        >
          Ver Carrinho
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex flex-col bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Produto Digital
              </span>
              {product.hasActiveLicense && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Já adquirido
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {product.name}
            </h3>
            <p className="text-slate-600 text-sm flex-1 mb-4">
              {product.description}
            </p>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Preço</span>
                <span className="text-2xl font-extrabold text-slate-900">
                  {formatCurrencyBRL(product.priceInCents)}
                </span>
              </div>
              <Link
                href={`/catalogo/${product.slug}`}
                className="inline-flex items-center px-3.5 py-2 text-sm font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
              >
                Detalhes &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
