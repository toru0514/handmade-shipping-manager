'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OrderSummaryDto } from '@/application/usecases/ListAllOrdersUseCase';
import type { BuyerDetailDto } from '@/application/usecases/SearchBuyersUseCase';
import { BuyerDetail } from '@/presentation/components/buyers/BuyerDetail';
import { BuyerSearchForm } from '@/presentation/components/buyers/BuyerSearchForm';
import { BuyerListTable } from '@/presentation/components/buyers/BuyerListTable';

function fnv1aHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** 全注文から購入者ごとに集約する */
function aggregateBuyers(orders: OrderSummaryDto[]): BuyerDetailDto[] {
  const grouped = new Map<string, OrderSummaryDto[]>();

  for (const order of orders) {
    const key = [order.buyerName, order.postalCode ?? '', order.street ?? ''].join('::');
    const current = grouped.get(key) ?? [];
    current.push(order);
    grouped.set(key, current);
  }

  return [...grouped.entries()]
    .map(([identityKey, buyerOrders]) => {
      const buyerName = buyerOrders[0]!.buyerName;
      const sorted = [...buyerOrders].sort((a, b) => b.orderedAt.localeCompare(a.orderedAt));
      const latest = sorted[0]!;
      const oldest = sorted[sorted.length - 1]!;
      const totalAmount = sorted.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);

      return {
        buyerId: `buyer_${fnv1aHash(identityKey)}`,
        buyerName,
        postalCode: latest.postalCode ?? '',
        prefecture: latest.prefecture,
        city: latest.city ?? '',
        street: latest.street ?? '',
        building: latest.building,
        phoneNumber: latest.phoneNumber,
        orderCount: sorted.length,
        totalAmount,
        firstOrderedAt: oldest.orderedAt,
        lastOrderedAt: latest.orderedAt,
        orderHistory: sorted.map((o) => ({
          orderId: o.orderId,
          platform: o.platform,
          productName: o.productName,
          price: o.totalPrice ?? 0,
          status: o.status,
          orderedAt: o.orderedAt,
        })),
      };
    })
    .sort((a, b) => b.lastOrderedAt.localeCompare(a.lastOrderedAt));
}

/** 検索キーワードで購入者をフィルタリング（購入者名・商品名・日付） */
function filterBuyers(buyers: BuyerDetailDto[], keyword: string): BuyerDetailDto[] {
  if (!keyword) return buyers;
  const lower = keyword.toLowerCase();
  return buyers.filter((buyer) => {
    if (buyer.buyerName.toLowerCase().includes(lower)) return true;
    if (buyer.orderHistory.some((o) => o.productName.toLowerCase().includes(lower))) return true;
    if (buyer.orderHistory.some((o) => o.orderedAt.includes(keyword))) return true;
    // 日付フォーマット（YYYY/MM/DD等）での検索にも対応
    if (
      buyer.orderHistory.some((o) => {
        const d = new Date(o.orderedAt);
        if (Number.isNaN(d.getTime())) return false;
        const formatted = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
        return formatted.includes(keyword);
      })
    )
      return true;
    return false;
  });
}

export default function BuyersPage() {
  const [allOrders, setAllOrders] = useState<OrderSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders/all');
        if (!response.ok) {
          throw new Error('注文一覧の取得に失敗しました');
        }
        const data = (await response.json()) as OrderSummaryDto[];
        setAllOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '注文一覧の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const allBuyers = useMemo(() => aggregateBuyers(allOrders), [allOrders]);

  const filteredBuyers = useMemo(
    () => filterBuyers(allBuyers, searchKeyword.trim()),
    [allBuyers, searchKeyword],
  );

  const selectedBuyer = useMemo(
    () => filteredBuyers.find((b) => b.buyerId === selectedBuyerId) ?? null,
    [filteredBuyers, selectedBuyerId],
  );

  const handleSearch = useCallback(async (keyword: string) => {
    setSearchKeyword(keyword);
    setSelectedBuyerId(null);
  }, []);

  const handleSelectBuyer = useCallback((buyerId: string) => {
    setSelectedBuyerId(buyerId);
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">購入者一覧</h1>

      <BuyerSearchForm isLoading={isLoading} onSearch={handleSearch} />

      {error && (
        <div className="mt-4 rounded bg-red-100 px-4 py-3 text-red-700" role="alert">
          {error}
        </div>
      )}

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr,1fr]">
        <BuyerListTable
          buyers={filteredBuyers}
          selectedBuyerId={selectedBuyerId}
          isLoading={isLoading}
          onSelectBuyer={handleSelectBuyer}
        />
        <BuyerDetail buyer={selectedBuyer} />
      </section>
    </main>
  );
}
