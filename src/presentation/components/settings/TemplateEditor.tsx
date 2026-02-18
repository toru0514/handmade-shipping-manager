'use client';

import { FormEvent } from 'react';

interface TemplateEditorProps {
  readonly value: string;
  readonly isSaving?: boolean;
  readonly onChange: (value: string) => void;
  readonly onSave: () => Promise<void>;
  readonly onPreview: () => void;
  readonly onResetToDefault: () => Promise<void>;
}

export function TemplateEditor({
  value,
  isSaving = false,
  onChange,
  onSave,
  onPreview,
  onResetToDefault,
}: TemplateEditorProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave();
  }

  return (
    <form
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <label htmlFor="template-content" className="mb-2 block text-sm font-medium text-gray-700">
        テンプレート本文
      </label>
      <textarea
        id="template-content"
        className="min-h-64 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-60"
          onClick={() => void onResetToDefault()}
          disabled={isSaving}
        >
          デフォルトに戻す
        </button>
        <button
          type="button"
          className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-60"
          onClick={onPreview}
          disabled={isSaving}
        >
          プレビュー
        </button>
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
