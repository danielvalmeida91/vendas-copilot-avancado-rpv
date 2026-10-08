'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRefundModal({
  orderId,
  orderNumber,
  hasRedeemedVouchers,
  operatorUserId,
}: {
  orderId: string;
  orderNumber: string;
  hasRedeemedVouchers: boolean;
  operatorUserId: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [revokeRedeemed, setRevokeRedeemed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorUserId,
          reason,
          revokeRedeemedAccess: revokeRedeemed,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Erro ao processar estorno.');
        setLoading(false);
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch (e) {
      setErrorMsg('Falha de comunicação com o servidor.');
      setLoading(false);
    }
  };

  return (
    <div>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition"
        >
          Iniciar Estorno / Cancelamento Assistido (CDC 7d)
        </button>
      ) : (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-rose-900">
              Confirmar Estorno Assistido — {orderNumber}
            </h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900"
            >
              Cancelar
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-white border border-rose-300 rounded-lg text-rose-700 text-xs font-bold">
              ⚠ {errorMsg}
            </div>
          )}

          {hasRedeemedVouchers && (
            <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-900 text-xs">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={revokeRedeemed}
                  onChange={(e) => setRevokeRedeemed(e.target.checked)}
                  className="mt-0.5 rounded border-amber-400"
                />
                <span>
                  <strong>Revogar acessos já ativados por beneficiários de vouchers.</strong> (Se
                  desmarcado, o comprador é reembolsado mas o amigo presenteado mantém a licença).
                </span>
              </label>
            </div>
          )}

          <form onSubmit={handleRefund} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-900 mb-1">
                Justificativa Obrigatória para Auditoria *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Informe o motivo formal do estorno (Ex: Direito de arrependimento em 7 dias, solicitação de suporte #1234)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-rose-300 rounded-xl text-sm bg-white"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
              >
                {loading ? 'Processando Estorno...' : 'Aprovar Estorno e Revogar Licenças'}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-300"
              >
                Voltar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
