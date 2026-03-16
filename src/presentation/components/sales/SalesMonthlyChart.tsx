'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MonthlySalesDto } from '@/application/usecases/GetSalesSummaryUseCase';

interface SalesMonthlyChartProps {
  readonly breakdown: MonthlySalesDto[];
}

function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${year}/${month}`;
}

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`;
}

export function SalesMonthlyChart({ breakdown }: SalesMonthlyChartProps) {
  const hasData = breakdown.some((b) => b.totalSales > 0);

  if (!hasData) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-white p-4"
        data-testid="sales-monthly-chart-empty"
      >
        <p className="text-gray-500">データがありません</p>
      </div>
    );
  }

  const data = breakdown.map((b) => ({
    month: formatMonth(b.yearMonth),
    売上: b.totalSales,
    件数: b.orderCount,
  }));

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      data-testid="sales-monthly-chart"
    >
      <h3 className="mb-4 text-sm font-medium text-gray-700">月別売上推移</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => `¥${(value / 1000).toFixed(0)}k`}
            />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, name) => {
                const numValue = typeof value === 'number' ? value : 0;
                if (name === '売上') {
                  return [formatCurrency(numValue), name];
                }
                return [`${numValue}件`, name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="売上" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="件数" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
