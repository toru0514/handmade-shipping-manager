import type { ShippingLabelJob } from '@/domain/ports/ShippingLabelJobRepository';

interface LabelJobStatusViewProps {
  readonly job: ShippingLabelJob;
  readonly onClose: () => void;
}

function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('ja-JP');
}

export function LabelJobStatusView({ job, onClose }: LabelJobStatusViewProps) {
  const result = job.result as Record<string, string | string[] | undefined> | undefined;

  const statusConfig = {
    pending: {
      label: '待機中...',
      containerClass: 'border-gray-200 bg-gray-50',
      textClass: 'text-gray-900',
    },
    processing: {
      label: '処理中...',
      containerClass: 'border-blue-200 bg-blue-50',
      textClass: 'text-blue-900',
    },
    completed: {
      label: '完了',
      containerClass: 'border-emerald-200 bg-emerald-50',
      textClass: 'text-emerald-900',
    },
    failed: {
      label: '失敗',
      containerClass: 'border-red-200 bg-red-50',
      textClass: 'text-red-900',
    },
  };

  const config = statusConfig[job.status];
  const isActive = job.status === 'pending' || job.status === 'processing';

  return (
    <section
      aria-label="伝票発行ジョブ"
      className={`mt-4 rounded border p-4 ${config.containerClass}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className={`text-base font-semibold ${config.textClass}`}>
          伝票発行: {config.label}
          {isActive && (
            <span className="ml-2 inline-block h-3 w-3 animate-pulse rounded-full bg-current" />
          )}
        </h2>
        <button
          type="button"
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>

      <dl className={`grid gap-1 text-sm ${config.textClass}`}>
        <div>
          <dt className="inline font-medium">注文ID:</dt> <dd className="inline">{job.orderId}</dd>
        </div>
        <div>
          <dt className="inline font-medium">配送方法:</dt>{' '}
          <dd className="inline">{job.shippingMethod}</dd>
        </div>
        <div>
          <dt className="inline font-medium">登録日時:</dt>{' '}
          <dd className="inline">{formatDateTime(job.createdAt)}</dd>
        </div>
      </dl>

      {job.status === 'completed' && result && (
        <div className="mt-3 border-t border-emerald-200 pt-3">
          <dl className="grid gap-1 text-sm text-emerald-900">
            {result.labelId && (
              <div>
                <dt className="inline font-medium">伝票ID:</dt>{' '}
                <dd className="inline">{result.labelId}</dd>
              </div>
            )}
            {result.trackingNumber && (
              <div>
                <dt className="inline font-medium">追跡番号:</dt>{' '}
                <dd className="inline">{result.trackingNumber}</dd>
              </div>
            )}
            {result.waybillNumber && (
              <div>
                <dt className="inline font-medium">送り状番号:</dt>{' '}
                <dd className="inline">{result.waybillNumber}</dd>
              </div>
            )}
            {result.expiresAt && (
              <div>
                <dt className="inline font-medium">有効期限:</dt>{' '}
                <dd className="inline">{formatDateTime(result.expiresAt as string)}</dd>
              </div>
            )}
            {result.issuedAt && (
              <div>
                <dt className="inline font-medium">発行日時:</dt>{' '}
                <dd className="inline">{formatDateTime(result.issuedAt as string)}</dd>
              </div>
            )}
          </dl>

          {result.warnings && (result.warnings as string[]).length > 0 && (
            <div
              className="mt-2 rounded bg-yellow-100 px-3 py-2 text-sm text-yellow-800"
              role="alert"
            >
              {(result.warnings as string[]).map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          {result.qrCode && (
            <div className="mt-3">
              <p className="mb-2 text-sm font-medium text-emerald-900">QRコード</p>
              <img
                alt="宅急便コンパクトQRコード"
                className="h-40 w-40 rounded border border-emerald-200 bg-white p-2"
                src={result.qrCode as string}
              />
            </div>
          )}
        </div>
      )}

      {job.status === 'failed' && job.error && (
        <div className="mt-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700" role="alert">
          {job.error}
        </div>
      )}

      {isActive && (
        <p className="mt-3 text-xs text-gray-500">
          ワーカーが処理を開始するまでお待ちください。完了後にSlackで通知されます。
        </p>
      )}
    </section>
  );
}
