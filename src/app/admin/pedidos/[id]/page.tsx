import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminOrderDetail } from '@/services/admin-operations.service';
import { formatCurrencyBRL } from '@/lib/formatters';
import AdminRefundModal from './refund-modal';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrderDetail(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-6">
      <Link
        href="/admin/pedidos"
        className="text-sm font-semibold text-slate-500 hover:text-slate-700"
      >
        &larr; Voltar para a Lista de Pedidos
      </Link>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              Detalhe Administrativo
            </span>
            <h1 className="text-2xl font-black text-slate-900">{order.orderNumber}</h1>
            <p className="text-xs text-slate-500 mt-1">
              ID interno: <span className="font-mono">{order.id}</span>
            </p>
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                order.status === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800'
                  : order.status === 'REFUNDED'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {order.status}
            </span>
            <span className="block text-2xl font-black text-slate-900 mt-1">
              {formatCurrencyBRL(order.totalInCents)}
            </span>
          </div>
        </div>

        {order.hasRedeemedVouchers && order.status === 'PAID' && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-900 text-sm">
            <span className="text-xl">⚠</span>
            <div>
              <p className="font-bold">Atenção: Vouchers de presente já resgatados!</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Um ou mais vouchers vinculados a esta compra já foram ativados por terceiros. Ao realizar o estorno, confirme se o acesso do beneficiário também deve ser revogado.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Dados do Comprador
            </h3>
            <p className="text-sm font-bold text-slate-900">{order.user.name}</p>
            <p className="text-xs text-slate-600">{order.user.email}</p>
            <p className="text-xs font-mono text-slate-500 mt-1">CPF: {order.user.cpf}</p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Detalhes Financeiros
            </h3>
            <p className="text-xs text-slate-600">
              Meio: <strong className="text-slate-900">{order.paymentMethod}</strong>
            </p>
            <p className="text-xs text-slate-600">
              Subtotal: {formatCurrencyBRL(order.subtotalInCents)}
            </p>
            {order.discountInCents > 0 && (
              <p className="text-xs text-emerald-600 font-semibold">
                Desconto: -{formatCurrencyBRL(order.discountInCents)}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Data: {new Date(order.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Itens e Vouchers Vinculados</h3>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="border border-slate-200 rounded-xl p-4 bg-white space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.allocationMode === 'FOR_SELF'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {item.allocationMode === 'FOR_SELF' ? 'Uso Próprio' : 'Para Presente 🎁'}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{item.product.name}</h4>
                    <p className="text-xs text-slate-500">
                      Qtd: {item.quantity} x {formatCurrencyBRL(item.unitPriceInCents)}
                    </p>
                  </div>
                  <span className="font-bold text-sm text-slate-900">
                    {formatCurrencyBRL(item.totalPriceInCents)}
                  </span>
                </div>

                {item.giftVouchers.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Vouchers Emitidos ({item.giftVouchers.length}):
                    </span>
                    <div className="space-y-1.5">
                      {item.giftVouchers.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs"
                        >
                          <div>
                            <span className="font-mono text-slate-600">
                              {v.token.slice(0, 12)}...
                            </span>
                            {v.recipientUser && (
                              <span className="ml-2 text-slate-500">
                                (Resgatado por: {v.recipientUser.name})
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              v.status === 'REDEEMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : v.status === 'REVOKED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {v.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {order.status === 'PAID' && (
          <div className="pt-6 border-t border-slate-100">
            <AdminRefundModal
              orderId={order.id}
              orderNumber={order.orderNumber}
              hasRedeemedVouchers={order.hasRedeemedVouchers}
              operatorUserId={order.userId} // Simulated current operator
            />
          </div>
        )}

        {order.auditLogs.length > 0 && (
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <h3 className="text-base font-bold text-slate-900">Trilha de Auditoria Imutável</h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {order.auditLogs.map((log) => (
                <div key={log.id} className="p-4 bg-slate-50 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-rose-700">{log.action}</span>
                    <span className="text-slate-400">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-slate-700">
                    Operador: <strong>{log.operator.name}</strong> ({log.operator.email})
                  </p>
                  <p className="text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">
                    Justificativa: {log.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
