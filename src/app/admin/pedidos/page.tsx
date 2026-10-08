import Link from 'next/link';
import { listAdminOrders } from '@/services/admin-operations.service';
import { formatCurrencyBRL } from '@/lib/formatters';
import { OrderStatus } from '@prisma/client';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: OrderStatus; search?: string }>;
}) {
  const resolved = searchParams ? await searchParams : {};
  const orders = await listAdminOrders({
    status: resolved.status,
    search: resolved.search,
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
            Retaguarda Operacional
          </span>
          <h1 className="text-3xl font-black text-slate-900">Gestão de Pedidos & Fila de Estorno</h1>
          <p className="text-slate-600 text-sm mt-1">
            Consulta de vendas, acompanhamento de vouchers e atendimento a estornos (CDC 7 dias).
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/relatorios"
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            Exportar Relatórios Fiscais 📊
          </Link>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Buscar Pedido / Cliente / CPF
            </label>
            <input
              type="text"
              name="search"
              defaultValue={resolved.search || ''}
              placeholder="Ex: ORD-..., João, 123456"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Status do Pedido
            </label>
            <select
              name="status"
              defaultValue={resolved.status || ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">Todos os status</option>
              <option value="PAID">PAID (Liquidado)</option>
              <option value="PENDING">PENDING (Aguardando)</option>
              <option value="REFUNDED">REFUNDED (Estornado)</option>
              <option value="CANCELLED">CANCELLED (Cancelado)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 transition"
            >
              Filtrar Pedidos
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Pedido</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Meio</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Nenhum pedido encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {o.orderNumber}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800 block">{o.user.name}</span>
                      <span className="text-xs text-slate-400">{o.user.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          o.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.status === 'REFUNDED'
                            ? 'bg-rose-100 text-rose-800'
                            : o.status === 'CANCELLED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-xs text-slate-700">
                      {o.paymentMethod}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatCurrencyBRL(o.totalInCents)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/pedidos/${o.id}`}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition inline-block"
                      >
                        Inspecionar &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
