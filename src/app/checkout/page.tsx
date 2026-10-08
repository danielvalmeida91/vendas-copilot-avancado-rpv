'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrencyBRL } from '@/lib/formatters';
import { CartCalculationResult } from '@/services/cart.service';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponParam = searchParams.get('coupon') || '';

  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    cpf: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [calculation, setCalculation] = useState<CartCalculationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('vendas_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCartItems(parsed);
      } catch (e) {
        setCartItems([]);
      }
    }
  }, []);

  useEffect(() => {
    if (cartItems.length === 0) return;

    fetch('/api/cart/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cartItems,
        couponCode: couponParam || undefined,
      }),
    })
      .then((res) => res.json())
      .then((data) => setCalculation(data))
      .catch((err) => console.error(err));
  }, [cartItems, couponParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          paymentMethod,
          items: cartItems,
          couponCode: couponParam || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(
          data.errors ? data.errors.join(', ') : 'Erro ao processar o checkout.'
        );
        setIsSubmitting(false);
        return;
      }

      // Clear local cart
      localStorage.removeItem('vendas_cart');

      // Redirect to payment/order details page
      router.push(`/pedido/${data.order.orderNumber}`);
    } catch (err) {
      setErrorMessage('Falha na comunicação com o servidor.');
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Seu carrinho está vazio</h1>
        <p className="text-slate-600 mb-6">Adicione itens ao carrinho antes de prosseguir para o checkout.</p>
        <Link
          href="/catalogo"
          className="inline-flex items-center px-6 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
        >
          Ir ao Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Link
        href="/carrinho"
        className="text-sm font-semibold text-slate-500 hover:text-slate-700 mb-6 inline-block"
      >
        &larr; Voltar para o Carrinho
      </Link>

      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          Checkout Transparente
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Dados do Comprador e Pagamento
        </h1>
        <p className="mt-1 text-slate-600">
          Criação de conta em segundo plano. Sem necessidade de cadastrar senha antecipada.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 mb-8 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
          ⚠ {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              1. Identificação do Comprador
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Usado para enviar o acesso e vouchers.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    CPF *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={customer.cpf}
                    onChange={(e) => setCustomer({ ...customer, cpf: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Apenas dígitos para emissão fiscal.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              2. Forma de Pagamento
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <label
                className={`p-4 border-2 rounded-xl cursor-pointer flex flex-col items-center justify-center text-center transition ${
                  paymentMethod === 'PIX'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="PIX"
                  checked={paymentMethod === 'PIX'}
                  onChange={() => setPaymentMethod('PIX')}
                  className="sr-only"
                />
                <span className="text-xl mb-1">⚡</span>
                <span className="font-bold text-sm">Pix Instantâneo</span>
                <span className="text-xs text-slate-500 mt-1">Liberação em segundos</span>
              </label>

              <label
                className={`p-4 border-2 rounded-xl cursor-pointer flex flex-col items-center justify-center text-center transition ${
                  paymentMethod === 'CREDIT_CARD'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CREDIT_CARD"
                  checked={paymentMethod === 'CREDIT_CARD'}
                  onChange={() => setPaymentMethod('CREDIT_CARD')}
                  className="sr-only"
                />
                <span className="text-xl mb-1">💳</span>
                <span className="font-bold text-sm">Cartão de Crédito</span>
                <span className="text-xs text-slate-500 mt-1">Checkout transparente</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            Resumo do Pedido
          </h2>

          <div className="space-y-3">
            {calculation?.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <div>
                  <span className="font-medium text-slate-800 block">{item.productName}</span>
                  <span className="text-xs text-slate-500">
                    {item.allocationMode === 'FOR_SELF' ? 'Para Mim' : `Presente (x${item.quantity})`}
                  </span>
                </div>
                <span className="font-semibold text-slate-900">
                  {formatCurrencyBRL(item.totalPriceInCents)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrencyBRL(calculation?.subtotalInCents || 0)}</span>
            </div>
            {calculation?.discountInCents ? (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Desconto</span>
                <span>- {formatCurrencyBRL(calculation.discountInCents)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-lg font-black text-slate-900 pt-3 border-t border-slate-100">
              <span>Total a pagar</span>
              <span>{formatCurrencyBRL(calculation?.totalInCents || 0)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition disabled:opacity-50"
          >
            {isSubmitting ? 'Finalizando...' : 'Concluir Pedido & Pagar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Carregando checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
