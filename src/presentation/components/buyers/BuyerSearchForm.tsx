'use client';

import { FormEvent, useState } from 'react';

interface BuyerSearchFormProps {
  readonly isLoading?: boolean;
  readonly onSearch: (buyerName: string) => Promise<void>;
}

export function BuyerSearchForm({ isLoading = false, onSearch }: BuyerSearchFormProps) {
  const [buyerName, setBuyerName] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSearch(buyerName);
  }

  async function handleClear() {
    setBuyerName('');
    await onSearch('');
  }

  return (
    <form
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      onSubmit={handleSubmit}
    >
      <label htmlFor="buyer-name" className="mb-2 block text-sm font-medium text-gray-700">
        購入者名
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="buyer-name"
          className="w-full rounded border border-gray-300 px-3 py-2"
          placeholder="例: 山田"
          value={buyerName}
          onChange={(event) => setBuyerName(event.target.value)}
          disabled={isLoading}
        />
        <button
          type="button"
          className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-60"
          onClick={() => void handleClear()}
          disabled={isLoading}
        >
          クリア
        </button>
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? '検索中...' : '検索'}
        </button>
      </div>
    </form>
  );
}
