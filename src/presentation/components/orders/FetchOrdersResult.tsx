import type { FetchNewOrdersResult } from '@/application/usecases/FetchNewOrdersUseCase';

interface FetchOrdersResultProps {
  result: FetchNewOrdersResult | null;
  requestError: string | null;
}

export function FetchOrdersResult({ result, requestError }: FetchOrdersResultProps) {
  if (!result && !requestError) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {requestError && (
        <div className="rounded bg-red-100 px-4 py-3 text-sm text-red-700" role="alert">
          {requestError}
        </div>
      )}

      {result && (
        <section className="rounded border border-gray-200 bg-white p-4" aria-label="取得結果">
          <p className="text-sm text-emerald-700">✓ {result.fetched}件取得</p>
          <p className="text-sm text-gray-700">- {result.skipped}件スキップ（重複）</p>
          <p className="text-sm text-gray-700">✗ {result.errors.length}件エラー</p>

          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700" role="list">
              {result.errors.map((error, index) => (
                <li key={`${error.orderId}-${index}`}>
                  {error.orderId || '(orderId なし)'}: {error.reason}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
