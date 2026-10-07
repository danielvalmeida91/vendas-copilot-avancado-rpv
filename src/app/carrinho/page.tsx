'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatCurrencyBRL } from '@/lib/formatters';
import { CartCalculationResult, ValidatedCartItem } from '@/services/cart.service';

interface LocalCartItem {
  productId: string;
  allocationMode: 'FOR_SELF' | 'FOR_GIFT';
  quantity: number;
  giftDeliveryType?: 'IMMEDIATE_LINK' | 'SCHEDULED_EMAIL';
  recipientName?: string;
  recipientEmail?: string;
  giftScheduledAt?: string;
  giftMessage?: string;
}

function CartContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<LocalCartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [calculation, setCalculation] = useState<CartCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  // Initialize cart from URL searchParams or localStorage
  useEffect(() => {
    const action = searchParams.get('action');
    const productId = searchParams.get('productId');
    const allocationMode = (searchParams.get('allocationMode') as 'FOR_SELF' | 'FOR_GIFT') || 'FOR_SELF';

    let initialItems: LocalCartItem[] = [];
    const saved = localStorage.getItem('vendas_cart');
    if (saved) {
      try {
        initialItems = JSON.parse(saved);
      } catch (e) {
        initialItems = [];
      }
    }

    if (action === 'add' && productId) {
      const existingIndex = initialItems.findIndex(
        (i) => i.productId === productId && i.allocationMode === allocationMode
      );
      if (existingIndex >= 0) {
        if (allocationMode === 'FOR_GIFT') {
          initialItems[existingIndex].quantity += 1;
        }
      } else {
        initialItems.push({
          productId,
          allocationMode,
          quantity: 1,
          giftDeliveryType: allocationMode === 'FOR_GIFT' ? 'IMMEDIATE_LINK' : undefined,
        });
      }
      localStorage.setItem('vendas_cart', JSON.stringify(initialItems));
    }

    setItems(initialItems);
  }, [searchParams]);

  // Recalculate cart whenever items or coupon changes
  const refreshCalculation = async (currentItems: LocalCartItem[], coupon?: string) => {
    if (currentItems.length === 0) {
      setCalculation(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cart/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: currentItems,
          couponCode: coupon || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCalculation(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCalculation(items, couponCode);
  }, [items]);

  const updateItemQuantity = (index: number, newQty: number) => {
    const updated = [...items];
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setItems(updated);
    localStorage.setItem('vendas_cart', JSON.stringify(updated));
  };

  const updateGiftDeliveryType = (index: number, type: 'IMMEDIATE_LINK' | 'SCHEDULED_EMAIL') => {
    const updated = [...items];
    updated[index].giftDeliveryType = type;
    setItems(updated);
    localStorage.setItem('vendas_cart', JSON.stringify(updated));
  };

  const updateGiftRecipient = (
    index: number,
    field: 'recipientName' | 'recipientEmail' | 'giftScheduledAt' | 'giftMessage',
    value: string
  ) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
    localStorage.setItem('vendas_cart', JSON.stringify(updated));
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
    localStorage.setItem('vendas_cart', JSON.stringify(updated));
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponMessage(null);
    await refreshCalculation(items, couponCode.trim());
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Seu Carrinho</h1>
        <Link
          href="/catalogo"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          &larr; Continuar Comprando
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-600 text-lg mb-6">Seu carrinho de compras está vazio.</p>
          <Link
            href="/catalogo"
            className="inline-flex items-center px-6 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            Explorar Catálogo Digital
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {calculation?.errors && calculation.errors.length > 0 && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                {calculation.errors.map((err, i) => (
                  <p key={i} className="text-sm font-semibold text-rose-700">
                    ⚠ {err.message}
                  </p>
                ))}
              </div>
            )}

            {calculation?.items.map((item: ValidatedCartItem, index: number) => (
              <div
                key={`${item.productId}-${item.allocationMode}-${index}`}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2 ${
                        item.allocationMode === 'FOR_SELF'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {item.allocationMode === 'FOR_SELF' ? 'Para Mim' : 'Para Presente 🎁'}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{item.productName}</h3>
                    <p className="text-sm text-slate-500">
                      Preço Unitário: {formatCurrencyBRL(item.unitPriceInCents)}
                    </p>
                  </div>

                  <button
                    onClick={() => removeItem(index)}
                    className="text-sm text-rose-500 hover:text-rose-700 font-medium"
                  >
                    Remover
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">Quantidade:</span>
                    {item.allocationMode === 'FOR_SELF' ? (
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-md text-sm font-semibold">
                        1 (Trava para uso próprio)
                      </span>
                    ) : (
                      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateItemQuantity(index, item.quantity - 1)}
                          className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold"
                        >
                          -
                        </button>
                        <span className="px-4 py-1 text-sm font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateItemQuantity(index, item.quantity + 1)}
                          className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  <span className="text-lg font-extrabold text-slate-900">
                    {formatCurrencyBRL(item.totalPriceInCents)}
                  </span>
                </div>

                {item.allocationMode === 'FOR_GIFT' && (
                  <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Opção de Entrega do Presente
                    </span>
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`deliveryType-${index}`}
                          checked={items[index]?.giftDeliveryType !== 'SCHEDULED_EMAIL'}
                          onChange={() => updateGiftDeliveryType(index, 'IMMEDIATE_LINK')}
                        />
                        <span>Gerar Link de Resgate Imediato</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`deliveryType-${index}`}
                          checked={items[index]?.giftDeliveryType === 'SCHEDULED_EMAIL'}
                          onChange={() => updateGiftDeliveryType(index, 'SCHEDULED_EMAIL')}
                        />
                        <span>Agendar Envio por E-mail</span>
                      </label>
                    </div>

                    {items[index]?.giftDeliveryType === 'SCHEDULED_EMAIL' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <input
                          type="text"
                          placeholder="Nome do presenteado"
                          value={items[index]?.recipientName || ''}
                          onChange={(e) => updateGiftRecipient(index, 'recipientName', e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <input
                          type="email"
                          placeholder="E-mail do presenteado"
                          value={items[index]?.recipientEmail || ''}
                          onChange={(e) => updateGiftRecipient(index, 'recipientEmail', e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-slate-500 mb-1">
                            Data e hora de envio programado:
                          </label>
                          <input
                            type="datetime-local"
                            value={items[index]?.giftScheduledAt || ''}
                            onChange={(e) => updateGiftRecipient(index, 'giftScheduledAt', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit space-y-6">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
              Resumo do Pedido
            </h2>

            <form onSubmit={handleApplyCoupon} className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Cupom Promocional
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: PROMO10"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
                >
                  Aplicar
                </button>
              </div>
              {calculation?.coupon && (
                <p className="text-xs text-emerald-600 font-semibold">
                  ✓ Cupom {calculation.coupon.code} aplicado com sucesso!
                </p>
              )}
            </form>

            <div className="space-y-3 pt-4 border-t border-slate-100 text-sm">
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

              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-3 border-t border-slate-100">
                <span>Total</span>
                <span>{formatCurrencyBRL(calculation?.totalInCents || 0)}</span>
              </div>
            </div>

            <Link
              href={
                calculation && calculation.isValid && calculation.items.length > 0
                  ? `/checkout?coupon=${couponCode}`
                  : '#'
              }
              className={`block w-full text-center py-3.5 rounded-xl font-bold text-white shadow-sm transition ${
                calculation && calculation.isValid && calculation.items.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-slate-300 cursor-not-allowed pointer-events-none'
              }`}
            >
              Ir para o Checkout Transparente &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Carregando carrinho...</div>}>
      <CartContent />
    </Suspense>
  );
}
