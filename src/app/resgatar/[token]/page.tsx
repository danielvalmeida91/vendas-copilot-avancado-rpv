import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getVoucherByToken } from '@/services/gift-claim.service';
import ClaimForm from './claim-form';

export default async function ClaimGiftPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getVoucherByToken(token);

  if (!data.isValid || !data.voucher) {
    notFound();
  }

  const { voucher } = data;

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl">🎁</span>
          <span className="block text-xs font-bold uppercase tracking-wider text-indigo-600">
            Você Ganhou um Presente!
          </span>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Resgatar Produto Digital
          </h1>
          <p className="text-slate-600 text-sm">
            Enviado com carinho por{' '}
            <strong className="text-slate-800">{voucher.purchaserUser.name}</strong>.
          </p>
        </div>

        <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-2">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
            Produto Digital
          </span>
          <h2 className="text-xl font-bold text-slate-900">{voucher.product.name}</h2>
          <p className="text-slate-600 text-sm">{voucher.product.description}</p>
          {voucher.giftMessage && (
            <div className="mt-4 pt-3 border-t border-indigo-100 text-xs italic text-indigo-900">
              "{voucher.giftMessage}"
            </div>
          )}
        </div>

        {!data.canClaim ? (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
            <span className="text-2xl">🔒</span>
            <h3 className="font-bold text-amber-900">
              {data.status === 'REDEEMED' ? 'Presente Já Resgatado' : 'Voucher Indisponível'}
            </h3>
            <p className="text-sm text-amber-800">
              {data.error || 'Este voucher não pode mais ser ativado.'}
            </p>
            <Link
              href="/catalogo"
              className="inline-block mt-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
            >
              Conhecer a Loja
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
              Informe seus dados para ativar o acesso
            </h3>
            <ClaimForm token={token} />
          </div>
        )}
      </div>
    </div>
  );
}
