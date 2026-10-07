import Link from 'next/link';
import { generateFinancialReport } from '@/services/financial-reports.service';
import { formatCurrencyBRL } from '@/lib/formatters';

export default async function FinancialReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ startDate?: string; endDate?: string; includeCancelled?: string }>;
}) {
  const resolved = searchParams ? await searchParams : {};

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const defaultEnd = now.toISOString().slice(0, 10);

  const startDateStr = resolved.startDate || defaultStart;
  const endDateStr = resolved.endDate || defaultEnd;
  const includeCancelled = resolved.includeCancelled === 'true';

  const report = await generateFinancialReport({
    startDate: new Date(`${startDateStr}T00:00:00Z`),
    endDate: new Date(`${endDateStr}T23:59:59Z`),
    includeCancelled,
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Controladoria & Fiscal
          </span>
          <h1 className="text-3xl font-black text-slate-900">Relatórios Financeiros & Fiscais</h1>
          <p className="text-slate-600 text-sm mt-1">
            Consolidação de vendas liquidadas para atendimento contábil e emissão de notas fiscais.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/pedidos"
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            &larr; Gestão de Pedidos
          </Link>
          <a
            href={`/api/admin/reports/export?startDate=${startDateStr}&endDate=${endDateStr}&includeCancelled=${includeCancelled}&format=csv`}
            download
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
          >
            Exportar CSV 📥
          </a>
          <a
            href={`/api/admin/reports/export?startDate=${startDateStr}&endDate=${endDateStr}&includeCancelled=${includeCancelled}&format=json`}
            download
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            Exportar JSON 📥
          </a>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              name="startDate"
              defaultValue={startDateStr}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Data Final
            </label>
            <input
              type="date"
              name="endDate"
              defaultValue={endDateStr}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            />
          </div>

          <div className="flex items-center gap-2 pb-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                name="includeCancelled"
                value="true"
                defaultChecked={includeCancelled}
                className="rounded border-slate-300"
              />
              <span>Incluir Cancelados/Estornos</span>
            </label>
          </div>

          <div>
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 transition"
            >
              Atualizar Período
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            Faturamento Bruto
          </span>
          <span className="text-2xl font-black text-slate-900 block mt-2">
            {formatCurrencyBRL(report.totalGrossInCents)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {report.totalOrders} pedidos computados
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            Total em Descontos
          </span>
          <span className="text-2xl font-black text-rose-600 block mt-2">
            -{formatCurrencyBRL(report.totalDiscountsInCents)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Cupons e abatimentos</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            Faturamento Líquido
          </span>
          <span className="text-2xl font-black text-emerald-600 block mt-2">
            {formatCurrencyBRL(report.totalNetInCents)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Base líquida de caixa</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            Tributos Estimados (6%)
          </span>
          <span className="text-2xl font-black text-indigo-600 block mt-2">
            {formatCurrencyBRL(report.totalEstimatedTaxesInCents)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Estimativa Simples/ISS</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Extrato Consolidado por Pedido</h2>
          <span className="text-xs text-slate-500 font-mono">
            Período: {startDateStr} a {endDateStr}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Pedido</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">CPF</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Meio</th>
                <th className="px-6 py-4">Bruto</th>
                <th className="px-6 py-4">Desconto</th>
                <th className="px-6 py-4">Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    Nenhuma movimentação financeira encontrada para o período.
                  </td>
                </tr>
              ) : (
                report.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      {new Date(row.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {row.orderNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-800">{row.customerName}</td>
                    <td className="px-6 py-4 font-mono text-xs">{row.customerCpf}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          row.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.status === 'REFUNDED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold">{row.paymentMethod}</td>
                    <td className="px-6 py-4">{formatCurrencyBRL(row.grossAmountInCents)}</td>
                    <td className="px-6 py-4 text-rose-600">
                      {row.discountAmountInCents > 0
                        ? `-${formatCurrencyBRL(row.discountAmountInCents)}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatCurrencyBRL(row.netAmountInCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
