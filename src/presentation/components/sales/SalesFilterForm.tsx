'use client';

import { FormEvent, useState } from 'react';

interface SalesFilterFormProps {
  readonly isLoading?: boolean;
  readonly defaultStartDate: string;
  readonly defaultEndDate: string;
  readonly onFilter: (params: {
    startDate: string;
    endDate: string;
    platform: 'minne' | 'creema' | 'all';
  }) => Promise<void>;
}

export function SalesFilterForm({
  isLoading = false,
  defaultStartDate,
  defaultEndDate,
  onFilter,
}: SalesFilterFormProps) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [platform, setPlatform] = useState<'minne' | 'creema' | 'all'>('all');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onFilter({ startDate, endDate, platform });
  }

  return (
    <form
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      onSubmit={handleSubmit}
      data-testid="sales-filter-form"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <label htmlFor="start-date" className="mb-1 block text-sm font-medium text-gray-700">
            開始日
          </label>
          <input
            id="start-date"
            type="date"
            className="w-full rounded border border-gray-300 px-3 py-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="flex items-center justify-center text-gray-500">〜</div>
        <div className="flex-1">
          <label htmlFor="end-date" className="mb-1 block text-sm font-medium text-gray-700">
            終了日
          </label>
          <input
            id="end-date"
            type="date"
            className="w-full rounded border border-gray-300 px-3 py-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="platform" className="mb-1 block text-sm font-medium text-gray-700">
            プラットフォーム
          </label>
          <select
            id="platform"
            className="w-full rounded border border-gray-300 px-3 py-2"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as 'minne' | 'creema' | 'all')}
            disabled={isLoading}
          >
            <option value="all">すべて</option>
            <option value="minne">minne</option>
            <option value="creema">creema</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? '集計中...' : '集計する'}
        </button>
      </div>
    </form>
  );
}
