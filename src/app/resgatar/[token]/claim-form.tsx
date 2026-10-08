'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ClaimForm({ token }: { token: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ productName: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/claim/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiary: { name, email, cpf },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Erro ao resgatar voucher.');
        setIsSubmitting(false);
        return;
      }

      setSuccessData({ productName: data.productName });
    } catch (err) {
      setErrorMessage('Erro de conexão com o servidor.');
      setIsSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
        <span className="text-4xl">🎉</span>
        <h3 className="text-xl font-bold text-emerald-900">Parabéns! Resgate Concluído!</h3>
        <p className="text-sm text-emerald-800">
          O acesso a <strong>{successData.productName}</strong> foi ativado com sucesso em sua conta.
        </p>
        <div className="pt-2">
          <Link
            href="/minha-conta/produtos"
            className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition"
          >
            Acessar Meu Conteúdo &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
          ⚠ {errorMessage}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
          Seu Nome Completo *
        </label>
        <input
          type="text"
          required
          placeholder="Ex: Carlos Silva"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Seu E-mail *
          </label>
          <input
            type="email"
            required
            placeholder="seu.email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Seu CPF *
          </label>
          <input
            type="text"
            required
            maxLength={14}
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
      >
        {isSubmitting ? 'Resgatando...' : 'Ativar Presente na Minha Conta'}
      </button>
    </form>
  );
}
