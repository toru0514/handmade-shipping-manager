import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

interface FetchOrdersButtonProps {
  platform: 'minne' | 'creema';
  isLoading: boolean;
  onClick: () => void;
}

const PLATFORM_DISPLAY_NAME: Record<'minne' | 'creema', string> = {
  minne: 'minne',
  creema: 'Creema',
};

export function FetchOrdersButton({ platform, isLoading, onClick }: FetchOrdersButtonProps) {
  const displayName = PLATFORM_DISPLAY_NAME[platform];
  return (
    <Button
      variant="contained"
      size="small"
      disabled={isLoading}
      onClick={onClick}
      sx={{
        bgcolor: 'grey.800',
        '&:hover': { bgcolor: 'grey.900' },
        textTransform: 'none',
      }}
    >
      {isLoading ? (
        `${displayName} 取得中...`
      ) : (
        <>
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            {displayName} 未読を取得 ▶
          </Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' }, fontSize: '0.75rem' }}>
            {displayName}取得
          </Box>
        </>
      )}
    </Button>
  );
}
