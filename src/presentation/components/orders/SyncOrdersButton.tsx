'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import SyncIcon from '@mui/icons-material/Sync';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import { useToast } from '@/presentation/components/providers/ToastProvider';

const POLL_INTERVAL_MS = 60_000; // 1分ごとにスプシの件数をチェック

type SyncStatus = {
  totalCount: number;
  shippedCount: number;
  pendingCount: number;
};

export function SyncOrdersButton({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const lastKnownStatus = useRef<SyncStatus | null>(null);
  const { showToast } = useToast();

  const checkForChanges = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/orders/status');
      if (!res.ok) return;
      const data = (await res.json()) as SyncStatus;

      if (lastKnownStatus.current === null) {
        lastKnownStatus.current = data;
        return;
      }

      if (
        data.totalCount !== lastKnownStatus.current.totalCount ||
        data.shippedCount !== lastKnownStatus.current.shippedCount ||
        data.pendingCount !== lastKnownStatus.current.pendingCount
      ) {
        setHasChanges(true);
      }
    } catch {
      // ポーリング失敗は無視
    }
  }, []);

  useEffect(() => {
    void checkForChanges();
    const interval = setInterval(() => {
      void checkForChanges();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkForChanges]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync/orders/trigger', { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'DB同期に失敗しました');
      }
      const result = (await res.json()) as {
        ordersSynced: number;
        labelsSynced: number;
        errors: string[];
      };

      // 現在のステータスを更新
      const statusRes = await fetch('/api/sync/orders/status');
      if (statusRes.ok) {
        const data = (await statusRes.json()) as SyncStatus;
        lastKnownStatus.current = data;
      }
      setHasChanges(false);

      if (result.errors.length > 0) {
        showToast({
          title: 'DB同期（一部エラー）',
          description: `${result.ordersSynced}件同期、${result.errors.length}件エラー`,
          variant: 'error',
        });
      } else {
        showToast({
          title: 'DB同期完了',
          description: `注文${result.ordersSynced}件、伝票${result.labelsSynced}件を同期しました`,
          variant: 'success',
        });
      }
      onSyncComplete?.();
    } catch (error) {
      showToast({
        title: 'DB同期エラー',
        description: error instanceof Error ? error.message : 'DB同期に失敗しました',
        variant: 'error',
      });
    } finally {
      setSyncing(false);
    }
  }, [showToast, onSyncComplete]);

  return (
    <Tooltip
      title={
        hasChanges ? 'スプシに変更があります。DBに同期してください' : 'スプシのデータをDBに同期'
      }
    >
      <Badge color="warning" variant="dot" invisible={!hasChanges}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<SyncIcon className={syncing ? 'animate-spin' : ''} />}
          onClick={() => void handleSync()}
          disabled={syncing}
          sx={{
            whiteSpace: 'nowrap',
            borderColor: hasChanges ? 'warning.main' : undefined,
            color: hasChanges ? 'warning.main' : undefined,
          }}
        >
          {syncing ? '同期中...' : hasChanges ? 'DB同期（変更あり）' : 'DB同期'}
        </Button>
      </Badge>
    </Tooltip>
  );
}
