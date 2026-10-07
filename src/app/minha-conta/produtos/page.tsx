import Link from 'next/link';
import { getCustomerLicenses } from '@/services/customer-portal.service';

export default async function CustomerLicensesPage({
  searchParams,
}: {
  searchParams?: Promise<{ userId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const userId = resolvedParams.userId;

  const licenses = userId ? await getCustomerLicenses(userId) : [];

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Painel do Cliente
          </span>
          <h1 className="text-3xl font-black text-slate-900">Meus Produtos</h1>
          <p className="text-slate-600 text-sm mt-1">
            Licenças e conteúdos digitais ativos associados à sua conta.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/minha-conta/presentes${userId ? `?userId=${userId}` : ''}`}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Meus Presentes Enviados 🎁
          </Link>
          <Link
            href="/catalogo"
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Explorar Loja
          </Link>
        </div>
      </div>

      {!userId ? (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center">
          <p className="text-slate-600">Identificação de usuário necessária para carregar produtos.</p>
        </div>
      ) : licenses.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-4">
          <p className="text-slate-600 text-lg">Você ainda não possui produtos ativos em sua conta.</p>
          <Link
            href="/catalogo"
            className="inline-block px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition"
          >
            Ver Catálogo de Produtos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {licenses.map((lic) => (
            <div
              key={lic.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Acesso Liberado
                  </span>
                  <span className="text-xs text-slate-400">
                    Ativado em {new Date(lic.activatedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{lic.product.name}</h3>
                <p className="text-sm text-slate-600 mb-4">{lic.product.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">
                  Pedido: {lic.order.orderNumber}
                </span>
                <button
                  type="button"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
                >
                  Acessar Conteúdo &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
