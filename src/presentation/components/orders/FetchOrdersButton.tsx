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
      sx={{ bgcolor: 'grey.800', '&:hover': { bgcolor: 'grey.900' }, fontSize: '0.75rem' }}
    >
      {isLoading ? `${platform}取得中...` : `${platform}取得`}
    </Button>
  );
}
