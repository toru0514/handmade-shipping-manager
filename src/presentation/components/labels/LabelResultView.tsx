import type { IssueShippingLabelResultDto } from '@/application/usecases/IssueShippingLabelUseCase';

interface LabelResultViewProps {
  readonly result: IssueShippingLabelResultDto;
  readonly onClose: () => void;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ja-JP');
}

export function LabelResultView({ result, onClose }: LabelResultViewProps) {
  const pdfDataUrl =
    result.labelType === 'click_post'
      ? `data:application/pdf;base64,${result.pdfData ?? ''}`
      : null;
  const isYamatoCompact = result.labelType === 'yamato_compact';
  const expiresAt = result.expiresAt ? new Date(result.expiresAt) : null;
  const isExpired = expiresAt !== null && expiresAt.getTime() < Date.now();

  return (
    <section
      aria-label="伝票発行結果"
      className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-emerald-900">伝票を発行しました</h2>
        <button
          type="button"
          className="rounded border border-emerald-400 bg-white px-2 py-1 text-sm text-emerald-700 hover:bg-emerald-100"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>

      {result.warnings && result.warnings.length > 0 && (
        <div className="mb-3 rounded bg-yellow-100 px-3 py-2 text-sm text-yellow-800" role="alert">
          {result.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      <dl className="grid gap-1 text-sm text-emerald-900">
        <div>
          <dt className="inline font-medium">注文ID:</dt>{' '}
          <dd className="inline">{result.orderId}</dd>
        </div>
        <div>
          <dt className="inline font-medium">伝票ID:</dt>{' '}
          <dd className="inline">{result.labelId}</dd>
        </div>
        <div>
          <dt className="inline font-medium">配送方法:</dt>{' '}
          <dd className="inline">{result.shippingMethod}</dd>
        </div>
        <div>
          <dt className="inline font-medium">発行日時:</dt>{' '}
          <dd className="inline">{formatDateTime(result.issuedAt)}</dd>
        </div>
        {expiresAt && (
          <div>
            <dt className="inline font-medium">有効期限:</dt>{' '}
            <dd className="inline">{formatDateTime(expiresAt.toISOString())}</dd>
          </div>
        )}
        {result.trackingNumber && (
          <div>
            <dt className="inline font-medium">追跡番号:</dt>{' '}
            <dd className="inline">{result.trackingNumber}</dd>
          </div>
        )}
      </dl>

      {isYamatoCompact && result.qrCode && (
        <div className="mt-3">
          {isExpired && (
            <div className="mb-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700" role="alert">
              このQRコードは有効期限切れです
            </div>
          )}
          <p className="mb-2 text-sm font-medium text-emerald-900">QRコード</p>
          <img
            alt="宅急便コンパクトQRコード"
            className="h-40 w-40 rounded border border-emerald-200 bg-white p-2"
            src={result.qrCode}
          />
          {result.waybillNumber && (
            <p className="mt-2 text-sm text-emerald-900">
              送り状番号: <span className="font-medium">{result.waybillNumber}</span>
            </p>
          )}
        </div>
      )}

      {pdfDataUrl && (
        <a
          className="mt-3 inline-flex rounded bg-emerald-700 px-3 py-1.5 text-sm text-white hover:bg-emerald-800"
          download={`${result.labelId}.pdf`}
          href={pdfDataUrl}
        >
          PDFをダウンロード
        </a>
      )}
    </section>
  );
}
