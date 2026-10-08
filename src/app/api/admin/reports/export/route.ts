import { NextRequest, NextResponse } from 'next/server';
import {
  generateFinancialReport,
  exportReportAsCsv,
  exportReportAsJson,
} from '@/services/financial-reports.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const includeCancelled = searchParams.get('includeCancelled') === 'true';

    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    const report = await generateFinancialReport({
      startDate,
      endDate,
      includeCancelled,
    });

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      const jsonOutput = exportReportAsJson(report);
      return new NextResponse(jsonOutput, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="relatorio-vendas-${dateStr}.json"`,
        },
      });
    }

    const csvOutput = exportReportAsCsv(report);
    return new NextResponse(csvOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-vendas-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao exportar relatório.' },
      { status: 500 }
    );
  }
}
