import { getWoods } from './actions';
import { WoodsContent } from '@/presentation/components/woods/WoodsContent';

export const dynamic = 'force-dynamic';

export default async function WoodsPage() {
  const woods = await getWoods();
  return <WoodsContent woods={woods} />;
}
