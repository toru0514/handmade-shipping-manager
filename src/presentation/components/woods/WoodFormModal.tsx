'use client';

import { useState } from 'react';
import { ImagePickerDialog } from '@/presentation/components/products/ImagePickerDialog';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

export type WoodFormData = {
  name: string;
  imageUrl: string;
  features: string;
};

type Props = {
  pending: boolean;
  onSubmit: (data: WoodFormData) => void;
  onClose: () => void;
  initialData?: WoodFormData;
};

export function WoodFormModal({ pending, onSubmit, onClose, initialData }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? '');
  const [features, setFeatures] = useState(initialData?.features ?? '');
  const [showImagePicker, setShowImagePicker] = useState(false);

  const isEdit = !!initialData;
  const canSubmit = !pending && name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      imageUrl: imageUrl.trim(),
      features: features.trim(),
    });
  };

  return (
    <>
      <Dialog open onClose={pending ? undefined : onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? '木材を編集' : '木材を追加'}</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="wood-form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
          >
            <TextField
              label="木材名"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: ウォールナット"
              disabled={pending}
              size="small"
              fullWidth
            />

            <Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="画像URL"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  disabled={pending}
                  size="small"
                  fullWidth
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowImagePicker(true)}
                  disabled={pending}
                  startIcon={<AddPhotoAlternateIcon />}
                  sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  microCMS
                </Button>
              </Box>
              {imageUrl.trim() && (
                <Box
                  sx={{
                    mt: 1,
                    overflow: 'hidden',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    component="img"
                    src={imageUrl}
                    alt="プレビュー"
                    sx={{ height: 128, width: '100%', objectFit: 'cover' }}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </Box>
              )}
            </Box>

            <TextField
              label="特徴"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="例: 濃い茶色で重厚感がある。硬くて耐久性に優れる。"
              disabled={pending}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={pending}>
            キャンセル
          </Button>
          <Button type="submit" form="wood-form" variant="contained" disabled={!canSubmit}>
            {pending ? (isEdit ? '更新中...' : '追加中...') : isEdit ? '更新する' : '追加する'}
          </Button>
        </DialogActions>
      </Dialog>

      {showImagePicker && (
        <ImagePickerDialog
          currentUrls={imageUrl.trim() ? [imageUrl.trim()] : []}
          onConfirm={(urls) => {
            if (urls.length > 0) {
              setImageUrl(urls[urls.length - 1]);
            }
            setShowImagePicker(false);
          }}
          onClose={() => setShowImagePicker(false)}
        />
      )}
    </>
  );
}
