import type { Metadata } from 'next';
import './globals.css';
import Navbar from './components/navbar';

export const metadata: Metadata = {
  title: 'Sistema de Vendas de Produtos Digitais',
  description: 'Plataforma de e-commerce e retaguarda para venda de produtos digitais com destinação inteligente.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
