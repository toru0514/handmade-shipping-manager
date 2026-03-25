import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import type { FetchNewOrdersResult } from '@/application/usecases/FetchNewOrdersUseCase';

interface FetchOrdersResultProps {
  result: FetchNewOrdersResult | null;
  requestError: string | null;
}

export function FetchOrdersResult({ result, requestError }: FetchOrdersResultProps) {
  if (!result && !requestError) {
    return null;
  }

  return (
    <Stack spacing={1} sx={{ mt: 1.5 }}>
      {requestError && <Alert severity="error">{requestError}</Alert>}

      {result && (
        <Paper variant="outlined" sx={{ p: 2 }} component="section" aria-label="取得結果">
          <Typography variant="body2" color="success.main">
            ✓ {result.fetched}件取得
          </Typography>
          <Typography variant="body2" color="text.secondary">
            - {result.skipped}件スキップ（重複）
          </Typography>
          {result.errors.length > 0 && (
            <Typography variant="body2" color="error">
              ✗ {result.errors.length}件エラー
            </Typography>
          )}

          {result.errors.length > 0 && (
            <Box component="ul" role="list" sx={{ mt: 1, pl: 2.5 }}>
              {result.errors.map((error, index) => (
                <Typography
                  component="li"
                  variant="body2"
                  color="error"
                  key={`${error.orderId}-${index}`}
                >
                  {error.orderId || '(orderId なし)'}: {error.reason}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}
    </Stack>
  );
}
