'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditIcon from '@mui/icons-material/Edit';
import RestoreIcon from '@mui/icons-material/Restore';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { WoodMaterial } from '@/domain/types/wood';
import { DEFAULT_TEMPLATE } from '@/domain/services/ProductDescriptionPromptBuilder';
import { generateProductDescription } from '@/app/(manage)/products/actions';

const STORAGE_KEY = 'ai-description-template';

const PLACEHOLDER_CHIPS = ['{木材名}', '{木材の特徴}', '{商品の特徴}'] as const;

type Props = {
  woods: WoodMaterial[];
  onGenerated: (description: string) => void;
  disabled?: boolean;
};

function loadTemplate(): string {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATE;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TEMPLATE;
}

function saveTemplate(template: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, template);
}

export function AIDescriptionGenerator({ woods, onGenerated, disabled = false }: Props) {
  const [selectedWoods, setSelectedWoods] = useState<WoodMaterial[]>([]);
  const [characteristics, setCharacteristics] = useState('');
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [showTemplate, setShowTemplate] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setTemplate(loadTemplate());
  }, []);

  const handleTemplateChange = useCallback((value: string) => {
    setTemplate(value);
    saveTemplate(value);
  }, []);

  const handleResetTemplate = useCallback(() => {
    setTemplate(DEFAULT_TEMPLATE);
    saveTemplate(DEFAULT_TEMPLATE);
  }, []);

  const insertPlaceholder = useCallback((placeholder: string) => {
    setTemplate((prev) => {
      const updated = prev + placeholder;
      saveTemplate(updated);
      return updated;
    });
  }, []);

  const canGenerate = selectedWoods.length > 0 && characteristics.trim().length > 0 && !pending;

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateProductDescription({
          woodIds: selectedWoods.map((w) => w.id),
          productCharacteristics: characteristics.trim(),
          template: template.trim(),
        });
        if ('error' in result) {
          setError(result.error);
        } else {
          onGenerated(result.text);
        }
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

          {/* テンプレート編集セクション */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                テンプレート
              </Typography>
              <IconButton
                size="small"
                onClick={() => setShowTemplate((prev) => !prev)}
                title="テンプレートを編集"
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
              {showTemplate && (
                <IconButton
                  size="small"
                  onClick={handleResetTemplate}
                  title="デフォルトに戻す"
                  disabled={disabled || pending}
                >
                  <RestoreIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>

            <Collapse in={showTemplate}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {PLACEHOLDER_CHIPS.map((ph) => (
                  <Chip
                    key={ph}
                    label={ph}
                    size="small"
                    variant="outlined"
                    onClick={() => insertPlaceholder(ph)}
                    disabled={disabled || pending}
                    sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
              <TextField
                size="small"
                value={template}
                onChange={(e) => handleTemplateChange(e.target.value)}
                disabled={disabled || pending}
                fullWidth
                multiline
                rows={10}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: 'block' }}
              >
                {'{木材名}'} {'{木材の特徴}'} {'{商品の特徴}'}{' '}
                が選択した値に置換され、AIが文章を整えます。
              </Typography>
            </Collapse>
          </Box>

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
