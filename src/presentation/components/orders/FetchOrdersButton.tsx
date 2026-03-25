import Button from '@mui/material/Button';

interface FetchOrdersButtonProps {
  platform: 'minne' | 'creema';
  isLoading: boolean;
  onClick: () => void;
}

export function FetchOrdersButton({ platform, isLoading, onClick }: FetchOrdersButtonProps) {
  return (
    <Button
      variant="contained"
      size="small"
      disabled={isLoading}
      onClick={onClick}
      sx={{ bgcolor: 'grey.800', '&:hover': { bgcolor: 'grey.900' } }}
    >
      {isLoading ? `${platform} 取得中...` : `${platform} 未読を取得 ▶`}
    </Button>
  );
}
