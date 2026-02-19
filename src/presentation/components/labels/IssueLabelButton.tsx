import { useState } from 'react';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';

interface IssueLabelButtonProps {
  readonly onIssue: (shippingMethod: string) => Promise<void>;
  readonly isIssuing?: boolean;
  readonly disabled?: boolean;
}

export function IssueLabelButton({
  onIssue,
  isIssuing = false,
  disabled = false,
}: IssueLabelButtonProps) {
  const [shippingMethod, setShippingMethod] = useState<string>(ShippingMethod.ClickPost.toString());

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="shipping-method">
        配送方法
      </label>
      <select
        id="shipping-method"
        className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
        disabled={disabled || isIssuing}
        value={shippingMethod}
        onChange={(event) => setShippingMethod(event.target.value)}
      >
        <option value={ShippingMethod.ClickPost.toString()}>クリックポスト</option>
      </select>
      <button
        type="button"
        className="rounded bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
        disabled={disabled || isIssuing}
        onClick={() => void onIssue(shippingMethod)}
      >
        {isIssuing ? '発行中...' : '伝票発行'}
      </button>
    </div>
  );
}
