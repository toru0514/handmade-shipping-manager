import { useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';

interface IssueLabelButtonProps {
  readonly onIssue: (shippingMethod: string) => Promise<void>;
  readonly isIssuing?: boolean;
  readonly disabled?: boolean;
}

export function IssueLabelButton({
  onIssue,
  isIssuing = false,
  disabled = false,
}: IssueLabelButtonProps) {
  const [shippingMethod, setShippingMethod] = useState<string>(ShippingMethod.ClickPost.toString());

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TextField
        select
        size="small"
        label="配送方法"
        disabled={disabled || isIssuing}
        value={shippingMethod}
        onChange={(event) => setShippingMethod(event.target.value)}
        sx={{ minWidth: 160 }}
      >
        <MenuItem value={ShippingMethod.ClickPost.toString()}>クリックポスト</MenuItem>
        <MenuItem value={ShippingMethod.YamatoCompact.toString()}>宅急便コンパクト</MenuItem>
      </TextField>
      <Button
        variant="contained"
        size="small"
        color="secondary"
        disabled={disabled || isIssuing}
        onClick={() => void onIssue(shippingMethod)}
      >
        {isIssuing ? '発行中...' : '伝票発行'}
      </Button>
    </Box>
  );
}
