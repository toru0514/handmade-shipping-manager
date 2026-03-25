'use client';

import { useState, useTransition } from 'react';
import { copyProduct } from '@/app/(manage)/products/actions';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

type Props = {
  sourceProductId: string;
  sourceProductTitle: string;
  onClose: () => void;
  onCopied: (newProductId: string) => void;
};

export function CopyProductDialog({
  sourceProductId,
  sourceProductTitle,
  onClose,
  onCopied,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleCopy = () => {
    setError(null);
    startTransition(async () => {
      try {
        const newId = await copyProduct(sourceProductId);
        onCopied(newId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'コピーに失敗しました');
      }
    });
  };

  return (
    <Dialog open onClose={pending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>商品をコピー</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <Typography component="span" variant="body2" fontWeight="medium" color="text.primary">
            {sourceProductTitle}
          </Typography>{' '}
          をコピーしますか？
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>
          キャンセル
        </Button>
        <Button variant="contained" onClick={handleCopy} disabled={pending}>
          {pending ? 'コピー中...' : 'コピーする'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
