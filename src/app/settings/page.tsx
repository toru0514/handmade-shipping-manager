'use client';

import { useEffect, useState } from 'react';
import {
  AVAILABLE_TEMPLATE_VARIABLES,
  MessageTemplateDto,
} from '@/application/usecases/UpdateMessageTemplateUseCase';
import { TemplateEditor } from '@/presentation/components/settings/TemplateEditor';
import { TemplatePreview } from '@/presentation/components/settings/TemplatePreview';
import { VariableList } from '@/presentation/components/settings/VariableList';
import { MessageTemplateTypeValue } from '@/domain/valueObjects/MessageTemplateType';

const SAMPLE_VALUES: Record<string, string> = {
  buyer_name: '山田 太郎',
  product_name: 'ハンドメイドアクセサリー',
  price: '¥2,500',
  order_id: 'ORD-2026-0001',
  platform: 'minne',
  shipping_method: 'クリックポスト',
  tracking_number: '1234-5678-9012',
  tracking_url:
    'https://trackings.post.japanpost.jp/services/srv/search/input?requestNo1=123456789012',
  shipped_at: '2026/02/18 10:30',
};

function previewTemplate(content: string): string {
  return content.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_match, variableName: string) => {
    return SAMPLE_VALUES[variableName] ?? '';
  });
}

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

  useEffect(() => {
    async function loadTemplate(type: MessageTemplateTypeValue) {
      setIsInitializing(true);
      setError(null);
      setNotice(null);
      try {
        const response = await fetch(`/api/settings/templates/${type}`);
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          throw new Error(body.error?.message ?? 'テンプレートの読み込みに失敗しました');
        }
        const template = (await response.json()) as MessageTemplateDto;
        setTemplateContent(template.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'テンプレートの読み込みに失敗しました');
      } finally {
        setIsInitializing(false);
      }
    }

    void loadTemplate(activeType);
  }, [activeType]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/settings/templates/${activeType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: templateContent }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(body.error?.message ?? 'テンプレートの保存に失敗しました');
      }
      const saved = (await response.json()) as MessageTemplateDto;
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
      const response = await fetch(`/api/settings/templates/${activeType}/reset`, {
        method: 'POST',
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(body.error?.message ?? 'テンプレートの初期化に失敗しました');
      }
      const reset = (await response.json()) as MessageTemplateDto;
      setTemplateContent(reset.content);
      setNotice('テンプレートをデフォルトに戻しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'テンプレートの初期化に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  function handlePreview() {
    setPreviewContent(previewTemplate(templateContent));
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
