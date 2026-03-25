import { notFound } from 'next/navigation';
import { getWoodById } from '../actions';
import { WoodDetail } from '@/presentation/components/woods/WoodDetail';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WoodDetailPage({ params }: Props) {
  const { id } = await params;
  const wood = await getWoodById(id);

  if (!wood) {
    notFound();
  }

  return <WoodDetail wood={wood} />;
}
