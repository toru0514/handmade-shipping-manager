'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchMicroCmsImages, type MicroCmsImage } from '@/app/(manage)/products/actions';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';

type Props = {
  currentUrls: string[];
  onConfirm: (urls: string[]) => void;
  onClose: () => void;
};

const PAGE_SIZE = 20;

export function ImagePickerDialog({ currentUrls, onConfirm, onClose }: Props) {
  const [images, setImages] = useState<MicroCmsImage[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(
    () => new Set(currentUrls.filter(Boolean)),
  );

  const loadImages = useCallback(async (pageOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMicroCmsImages(pageOffset, PAGE_SIZE);
      setImages(result.images);
      setTotalCount(result.totalCount);
      setOffset(pageOffset);
    } catch (e) {
      setError(e instanceof Error ? e.message : '画像の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImages(0);
  }, [loadImages]);

  const toggleImage = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm([...selectedUrls]);
  };

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < totalCount;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" component="span">
            microCMS 画像を選択
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            {selectedUrls.size} 件選択中 / 全 {totalCount} 件
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 300 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(3, 1fr)',
                sm: 'repeat(4, 1fr)',
                md: 'repeat(5, 1fr)',
              },
              gap: 1.5,
            }}
          >
            {images.map((img) => {
              const isSelected = selectedUrls.has(img.url);
              return (
                <Box
                  key={img.id}
                  onClick={() => toggleImage(img.url)}
                  sx={{
                    position: 'relative',
                    aspectRatio: '1',
                    overflow: 'hidden',
                    borderRadius: 1,
                    border: 2,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                    '&:hover': { borderColor: isSelected ? 'primary.main' : 'text.secondary' },
                  }}
                >
                  <Box
                    component="img"
                    src={`${img.url}?w=200&h=200&fit=crop`}
                    alt=""
                    loading="lazy"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {isSelected && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(25, 118, 210, 0.2)',
                      }}
                    >
                      <CheckCircleIcon color="primary" />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            onClick={() => loadImages(offset - PAGE_SIZE)}
            disabled={!hasPrev || loading}
          >
            前へ
          </Button>
          <Typography variant="caption" color="text.secondary">
            {offset + 1}-{Math.min(offset + PAGE_SIZE, totalCount)} / {totalCount}
          </Typography>
          <Button
            size="small"
            onClick={() => loadImages(offset + PAGE_SIZE)}
            disabled={!hasNext || loading}
          >
            次へ
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>キャンセル</Button>
          <Button variant="contained" onClick={handleConfirm}>
            選択を確定 ({selectedUrls.size})
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
