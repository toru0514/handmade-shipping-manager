'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AVAILABLE_TEMPLATE_VARIABLES,
  UpdateMessageTemplateUseCase,
} from '@/application/usecases/UpdateMessageTemplateUseCase';
import { LocalStorageMessageTemplateRepository } from '@/infrastructure/adapters/persistence/LocalStorageMessageTemplateRepository';
import { TemplateEditor } from '@/presentation/components/settings/TemplateEditor';
import { TemplatePreview } from '@/presentation/components/settings/TemplatePreview';
import { VariableList } from '@/presentation/components/settings/VariableList';
import { MessageTemplateTypeValue } from '@/domain/valueObjects/MessageTemplateType';

function insertVariable(content: string, variableName: string): string {
  const suffix = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
  return `${content}${suffix}{{${variableName}}}`;
}

export default function SettingsPage() {
  const [activeType, setActiveType] = useState<MessageTemplateTypeValue>('purchase_thanks');
  const [templateContent, setTemplateContent] = useState('');
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const useCase = useMemo(() => {
    return new UpdateMessageTemplateUseCase(new LocalStorageMessageTemplateRepository());
  }, []);

  useEffect(() => {
    async function loadTemplate(type: MessageTemplateTypeValue) {
      setIsInitializing(true);
      setError(null);
      setNotice(null);
      try {
        const template = await useCase.getTemplate(type);
        setTemplateContent(template.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'テンプレートの読み込みに失敗しました');
      } finally {
        setIsInitializing(false);
      }
    }

    void loadTemplate(activeType);
  }, [activeType, useCase]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await useCase.updateTemplate({
        type: activeType,
        content: templateContent,
      });
      setTemplateContent(saved.content);
      setNotice('テンプレートを保存しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'テンプレートの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetToDefault() {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const reset = await useCase.resetToDefault(activeType);
      setTemplateContent(reset.content);
      setNotice('テンプレートをデフォルトに戻しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'テンプレートの初期化に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  function handlePreview() {
    setPreviewContent(
      useCase.preview({
        type: activeType,
        content: templateContent,
      }),
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">定型文設定</h1>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          className={`rounded px-4 py-2 text-sm ${
            activeType === 'purchase_thanks'
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 bg-white hover:bg-gray-100'
          }`}
          onClick={() => setActiveType('purchase_thanks')}
          disabled={isInitializing || isSaving}
        >
          購入お礼
        </button>
        <button
          type="button"
          className={`rounded px-4 py-2 text-sm ${
            activeType === 'shipping_notice'
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 bg-white hover:bg-gray-100'
          }`}
          onClick={() => setActiveType('shipping_notice')}
          disabled={isInitializing || isSaving}
        >
          発送連絡
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-100 px-4 py-3 text-red-700" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-4 rounded bg-green-100 px-4 py-3 text-green-700" role="status">
          {notice}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <TemplateEditor
          value={templateContent}
          isSaving={isSaving || isInitializing}
          onChange={setTemplateContent}
          onSave={handleSave}
          onPreview={handlePreview}
          onResetToDefault={handleResetToDefault}
        />
        <VariableList
          variables={AVAILABLE_TEMPLATE_VARIABLES[activeType]}
          onInsert={(variableName) => {
            setTemplateContent((prev) => insertVariable(prev, variableName));
            setNotice(null);
          }}
        />
      </section>

      {previewContent !== null && (
        <TemplatePreview content={previewContent} onClose={() => setPreviewContent(null)} />
      )}
    </main>
  );
}
