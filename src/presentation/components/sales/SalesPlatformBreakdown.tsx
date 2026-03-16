'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { PlatformSalesDto } from '@/application/usecases/GetSalesSummaryUseCase';

interface SalesPlatformBreakdownProps {
  readonly breakdown: PlatformSalesDto[];
}

const PLATFORM_COLORS: Record<string, string> = {
  minne: '#EC4899', // pink-500
  creema: '#F97316', // orange-500
};

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`;
}

export function SalesPlatformBreakdown({ breakdown }: SalesPlatformBreakdownProps) {
  const hasData = breakdown.some((b) => b.totalSales > 0);

  if (!hasData) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-white p-4"
        data-testid="sales-platform-breakdown-empty"
      >
        <p className="text-gray-500">データがありません</p>
      </div>
    );
  }

  const data = breakdown
    .filter((b) => b.totalSales > 0)
    .map((b) => ({
      name: b.platform,
      value: b.totalSales,
      orderCount: b.orderCount,
    }));

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      data-testid="sales-platform-breakdown"
    >
      <h3 className="mb-4 text-sm font-medium text-gray-700">プラットフォーム別構成比</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={PLATFORM_COLORS[entry.name] ?? '#6B7280'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, props) => {
                const numValue = typeof value === 'number' ? value : 0;
                const orderCount = props?.payload?.orderCount ?? 0;
                return [`${formatCurrency(numValue)} (${orderCount}件)`, name];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
