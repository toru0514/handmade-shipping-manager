'use client';

import { FormEvent, useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';

interface ShipmentConfirmDialogProps {
  readonly open: boolean;
  readonly order: PendingOrderDto | null;
  readonly isSubmitting: boolean;
  readonly error?: string | null;
  readonly onClose: () => void;
  readonly onConfirm: (input: { shippingMethod: string; trackingNumber?: string }) => Promise<void>;
}

function shippingMethodLabel(method: string): string {
  if (method === 'click_post') return 'クリックポスト';
  if (method === 'yamato_compact') return '宅急便コンパクト';
  return method;
}

export function ShipmentConfirmDialog({
  open,
  order,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: ShipmentConfirmDialogProps) {
  const [shippingMethod, setShippingMethod] = useState('click_post');
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    if (!open) return;
    setShippingMethod('click_post');
    setTrackingNumber('');
  }, [open, order?.orderId]);

  if (order === null) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onConfirm({
      shippingMethod,
      trackingNumber,
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <DialogTitle>発送完了確認</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            以下の注文を発送済みにしますか？
          </Typography>

          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Stack spacing={0.5}>
              <Typography variant="body2">注文番号: {order.orderId}</Typography>
              <Typography variant="body2">購入者: {order.buyerName} 様</Typography>
              <Typography variant="body2">購入品: {order.productName}</Typography>
              <Typography variant="body2">
                配送方法: {shippingMethodLabel(shippingMethod)}
              </Typography>
            </Stack>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            select
            fullWidth
            label="配送方法"
            value={shippingMethod}
            onChange={(event) => setShippingMethod(event.target.value)}
            disabled={isSubmitting}
            sx={{ mb: 2 }}
          >
            <MenuItem value="click_post">クリックポスト</MenuItem>
            <MenuItem value="yamato_compact">宅急便コンパクト</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label="追跡番号（任意）"
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            placeholder="例: 1234-5678-9012"
            disabled={isSubmitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? '更新中...' : '発送完了にする'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
