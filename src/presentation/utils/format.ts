/**
 * 日付フォーマット (YYYY/MM/DD)
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 日時フォーマット (YYYY/MM/DD HH:mm)
 */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 通貨フォーマット (¥1,234)
 */
export function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`;
}

/**
 * 配送方法ラベル
 */
export function shippingMethodLabel(method: string): string {
  if (method === 'click_post') return 'クリックポスト';
  if (method === 'yamato_compact') return '宅急便コンパクト';
  return method;
}

/**
 * プラットフォームラベル
 */
export function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    minne: 'minne',
    creema: 'creema',
  };
  return labels[platform] ?? platform;
}
