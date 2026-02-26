interface FetchOrdersButtonProps {
  platform: 'minne' | 'creema';
  isLoading: boolean;
  onClick: () => void;
}

export function FetchOrdersButton({ platform, isLoading, onClick }: FetchOrdersButtonProps) {
  return (
    <button
      type="button"
      className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={isLoading}
      onClick={onClick}
    >
      {isLoading ? `${platform} 取得中...` : `${platform} 未読を取得 ▶`}
    </button>
  );
}
