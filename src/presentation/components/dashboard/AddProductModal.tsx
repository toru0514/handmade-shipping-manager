'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const AVAILABLE_PLATFORMS = [
  { value: 'creema', label: 'Creema' },
  { value: 'minne', label: 'minne' },
  { value: 'base', label: 'BASE' },
  { value: 'iichi', label: 'iichi' },
];

export type AddProductFormData = {
  productId: string;
  title: string;
  description: string;
  price: number | null;
  inventory: number | null;
  platforms: string[];
};

type Props = {
  pending: boolean;
  onSubmit: (data: AddProductFormData) => void;
  onClose: () => void;
};

export function AddProductModal({ pending, onSubmit, onClose }: Props) {
  const [productId] = useState(
    () => `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceText, setPriceText] = useState('');
  const [inventoryText, setInventoryText] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const priceError =
    priceText.trim() && !Number.isFinite(Number(priceText.replace(/,/g, '')))
      ? '数値を入力してください'
      : null;

  const inventoryError =
    inventoryText.trim() && !Number.isFinite(Number(inventoryText))
      ? '数値を入力してください'
      : null;

  const canSubmit =
    !pending &&
    title.trim().length > 0 &&
    selectedPlatforms.length > 0 &&
    !priceError &&
    !inventoryError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const price = priceText.trim() ? Number(priceText.replace(/,/g, '')) : null;
    const inventory = inventoryText.trim() ? Number(inventoryText) : null;

    onSubmit({
      productId: productId.trim(),
      title: title.trim(),
      description: description.trim(),
      price: price !== null && Number.isFinite(price) ? price : null,
      inventory: inventory !== null && Number.isFinite(inventory) ? inventory : null,
      platforms: selectedPlatforms,
    });
  };

  const handlePlatformChange = (_: React.MouseEvent<HTMLElement>, newPlatforms: string[]) => {
    setSelectedPlatforms(newPlatforms);
  };

  return (
    <Dialog open onClose={pending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>商品を追加</DialogTitle>
      <DialogContent>
        <Box
          component="form"
          id="add-product-form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
        >
          <TextField
            label="商品名"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: シルバーリング"
            disabled={pending}
            size="small"
            fullWidth
          />

          <TextField
            label="商品説明"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="商品の説明を入力"
            disabled={pending}
            size="small"
            fullWidth
            multiline
            rows={3}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="価格"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              placeholder="例: 3500"
              disabled={pending}
              size="small"
              error={!!priceError}
              helperText={priceError}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
            <TextField
              label="在庫"
              value={inventoryText}
              onChange={(e) => setInventoryText(e.target.value)}
              placeholder="例: 5"
              disabled={pending}
              size="small"
              error={!!inventoryError}
              helperText={inventoryError}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              出品先{' '}
              <Typography component="span" variant="caption" color="error">
                *
              </Typography>
            </Typography>
            <ToggleButtonGroup
              value={selectedPlatforms}
              onChange={handlePlatformChange}
              disabled={pending}
              size="small"
            >
              {AVAILABLE_PLATFORMS.map((platform) => (
                <ToggleButton key={platform.value} value={platform.value}>
                  {platform.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>
          キャンセル
        </Button>
        <Button type="submit" form="add-product-form" variant="contained" disabled={!canSubmit}>
          {pending ? '追加中...' : '追加する'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
