import Link from 'next/link';
import { getCustomerPurchasedGifts } from '@/services/customer-portal.service';
import GiftsManager from './gifts-manager';

export default async function CustomerGiftsPage({
  searchParams,
}: {
  searchParams?: Promise<{ userId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const userId = resolvedParams.userId;

  const gifts = userId ? await getCustomerPurchasedGifts(userId) : [];

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Painel do Cliente
          </span>
          <h1 className="text-3xl font-black text-slate-900">Meus Presentes Enviados</h1>
          <p className="text-slate-600 text-sm mt-1">
            Gerencie vouchers de presente adquiridos, acompanhe resgates e atualize destinatários agendados.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/minha-conta/produtos${userId ? `?userId=${userId}` : ''}`}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            &larr; Meus Produtos
          </Link>
          <Link
            href="/catalogo"
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Comprar Mais Presentes 🎁
          </Link>
        </div>
      </div>

      {!userId ? (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center">
          <p className="text-slate-600">Identificação de usuário necessária para carregar presentes.</p>
        </div>
      ) : gifts.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-4">
          <p className="text-slate-600 text-lg">Você ainda não adquiriu produtos na modalidade presente.</p>
          <Link
            href="/catalogo"
            className="inline-block px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition"
          >
            Explorar Produtos para Presentear
          </Link>
        </div>
      ) : (
        <GiftsManager initialGifts={JSON.parse(JSON.stringify(gifts))} purchaserUserId={userId} />
      )}
    </div>
  );
}
