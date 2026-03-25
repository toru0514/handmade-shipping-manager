'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WoodFormModal } from './WoodFormModal';
import { useWoodEdit, useWoodDelete } from './use-wood-actions';
import type { WoodMaterial } from '@/infrastructure/adapters/persistence/GoogleSheetsWoodRepository';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

type Props = {
  wood: WoodMaterial;
};

export function WoodDetail({ wood }: Props) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);

  const { handleEdit, pending: pendingEdit } = useWoodEdit(wood.id, () => setShowEditModal(false));

  const { handleDelete: onDelete, pending: deleting } = useWoodDelete(() =>
    router.push('/dashboard/woods'),
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            onClick={() => router.push('/dashboard/woods')}
            title="一覧に戻る"
            size="small"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="bold">
            {wood.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon />}
            onClick={() => setShowEditModal(true)}
          >
            編集
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => onDelete(wood.id, wood.name)}
            disabled={deleting}
          >
            削除
          </Button>
        </Box>
      </Box>

      <Card>
        {wood.imageUrl ? (
          <CardMedia
            component="img"
            image={wood.imageUrl}
            alt={wood.name}
            sx={{ aspectRatio: '16/9', objectFit: 'cover' }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <Box
            sx={{
              aspectRatio: '16/9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              画像なし
            </Typography>
          </Box>
        )}
        <CardContent>
          <Typography variant="h6" fontWeight="bold">
            {wood.name}
          </Typography>
          {wood.features && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.5, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}
            >
              {wood.features}
            </Typography>
          )}
          {wood.createdAt && (
            <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>
              登録日: {new Date(wood.createdAt).toLocaleDateString('ja-JP')}
            </Typography>
          )}
        </CardContent>
      </Card>

      {showEditModal && (
        <WoodFormModal
          pending={pendingEdit}
          onSubmit={handleEdit}
          onClose={() => setShowEditModal(false)}
          initialData={{
            name: wood.name,
            imageUrl: wood.imageUrl,
            features: wood.features,
          }}
        />
      )}
    </Box>
  );
}
