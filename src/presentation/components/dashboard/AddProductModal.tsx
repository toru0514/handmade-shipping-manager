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
import IconButton from '@mui/material/IconButton';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import { ImagePickerDialog } from '@/presentation/components/products/ImagePickerDialog';
import { AIDescriptionGenerator } from '@/presentation/components/products/AIDescriptionGenerator';
import type { WoodMaterial } from '@/domain/types/wood';

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
  imageUrls?: string[];
};

type ReferenceProduct = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
};

type Props = {
  pending: boolean;
  woods: WoodMaterial[];
  products?: ReferenceProduct[];
  onSubmit: (data: AddProductFormData) => void;
  onClose: () => void;
};

export function AddProductModal({ pending, woods, products, onSubmit, onClose }: Props) {
  const [productId] = useState(
    () => `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceText, setPriceText] = useState('');
  const [inventoryText, setInventoryText] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);

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
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
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

          <AIDescriptionGenerator
            woods={woods}
            products={products}
            onGenerated={(text) => setDescription(text)}
            disabled={pending}
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

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              商品画像
            </Typography>
            {imageUrls.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {imageUrls.map((url) => (
                  <Box
                    key={url}
                    sx={{
                      position: 'relative',
                      width: 72,
                      height: 72,
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Box
                      component="img"
                      src={`${url}?w=80&h=80&fit=crop`}
                      alt=""
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => setImageUrls((prev) => prev.filter((u) => u !== url))}
                      disabled={pending}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        p: 0.25,
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddPhotoAlternateIcon />}
              onClick={() => setShowImagePicker(true)}
              disabled={pending}
            >
              microCMSから選択
            </Button>
          </Box>
        </Box>
      </DialogContent>

      {showImagePicker && (
        <ImagePickerDialog
          currentUrls={imageUrls}
          onConfirm={(urls) => {
            setImageUrls(urls);
            setShowImagePicker(false);
          }}
          onClose={() => setShowImagePicker(false)}
        />
      )}
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
