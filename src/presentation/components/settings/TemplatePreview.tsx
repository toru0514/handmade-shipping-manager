'use client';

interface TemplatePreviewProps {
  readonly content: string;
  readonly onClose: () => void;
}

export function TemplatePreview({ content, onClose }: TemplatePreviewProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
        <h2 id="template-preview-title" className="mb-4 text-xl font-bold">
          プレビュー
        </h2>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm">
          {content}
        </pre>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
