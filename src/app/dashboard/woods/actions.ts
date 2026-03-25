'use server';

import { revalidatePath } from 'next/cache';
import {
  listWoods,
  findWoodById,
  addWood,
  updateWood,
  deleteWood,
} from '@/infrastructure/adapters/persistence/DualWriteWoodRepository';
import type { WoodMaterial } from '@/infrastructure/adapters/persistence/GoogleSheetsWoodRepository';

export async function getWoods(): Promise<WoodMaterial[]> {
  return listWoods();
}

export async function getWoodById(woodId: string): Promise<WoodMaterial | null> {
  return findWoodById(woodId);
}

export async function addWoodAction(input: {
  name: string;
  imageUrl: string;
  features: string;
}): Promise<WoodMaterial> {
  if (
    typeof input !== 'object' ||
    input === null ||
    typeof input.name !== 'string' ||
    typeof input.imageUrl !== 'string' ||
    typeof input.features !== 'string'
  ) {
    throw new Error('不正な入力です。');
  }

  if (!input.name.trim()) {
    throw new Error('木材名は必須です。');
  }

  const result = await addWood({
    name: input.name.trim(),
    imageUrl: input.imageUrl.trim(),
    features: input.features.trim(),
  });

  revalidatePath('/dashboard/woods');
  revalidatePath('/dashboard');
  revalidatePath('/');
  return result;
}

export async function updateWoodAction(input: {
  id: string;
  name: string;
  imageUrl: string;
  features: string;
}): Promise<WoodMaterial> {
  if (
    typeof input !== 'object' ||
    input === null ||
    typeof input.id !== 'string' ||
    typeof input.name !== 'string' ||
    typeof input.imageUrl !== 'string' ||
    typeof input.features !== 'string'
  ) {
    throw new Error('不正な入力です。');
  }

  if (!input.id.trim()) {
    throw new Error('木材IDは必須です。');
  }

  if (!input.name.trim()) {
    throw new Error('木材名は必須です。');
  }

  const result = await updateWood(input.id, {
    name: input.name.trim(),
    imageUrl: input.imageUrl.trim(),
    features: input.features.trim(),
  });

  revalidatePath('/dashboard/woods');
  revalidatePath('/dashboard');
  revalidatePath('/');
  return result;
}

export async function deleteWoodAction(woodId: string): Promise<void> {
  if (typeof woodId !== 'string' || !woodId.trim()) {
    throw new Error('不正な入力です。');
  }

  await deleteWood(woodId);
  revalidatePath('/dashboard/woods');
  revalidatePath('/dashboard');
  revalidatePath('/');
}
