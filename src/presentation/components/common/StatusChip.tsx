import Chip from '@mui/material/Chip';

interface StatusChipProps {
  readonly status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: '未発送', color: '#92400e', bgColor: '#fef3c7' },
  shipped: { label: '発送済', color: '#166534', bgColor: '#dcfce7' },
};

export function StatusChip({ status }: StatusChipProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: '#374151', bgColor: '#f3f4f6' };

  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        backgroundColor: config.bgColor,
        color: config.color,
        fontWeight: 600,
        fontSize: '0.75rem',
      }}
    />
  );
}
