'use client';

import { useState } from 'react';

interface GiftItem {
  id: string;
  token: string;
  status: 'SCHEDULED' | 'ISSUED' | 'REDEEMED' | 'REVOKED';
  deliveryType: 'IMMEDIATE_LINK' | 'SCHEDULED_EMAIL';
  recipientName?: string | null;
  recipientEmail?: string | null;
  scheduledAt?: string | null;
  redeemedAt?: string | null;
  product: {
    name: string;
  };
  recipientUser?: {
    name: string;
    email: string;
  } | null;
}

export default function GiftsManager({
  initialGifts,
  purchaserUserId,
}: {
  initialGifts: GiftItem[];
  purchaserUserId: string;
}) {
  const [gifts, setGifts] = useState<GiftItem[]>(initialGifts);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [updateError, setUpdateError] = useState<string | null>(null);

  const copyClaimLink = (token: string) => {
    const url = `${window.location.origin}/resgatar/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const startEdit = (gift: GiftItem) => {
    setEditingVoucherId(gift.id);
    setEditEmail(gift.recipientEmail || '');
    setEditName(gift.recipientName || '');
    setEditDate(gift.scheduledAt ? new Date(gift.scheduledAt).toISOString().slice(0, 16) : '');
    setUpdateError(null);
  };

  const handleSaveEdit = async (voucherId: string) => {
    setUpdateError(null);
    try {
      const res = await fetch(`/api/customer/gifts/${voucherId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaserUserId,
          recipientEmail: editEmail,
          recipientName: editName,
          scheduledAt: editDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setUpdateError(data.error || 'Erro ao atualizar presente.');
        return;
      }

      setGifts(
        gifts.map((g) =>
          g.id === voucherId
            ? {
                ...g,
                recipientEmail: editEmail,
                recipientName: editName,
                scheduledAt: editDate,
              }
            : g
        )
      );
      setEditingVoucherId(null);
    } catch (e) {
      setUpdateError('Falha ao conectar ao servidor.');
    }
  };

  return (
    <div className="space-y-4">
      {updateError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
          ⚠ {updateError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {gifts.map((gift) => (
          <div
            key={gift.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    gift.status === 'REDEEMED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : gift.status === 'SCHEDULED'
                      ? 'bg-purple-100 text-purple-800'
                      : gift.status === 'REVOKED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {gift.status === 'REDEEMED'
                    ? '✓ Resgatado pelo beneficiário'
                    : gift.status === 'SCHEDULED'
                    ? '⏰ Envio Agendado'
                    : gift.status === 'REVOKED'
                    ? 'Cancelado'
                    : 'Aguardando Resgate'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{gift.product.name}</h3>
              </div>

              {gift.status !== 'REDEEMED' && gift.status !== 'REVOKED' && (
                <button
                  type="button"
                  onClick={() => copyClaimLink(gift.token)}
                  className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition"
                >
                  {copiedToken === gift.token ? '✓ Link Copiado!' : 'Copiar Link de Resgate'}
                </button>
              )}
            </div>

            <div className="text-sm text-slate-600 space-y-1">
              {gift.status === 'REDEEMED' && gift.redeemedAt && (
                <p className="text-emerald-700 font-semibold">
                  Resgatado em: {new Date(gift.redeemedAt).toLocaleDateString('pt-BR')} por{' '}
                  {gift.recipientUser?.name || 'Beneficiário'} ({gift.recipientUser?.email})
                </p>
              )}

              {gift.status === 'SCHEDULED' && (
                <div>
                  <p>
                    Destinatário:{' '}
                    <strong>{gift.recipientName || 'Não informado'}</strong> ({gift.recipientEmail})
                  </p>
                  <p>
                    Disparo programado para:{' '}
                    {gift.scheduledAt ? new Date(gift.scheduledAt).toLocaleString('pt-BR') : '-'}
                  </p>
                </div>
              )}
            </div>

            {gift.status === 'SCHEDULED' && (
              <div className="pt-2">
                {editingVoucherId === gift.id ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Editar Destinatário e Agendamento
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nome"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">
                          Nova data/hora de envio:
                        </label>
                        <input
                          type="datetime-local"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(gift.id)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                      >
                        Salvar Alterações
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingVoucherId(null)}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(gift)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    ✏ Alterar e-mail ou data agendada
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
