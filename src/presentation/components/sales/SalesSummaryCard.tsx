'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { formatCurrency } from '@/presentation/utils/format';

interface SalesSummaryCardProps {
  readonly totalSales: number;
  readonly totalOrders: number;
  readonly averageOrderValue: number;
  readonly ordersWithMissingPrice?: number;
}

export function SalesSummaryCard({
  totalSales,
  totalOrders,
  averageOrderValue,
  ordersWithMissingPrice = 0,
}: SalesSummaryCardProps) {
  return (
    <Box data-testid="sales-summary-card">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              総売上
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
              {formatCurrency(totalSales)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              注文件数
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
              {totalOrders}件
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              平均単価
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
              {formatCurrency(averageOrderValue)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      {ordersWithMissingPrice > 0 && (
        <Alert severity="warning" sx={{ mt: 1.5 }} data-testid="missing-price-warning">
          {ordersWithMissingPrice}
          件の注文に価格が未入力です。スプレッドシートの価格列を確認してください。
        </Alert>
      )}
    </Box>
  );
}
