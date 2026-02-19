'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IssueShippingLabelResultDto } from '@/application/usecases/IssueShippingLabelUseCase';
import type { MarkOrderAsShippedResultDto } from '@/application/usecases/MarkOrderAsShippedUseCase';
import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';
import { PendingOrderList } from '@/presentation/components/orders/PendingOrderList';
import { LabelResultView } from '@/presentation/components/labels/LabelResultView';
import { MessagePreviewDialog } from '@/presentation/components/messages/MessagePreviewDialog';
import {
  ShipmentCompleteData,
  ShipmentCompleteMessage,
} from '@/presentation/components/orders/ShipmentCompleteMessage';
import { ShipmentConfirmDialog } from '@/presentation/components/orders/ShipmentConfirmDialog';

export default function OrdersPage() {
  const [orders, setOrders] = useState<PendingOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [labelIssueError, setLabelIssueError] = useState<string | null>(null);
  const [purchaseThanksError, setPurchaseThanksError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrderDto | null>(null);
  const [isSubmittingShipment, setIsSubmittingShipment] = useState(false);
  const [generatingPurchaseThanksOrderId, setGeneratingPurchaseThanksOrderId] = useState<
    string | null
  >(null);
  const [purchaseThanksPreview, setPurchaseThanksPreview] = useState<{
    orderId: string;
    message: string;
  } | null>(null);
  const [labelIssueResult, setLabelIssueResult] = useState<IssueShippingLabelResultDto | null>(
    null,
  );
  const [issuingLabelOrderId, setIssuingLabelOrderId] = useState<string | null>(null);
  const [completeData, setCompleteData] = useState<ShipmentCompleteData | null>(null);
  const [isCompleteMessageOpen, setIsCompleteMessageOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    const response = await fetch('/api/orders/pending');
    if (!response.ok) {
      throw new Error('注文の取得に失敗しました');
    }
    const data = (await response.json()) as PendingOrderDto[];
    setOrders(data);
  }, []);

  useEffect(() => {
    async function loadOrders() {
      try {
        await fetchOrders();
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      } finally {
        setLoading(false);
      }
    }
    void loadOrders();
  }, [fetchOrders]);

  const handleConfirmShipment = useCallback(
    async (input: { shippingMethod: string; trackingNumber?: string }): Promise<void> => {
      if (selectedOrder === null) return;

      setIsSubmittingShipment(true);
      setUpdateError(null);

      try {
        const response = await fetch(`/api/orders/${selectedOrder.orderId}/ship`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? '発送完了の更新に失敗しました');
        }

        const result = (await response.json()) as MarkOrderAsShippedResultDto;

        setSelectedOrder(null);
        setCompleteData({
          orderId: result.orderId,
          shippedAt: result.shippedAt,
          shippingMethod: result.shippingMethod,
          trackingNumber: result.trackingNumber,
        });
        setIsCompleteMessageOpen(true);
        setOrders((prev) => prev.filter((order) => order.orderId !== result.orderId));
      } catch (err) {
        setUpdateError(err instanceof Error ? err.message : '発送完了の更新に失敗しました');
      } finally {
        setIsSubmittingShipment(false);
      }
    },
    [selectedOrder],
  );

  const handleRequestPurchaseThanks = useCallback(async (order: PendingOrderDto): Promise<void> => {
    setPurchaseThanksError(null);
    setGeneratingPurchaseThanksOrderId(order.orderId);

    try {
      const response = await fetch(`/api/orders/${order.orderId}/message/purchase-thanks`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { message?: string } | string;
        };
        const message =
          typeof body.error === 'string'
            ? body.error
            : (body.error?.message ?? '購入お礼メッセージの生成に失敗しました');
        throw new Error(message);
      }

      const payload = (await response.json()) as {
        orderId: string;
        message: string;
      };
      setPurchaseThanksPreview(payload);
    } catch (err) {
      setPurchaseThanksError(
        err instanceof Error ? err.message : '購入お礼メッセージの生成に失敗しました',
      );
    } finally {
      setGeneratingPurchaseThanksOrderId(null);
    }
  }, []);

  const handleIssueLabel = useCallback(
    async (order: PendingOrderDto, shippingMethod: string): Promise<void> => {
      setLabelIssueError(null);
      setIssuingLabelOrderId(order.orderId);

      try {
        const response = await fetch(`/api/orders/${order.orderId}/labels`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shippingMethod,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: { message?: string } | string;
          };
          const message =
            typeof body.error === 'string'
              ? body.error
              : (body.error?.message ?? '伝票発行に失敗しました');
          throw new Error(message);
        }

        const payload = (await response.json()) as IssueShippingLabelResultDto;
        setLabelIssueResult(payload);
      } catch (error) {
        setLabelIssueError(error instanceof Error ? error.message : '伝票発行に失敗しました');
      } finally {
        setIssuingLabelOrderId(null);
      }
    },
    [],
  );

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">発送前注文一覧</h1>

      {loading && (
        <div className="py-12 text-center text-gray-500" data-testid="loading">
          読み込み中...
        </div>
      )}

      {loadError && (
        <div className="rounded bg-red-100 px-4 py-3 text-red-700" role="alert">
          {loadError}
        </div>
      )}
      {purchaseThanksError && (
        <div className="mb-4 rounded bg-red-100 px-4 py-3 text-red-700" role="alert">
          {purchaseThanksError}
        </div>
      )}
      {labelIssueError && (
        <div className="mb-4 rounded bg-red-100 px-4 py-3 text-red-700" role="alert">
          {labelIssueError}
        </div>
      )}

      {!loading && !loadError && (
        <PendingOrderList
          orders={orders}
          generatingPurchaseThanksOrderId={generatingPurchaseThanksOrderId}
          onRequestShipmentComplete={(order) => {
            setUpdateError(null);
            setSelectedOrder(order);
          }}
          onRequestPurchaseThanks={(order) => {
            void handleRequestPurchaseThanks(order);
          }}
          onRequestIssueLabel={(order, shippingMethod) => handleIssueLabel(order, shippingMethod)}
          issuingLabelOrderId={issuingLabelOrderId}
        />
      )}

      {labelIssueResult && (
        <LabelResultView result={labelIssueResult} onClose={() => setLabelIssueResult(null)} />
      )}

      <ShipmentConfirmDialog
        open={selectedOrder !== null}
        order={selectedOrder}
        isSubmitting={isSubmittingShipment}
        error={updateError}
        onClose={() => setSelectedOrder(null)}
        onConfirm={handleConfirmShipment}
      />

      <ShipmentCompleteMessage
        open={isCompleteMessageOpen}
        data={completeData}
        onClose={() => setIsCompleteMessageOpen(false)}
      />

      <MessagePreviewDialog
        open={purchaseThanksPreview !== null}
        orderId={purchaseThanksPreview?.orderId ?? ''}
        message={purchaseThanksPreview?.message ?? ''}
        title="購入お礼メッセージ"
        onClose={() => setPurchaseThanksPreview(null)}
      />
    </main>
  );
}
