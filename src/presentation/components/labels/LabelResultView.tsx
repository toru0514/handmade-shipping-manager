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
        {result.trackingNumber && (
          <div>
            <dt className="inline font-medium">追跡番号:</dt>{' '}
            <dd className="inline">{result.trackingNumber}</dd>
          </div>
        )}
      </dl>

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
