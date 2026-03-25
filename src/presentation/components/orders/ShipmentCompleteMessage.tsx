'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { MessagePreviewDialog } from '@/presentation/components/messages/MessagePreviewDialog';
import { formatDateTime, shippingMethodLabel } from '@/presentation/utils/format';

export interface ShipmentCompleteData {
  readonly orderId: string;
  readonly shippedAt: string;
  readonly shippingMethod: string;
  readonly trackingNumber?: string;
}

interface ShipmentCompleteMessageProps {
  readonly open: boolean;
  readonly data: ShipmentCompleteData | null;
  readonly onClose: () => void;
}

export function ShipmentCompleteMessage({ open, data, onClose }: ShipmentCompleteMessageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ orderId: string; message: string } | null>(null);

  if (!open || data === null) {
    return null;
  }
  const currentData = data;

  async function handleGenerateShippingNotice() {
    setGenerationError(null);
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/orders/${currentData.orderId}/message/shipping-notice`, {
        method: 'POST',
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { message?: string } | string;
        };
        const message =
          typeof body.error === 'string'
            ? body.error
            : (body.error?.message ?? '発送連絡メッセージの生成に失敗しました');
        throw new Error(message);
      }

      const payload = (await response.json()) as {
        orderId: string;
        message: string;
      };
      setPreview(payload);
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : '発送連絡メッセージの生成に失敗しました',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>発送完了</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            注文 {currentData.orderId} を発送済みにしました。
          </Typography>

          <Paper
            variant="outlined"
            sx={{ p: 2, mb: 2, bgcolor: 'success.50', borderColor: 'success.200' }}
          >
            <Stack spacing={0.5}>
              <Typography variant="body2">
                発送日時: {formatDateTime(currentData.shippedAt)}
              </Typography>
              <Typography variant="body2">
                配送方法: {shippingMethodLabel(currentData.shippingMethod)}
              </Typography>
              <Typography variant="body2">
                追跡番号: {currentData.trackingNumber ?? '未入力'}
              </Typography>
            </Stack>
          </Paper>

          {generationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {generationError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            disabled={isGenerating}
            onClick={() => void handleGenerateShippingNotice()}
          >
            {isGenerating ? '生成中...' : '発送連絡を作成'}
          </Button>
          <Button variant="contained" color="success" onClick={onClose}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      <MessagePreviewDialog
        open={preview !== null}
        orderId={preview?.orderId ?? ''}
        message={preview?.message ?? ''}
        title="発送連絡メッセージ"
        onClose={() => setPreview(null)}
      />
    </>
  );
}
