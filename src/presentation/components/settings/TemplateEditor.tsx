'use client';

import { FormEvent } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';

interface TemplateEditorProps {
  readonly value: string;
  readonly isSaving?: boolean;
  readonly onChange: (value: string) => void;
  readonly onSave: () => Promise<void>;
  readonly onPreview: () => void;
}

export function TemplateEditor({
  value,
  isSaving = false,
  onChange,
  onSave,
  onPreview,
}: TemplateEditorProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave();
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <TextField
          fullWidth
          multiline
          minRows={10}
          label="テンプレート本文"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />

        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="outlined" onClick={onPreview} disabled={isSaving}>
            プレビュー
          </Button>
          <Button type="submit" variant="contained" disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}
