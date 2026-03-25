import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

interface EmptyStateProps {
  readonly message: string;
  readonly 'data-testid'?: string;
}

export function EmptyState({ message, 'data-testid': testId }: EmptyStateProps) {
  return (
    <Paper variant="outlined" data-testid={testId}>
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">{message}</Typography>
      </Box>
    </Paper>
  );
}
