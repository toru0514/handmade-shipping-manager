'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { PlatformSalesDto } from '@/application/usecases/GetSalesSummaryUseCase';
import { EmptyState } from '@/presentation/components/common';

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
    return <EmptyState message="データがありません" data-testid="sales-platform-breakdown-empty" />;
  }

  const data = breakdown
    .filter((b) => b.totalSales > 0)
    .map((b) => ({
      name: b.platform,
      value: b.totalSales,
      orderCount: b.orderCount,
    }));

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="sales-platform-breakdown">
      <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mb: 2 }}>
        プラットフォーム別構成比
      </Typography>
      <Box sx={{ height: 256 }}>
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
      </Box>
    </Paper>
  );
}
