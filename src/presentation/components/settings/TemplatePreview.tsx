'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

interface TemplatePreviewProps {
  readonly content: string;
  readonly onClose: () => void;
}

export function TemplatePreview({ content, onClose }: TemplatePreviewProps) {
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>プレビュー</DialogTitle>
      <DialogContent>
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
          {content}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}
