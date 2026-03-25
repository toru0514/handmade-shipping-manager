import Chip from '@mui/material/Chip';

interface PlatformChipProps {
  readonly platform: string;
}

const PLATFORM_CONFIG: Record<string, { color: string; bgColor: string }> = {
  minne: { color: '#9d174d', bgColor: '#fce7f3' },
  creema: { color: '#9a3412', bgColor: '#ffedd5' },
};

export function PlatformChip({ platform }: PlatformChipProps) {
  const config = PLATFORM_CONFIG[platform] ?? { color: '#374151', bgColor: '#f3f4f6' };

  return (
    <Chip
      label={platform}
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
