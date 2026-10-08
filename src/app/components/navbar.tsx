'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(
    null
  );

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/catalogo');
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/catalogo" className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-black text-slate-900 tracking-tight text-lg">
              Vendas Digitais
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-sm font-semibold text-slate-600">
            <Link href="/catalogo" className="hover:text-indigo-600 transition">
              Catálogo
            </Link>
            <Link href="/carrinho" className="hover:text-indigo-600 transition">
              Carrinho
            </Link>
            <Link href="/minha-conta/produtos" className="hover:text-indigo-600 transition">
              Meus Produtos
            </Link>
            <Link href="/minha-conta/presentes" className="hover:text-indigo-600 transition">
              Presentes 🎁
            </Link>
            <Link href="/admin/pedidos" className="hover:text-rose-600 text-slate-500 transition">
              Admin
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
                Olá, <strong className="text-slate-900">{user.name.split(' ')[0]}</strong>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 border border-slate-200 rounded-lg hover:border-rose-200 transition"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
