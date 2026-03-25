'use client';

import { FormEvent, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';

interface BuyerSearchFormProps {
  readonly isLoading?: boolean;
  readonly onSearch: (buyerName: string) => Promise<void>;
}

export function BuyerSearchForm({ isLoading = false, onSearch }: BuyerSearchFormProps) {
  const [buyerName, setBuyerName] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSearch(buyerName);
  }

  async function handleClear() {
    setBuyerName('');
    await onSearch('');
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="購入者名"
            placeholder="例: 山田"
            value={buyerName}
            onChange={(event) => setBuyerName(event.target.value)}
            disabled={isLoading}
          />
          <Button
            variant="outlined"
            onClick={() => void handleClear()}
            disabled={isLoading}
            sx={{ whiteSpace: 'nowrap' }}
          >
            クリア
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {isLoading ? '検索中...' : '検索'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}
