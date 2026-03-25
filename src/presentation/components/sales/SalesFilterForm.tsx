'use client';

import { FormEvent, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface SalesFilterFormProps {
  readonly isLoading?: boolean;
  readonly defaultStartDate: string;
  readonly defaultEndDate: string;
  readonly onFilter: (params: {
    startDate: string;
    endDate: string;
    platform: 'minne' | 'creema' | 'all';
  }) => Promise<void>;
}

export function SalesFilterForm({
  isLoading = false,
  defaultStartDate,
  defaultEndDate,
  onFilter,
}: SalesFilterFormProps) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [platform, setPlatform] = useState<'minne' | 'creema' | 'all'>('all');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onFilter({ startDate, endDate, platform });
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="sales-filter-form">
      <form onSubmit={handleSubmit}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { md: 'center' },
            gap: 2,
          }}
        >
          <TextField
            type="date"
            label="開始日"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isLoading}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1 }}
          />
          <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
            〜
          </Typography>
          <TextField
            type="date"
            label="終了日"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isLoading}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1 }}
          />
          <TextField
            select
            label="プラットフォーム"
            size="small"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as 'minne' | 'creema' | 'all')}
            disabled={isLoading}
            sx={{ flex: 1 }}
          >
            <MenuItem value="all">すべて</MenuItem>
            <MenuItem value="minne">minne</MenuItem>
            <MenuItem value="creema">creema</MenuItem>
          </TextField>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? '集計中...' : '集計する'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}
