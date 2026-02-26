interface FetchOrdersButtonProps {
  platform: 'minne';
  isLoading: boolean;
  onClick: () => void;
}

export function FetchOrdersButton({ platform, isLoading, onClick }: FetchOrdersButtonProps) {
  const platformLabel = platform === 'minne' ? 'minne' : platform;

  return (
    <button
      type="button"
      className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={isLoading}
      onClick={onClick}
    >
      {isLoading ? `${platformLabel} 取得中...` : `${platformLabel} 未読を取得 ▶`}
    </button>
  );
}
