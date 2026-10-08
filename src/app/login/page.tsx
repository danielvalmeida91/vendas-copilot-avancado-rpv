'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/minha-conta/produtos';

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Credenciais inválidas.');
        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setErrorMessage('Falha ao conectar com o servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="text-3xl">🔐</span>
          <h1 className="text-2xl font-black text-slate-900">Acesse sua Conta</h1>
          <p className="text-sm text-slate-500">
            Informe o e-mail ou CPF utilizado na sua compra para acessar seus produtos e vouchers.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            ⚠ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              E-mail ou CPF *
            </label>
            <input
              type="text"
              required
              placeholder="seu.email@exemplo.com ou CPF"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 text-sm"
          >
            {loading ? 'Identificando...' : 'Entrar na Minha Conta &rarr;'}
          </button>
        </form>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">Criação de Conta Transparente:</p>
          <p>
            Não exigimos cadastro de senha prévia. Se você comprou no checkout como visitante, seu cadastro foi gerado automaticamente!
          </p>
        </div>

        <div className="text-center pt-2 border-t border-slate-100">
          <Link
            href="/catalogo"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            &larr; Voltar ao Catálogo de Produtos
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Carregando formulário...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
