import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrencyBRL } from '@/lib/formatters';
import { generatePixCharge } from '@/lib/payment-gateway';

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      user: true,
      items: {
        include: {
          product: true,
          giftVouchers: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const isPix = order.paymentMethod === 'PIX';
  const pixData = isPix ? generatePixCharge(order.orderNumber, order.totalInCents) : null;

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pedido de Venda
            </span>
            <h1 className="text-2xl font-black text-slate-900">{order.orderNumber}</h1>
            <p className="text-sm text-slate-500">
              Cliente: {order.user.name} ({order.user.email})
            </p>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                order.status === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800'
                  : order.status === 'CANCELLED'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {order.status === 'PAID'
                ? 'PAGO & LIBERADO'
                : order.status === 'CANCELLED'
                ? 'CANCELADO'
                : 'AGUARDANDO PAGAMENTO'}
            </span>
            <span className="block text-2xl font-black text-slate-900 mt-1">
              {formatCurrencyBRL(order.totalInCents)}
            </span>
          </div>
        </div>

        {order.status === 'PENDING' && isPix && pixData && (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
              ⚡ Pagamento Instantâneo via Pix
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Escaneie o QR Code ou Copie a Chave Pix
            </h2>
            <div className="flex justify-center py-2">
              <img
                src={pixData.qrCodeDataUrl}
                alt="QR Code Pix"
                className="w-48 h-48 border border-slate-200 rounded-lg p-2 bg-white"
              />
            </div>
            <div className="text-left bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block mb-1 font-semibold">
                Código Copia e Cola:
              </span>
              <p className="font-mono text-xs text-slate-700 break-all select-all">
                {pixData.copiaECola}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Assim que o pagamento for detectado pelo gateway, sua conta receberá as licenças e vouchers automaticamente.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Itens do Pedido</h3>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {order.items.map((item) => (
              <div key={item.id} className="p-4 flex justify-between items-center bg-white">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold mb-1 ${
                      item.allocationMode === 'FOR_SELF'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    {item.allocationMode === 'FOR_SELF' ? 'Para Mim' : 'Para Presente 🎁'}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">{item.product.name}</h4>
                  <p className="text-xs text-slate-500">
                    Qtd: {item.quantity} x {formatCurrencyBRL(item.unitPriceInCents)}
                  </p>
                  {item.recipientName && (
                    <p className="text-xs text-slate-600 mt-1">
                      Destinatário: {item.recipientName} ({item.recipientEmail})
                    </p>
                  )}
                </div>
                <span className="font-bold text-sm text-slate-900">
                  {formatCurrencyBRL(item.totalPriceInCents)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link
            href="/catalogo"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            &larr; Voltar à Loja
          </Link>
          <Link
            href={`/minha-conta/produtos?userId=${order.userId}`}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
          >
            Acessar Meus Produtos &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
