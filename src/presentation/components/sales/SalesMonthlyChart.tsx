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
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { MonthlySalesDto } from '@/application/usecases/GetSalesSummaryUseCase';
import { EmptyState } from '@/presentation/components/common';
import { formatCurrency } from '@/presentation/utils/format';

interface SalesMonthlyChartProps {
  readonly breakdown: MonthlySalesDto[];
}

function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${year}/${month}`;
}

export function SalesMonthlyChart({ breakdown }: SalesMonthlyChartProps) {
  const hasData = breakdown.some((b) => b.totalSales > 0);

  if (!hasData) {
    return <EmptyState message="データがありません" data-testid="sales-monthly-chart-empty" />;
  }

  const data = breakdown.map((b) => ({
    month: formatMonth(b.yearMonth),
    売上: b.totalSales,
    件数: b.orderCount,
  }));

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="sales-monthly-chart">
      <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mb: 2 }}>
        月別売上推移
      </Typography>
      <Box sx={{ height: 256 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => {
                if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(0)}億`;
                if (value >= 10_000) return `${(value / 10_000).toFixed(0)}万`;
                if (value >= 1_000) return `${(value / 1_000).toFixed(0)}千`;
                return `${value}`;
              }}
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
      </Box>
    </Paper>
  );
}
