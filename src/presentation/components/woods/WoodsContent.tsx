'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { WoodFormModal, type WoodFormData } from './WoodFormModal';
import { useWoodEdit, useWoodDelete } from './use-wood-actions';
import { addWoodAction } from '@/app/dashboard/woods/actions';
import type { WoodMaterial } from '@/infrastructure/adapters/persistence/GoogleSheetsWoodRepository';
import { useToast } from '@/presentation/components/providers/ToastProvider';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

type Props = {
  woods: WoodMaterial[];
};

export function WoodsContent({ woods }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWood, setEditingWood] = useState<WoodMaterial | null>(null);
  const [pendingAdd, startAdd] = useTransition();
  const { showToast } = useToast();

  const { handleEdit: onEdit, pending: pendingEdit } = useWoodEdit(editingWood?.id ?? '', () =>
    setEditingWood(null),
  );

  const { handleDelete, pending: deletePending } = useWoodDelete();

  const handleAdd = (data: WoodFormData) => {
    startAdd(async () => {
      try {
        await addWoodAction({
          name: data.name,
          imageUrl: data.imageUrl,
          features: data.features,
        });
        setShowAddModal(false);
        showToast({ title: '木材を追加しました', description: data.name, variant: 'success' });
      } catch (error) {
        showToast({
          title: '木材の追加に失敗しました',
          description: error instanceof Error ? error.message : '不明なエラー',
          variant: 'error',
        });
      }
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold">
            木材一覧
          </Typography>
          <Typography variant="body2" color="text.secondary">
            木材の画像・名前・特徴を管理できます。
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowAddModal(true)}>
          木材を追加
        </Button>
      </Box>

      {woods.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              木材がまだ登録されていません。「木材を追加」ボタンから追加してください。
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {woods.map((wood) => (
            <Grid key={wood.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 4 },
                  '&:hover .wood-actions': { opacity: 1 },
                }}
              >
                <Link
                  href={`/dashboard/woods/${encodeURIComponent(wood.id)}`}
                  style={{ textDecoration: 'none' }}
                >
                  {wood.imageUrl ? (
                    <CardMedia
                      component="img"
                      image={wood.imageUrl}
                      alt={wood.name}
                      sx={{ aspectRatio: '4/3', objectFit: 'cover' }}
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        aspectRatio: '4/3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        画像なし
                      </Typography>
                    </Box>
                  )}
                </Link>
                <CardContent sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography
                      component={Link}
                      href={`/dashboard/woods/${encodeURIComponent(wood.id)}`}
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{
                        textDecoration: 'none',
                        color: 'text.primary',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {wood.name}
                    </Typography>
                    <Box
                      className="wood-actions"
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        flexShrink: 0,
                        opacity: { xs: 1, md: 0 },
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <IconButton size="small" onClick={() => setEditingWood(wood)} title="編集">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(wood.id, wood.name)}
                        disabled={deletePending}
                        title="削除"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  {wood.features && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 1,
                        whiteSpace: 'pre-wrap',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {wood.features}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {showAddModal && (
        <WoodFormModal
          pending={pendingAdd}
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingWood && (
        <WoodFormModal
          pending={pendingEdit}
          onSubmit={onEdit}
          onClose={() => setEditingWood(null)}
          initialData={{
            name: editingWood.name,
            imageUrl: editingWood.imageUrl,
            features: editingWood.features,
          }}
        />
      )}
    </Box>
  );
}
