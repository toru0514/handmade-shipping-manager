'use client';

import { useTransition } from 'react';
import { updateWoodAction, deleteWoodAction } from '@/app/(manage)/woods/actions';
import { useToast } from '@/presentation/components/providers/ToastProvider';
import type { WoodFormData } from './WoodFormModal';

export function useWoodEdit(woodId: string, onSuccess: () => void) {
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  const handleEdit = (data: WoodFormData) => {
    startTransition(async () => {
      try {
        await updateWoodAction({
          id: woodId,
          name: data.name,
          imageUrl: data.imageUrl,
          features: data.features,
        });
        onSuccess();
        showToast({
          title: '木材を更新しました',
          description: data.name,
          variant: 'success',
        });
      } catch (error) {
        showToast({
          title: '木材の更新に失敗しました',
          description: error instanceof Error ? error.message : '不明なエラー',
          variant: 'error',
        });
      }
    });
  };

  return { handleEdit, pending };
}

export function useWoodDelete(onSuccess?: () => void) {
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;

    startTransition(async () => {
      try {
        await deleteWoodAction(id);
        showToast({
          title: '木材を削除しました',
          description: name,
          variant: 'info',
        });
        onSuccess?.();
      } catch (error) {
        showToast({
          title: '木材の削除に失敗しました',
          description: error instanceof Error ? error.message : '不明なエラー',
          variant: 'error',
        });
      }
    });
  };

  return { handleDelete, pending };
}
