'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { CopyToClipboardButton } from './CopyToClipboardButton';

interface MessagePreviewDialogProps {
  readonly open: boolean;
  readonly orderId: string;
  readonly message: string;
  readonly title: string;
  readonly onClose: () => void;
}

export function MessagePreviewDialog({
  open,
  orderId,
  message,
  title,
  onClose,
}: MessagePreviewDialogProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          注文 {orderId} のメッセージプレビューです。
        </Typography>

        {notice && (
          <Alert severity="success" sx={{ mb: 1.5 }}>
            {notice}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        <Box
          component="pre"
          sx={{
            whiteSpace: 'pre-wrap',
            bgcolor: 'grey.100',
            p: 2,
            borderRadius: 1,
            maxHeight: 384,
            overflow: 'auto',
            fontSize: '0.875rem',
          }}
        >
          {message}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
        <CopyToClipboardButton
          content={message}
          onCopied={() => {
            setError(null);
            setNotice('コピーしました');
          }}
          onError={(messageText) => {
            setNotice(null);
            setError(messageText);
          }}
        />
      </DialogActions>
    </Dialog>
  );
}
