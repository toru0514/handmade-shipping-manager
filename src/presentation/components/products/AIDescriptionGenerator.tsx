'use client';

import { useState, useTransition } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { WoodMaterial } from '@/domain/types/wood';
import { generateProductDescription } from '@/app/(manage)/products/actions';

type Props = {
  woods: WoodMaterial[];
  onGenerated: (description: string) => void;
  disabled?: boolean;
};

export function AIDescriptionGenerator({ woods, onGenerated, disabled = false }: Props) {
  const [selectedWoods, setSelectedWoods] = useState<WoodMaterial[]>([]);
  const [characteristics, setCharacteristics] = useState('');
  const [referenceExample, setReferenceExample] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canGenerate = selectedWoods.length > 0 && characteristics.trim().length > 0 && !pending;

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateProductDescription({
          woodIds: selectedWoods.map((w) => w.id),
          productCharacteristics: characteristics.trim(),
          referenceExample: referenceExample.trim() || undefined,
        });
        onGenerated(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AI説明文の生成に失敗しました');
      }
    });
  };

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
        bgcolor: 'grey.50',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AutoAwesomeIcon fontSize="small" color="primary" />
          AI説明文生成
        </Typography>
        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Autocomplete
            multiple
            size="small"
            options={woods}
            getOptionLabel={(option) => option.name}
            value={selectedWoods}
            onChange={(_, value) => setSelectedWoods(value)}
            disabled={disabled || pending}
            renderInput={(params) => (
              <TextField {...params} label="使用木材" placeholder="木材を選択" />
            )}
            noOptionsText="木材が登録されていません"
          />

          <TextField
            size="small"
            label="商品の特徴"
            placeholder="例: 丸いピアス、三角形の指輪"
            value={characteristics}
            onChange={(e) => setCharacteristics(e.target.value)}
            disabled={disabled || pending}
          />

          <TextField
            size="small"
            label="参考例（オプション）"
            placeholder="既存の商品説明など、参考にしたい文体を入力"
            value={referenceExample}
            onChange={(e) => setReferenceExample(e.target.value)}
            disabled={disabled || pending}
            multiline
            rows={3}
          />

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            size="small"
            startIcon={
              pending ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />
            }
            onClick={handleGenerate}
            disabled={!canGenerate || disabled}
          >
            {pending ? '生成中...' : 'AI説明文を生成'}
          </Button>
        </Box>
      </Collapse>
    </Box>
  );
}
