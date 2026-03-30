'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  getProductDetail,
  updateProduct,
  getFieldOptions,
  getDashboardData,
} from '@/app/(manage)/products/actions';
import { ImagePickerDialog } from './ImagePickerDialog';
import { AIDescriptionGenerator } from './AIDescriptionGenerator';
import { getWoods } from '@/app/(manage)/woods/actions';
import type { WoodMaterial } from '@/domain/types/wood';
import {
  FIELD_CONFIGS,
  SECTION_LABELS,
  SELECT_FIELD_KEYS,
  getExtraFields,
  type FieldConfig,
  type FieldSection,
} from './fieldConfig';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

type Props = {
  productId: string;
};

export function ProductEditForm({ productId }: Props) {
  const router = useRouter();
  const [raw, setRaw] = useState<Record<string, string> | null>(null);
  const [initialRaw, setInitialRaw] = useState<Record<string, string> | null>(null);
  const [fieldOptions, setFieldOptions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pendingSave, startSave] = useTransition();
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [woods, setWoods] = useState<WoodMaterial[]>([]);
  const [referenceProducts, setReferenceProducts] = useState<
    { id: string; title: string; description: string }[]
  >([]);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, options] = await Promise.all([
        getProductDetail(productId),
        getFieldOptions(SELECT_FIELD_KEYS),
      ]);
      setRaw({ ...detail.raw });
      setInitialRaw({ ...detail.raw });
      setFieldOptions(options);
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    getWoods()
      .then(setWoods)
      .catch(() => {});
    getDashboardData()
      .then((data) => setReferenceProducts(data.products))
      .catch(() => {});
  }, []);

  const handleFieldChange = (key: string, value: string) => {
    setSaveSuccess(false);
    setRaw((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = () => {
    if (!raw || !initialRaw) return;

    const changedFields: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (value !== (initialRaw[key] ?? '')) {
        changedFields[key] = value;
      }
    }

    if (Object.keys(changedFields).length === 0) return;

    startSave(async () => {
      try {
        await updateProduct({ productId, fields: changedFields });
        await loadProduct();
        setSaveSuccess(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : '保存に失敗しました');
      }
    });
  };

  const allFields = raw ? [...FIELD_CONFIGS, ...getExtraFields(raw)] : FIELD_CONFIGS;

  const sections: FieldSection[] = ['basic', 'creema', 'minne', 'iichi', 'base'];

  const hasChanges =
    raw &&
    initialRaw &&
    Object.entries(raw).some(([key, value]) => value !== (initialRaw[key] ?? ''));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => router.push('/products')} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="bold">
            商品編集
          </Typography>
        </Box>
        <Button variant="contained" onClick={handleSave} disabled={pendingSave || !hasChanges}>
          {pendingSave ? '保存中...' : '保存'}
        </Button>
      </Box>

      {/* Messages */}
      {error && <Alert severity="error">{error}</Alert>}
      {saveSuccess && <Alert severity="success">保存しました。</Alert>}
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            読み込み中...
          </Typography>
        </Box>
      )}

      {/* Sections */}
      {!loading && raw && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sections.map((section) => {
            const sectionFields = allFields.filter((f) => f.section === section);
            if (sectionFields.length === 0 && section !== 'base') return null;

            return (
              <Accordion key={section} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {SECTION_LABELS[section]}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    {section === 'base' && sectionFields.length === 0 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ gridColumn: '1 / -1' }}
                      >
                        BASEは基本情報のみで追加フィールドはありません。
                      </Typography>
                    )}
                    {sectionFields.map((field) => (
                      <FieldInput
                        key={field.key}
                        field={field}
                        value={raw[field.key] ?? ''}
                        onChange={(v) => handleFieldChange(field.key, v)}
                        disabled={pendingSave}
                        options={fieldOptions[field.key]}
                        onPickImages={
                          field.key === 'image_urls' ? () => setShowImagePicker(true) : undefined
                        }
                        woods={field.key === 'description' ? woods : undefined}
                        referenceProducts={
                          field.key === 'description' ? referenceProducts : undefined
                        }
                      />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {/* Image picker dialog */}
      {showImagePicker && (
        <ImagePickerDialog
          currentUrls={(raw?.['image_urls'] ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)}
          onConfirm={(urls) => {
            handleFieldChange('image_urls', urls.join(','));
            setShowImagePicker(false);
          }}
          onClose={() => setShowImagePicker(false)}
        />
      )}

      {/* Bottom save bar */}
      {!loading && raw && hasChanges && (
        <Paper
          elevation={3}
          sx={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { sm: 'center' },
            gap: 1,
            px: 2,
            py: 1.5,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            未保存の変更があります
          </Typography>
          <Button variant="contained" onClick={handleSave} disabled={pendingSave}>
            {pendingSave ? '保存中...' : '保存'}
          </Button>
        </Paper>
      )}
    </Box>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  disabled,
  options,
  onPickImages,
  woods,
  referenceProducts,
}: {
  field: FieldConfig;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  options?: string[];
  onPickImages?: () => void;
  woods?: WoodMaterial[];
  referenceProducts?: { id: string; title: string; description: string }[];
}) {
  const isWide = field.type === 'textarea' || field.type === 'platforms';

  if (field.type === 'textarea') {
    return (
      <Box sx={{ gridColumn: isWide ? '1 / -1' : undefined }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}
        >
          <Typography variant="caption" color="text.secondary">
            {field.label}
          </Typography>
          {onPickImages && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddPhotoAlternateIcon />}
              onClick={onPickImages}
              disabled={disabled}
              sx={{ fontSize: '0.75rem' }}
            >
              microCMSから選択
            </Button>
          )}
        </Box>
        {field.key === 'description' && woods && woods.length > 0 && (
          <AIDescriptionGenerator
            woods={woods}
            products={referenceProducts}
            onGenerated={(text) => onChange(text)}
            disabled={disabled}
          />
        )}
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          size="small"
          fullWidth
          multiline
          rows={field.key === 'description' ? 12 : 4}
        />
        {field.key === 'image_urls' && value && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {value
              .split(',')
              .map((url) => url.trim())
              .filter(Boolean)
              .map((url) => (
                <Box
                  key={url}
                  component="img"
                  src={`${url}?w=80&h=80&fit=crop`}
                  alt=""
                  sx={{
                    height: 64,
                    width: 64,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    objectFit: 'cover',
                  }}
                />
              ))}
          </Box>
        )}
      </Box>
    );
  }

  if (field.type === 'platforms') {
    const PLATFORM_OPTIONS = [
      { value: 'creema', label: 'Creema' },
      { value: 'minne', label: 'minne' },
      { value: 'base', label: 'BASE' },
      { value: 'iichi', label: 'iichi' },
    ];
    const selected = value
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const toggle = (pf: string) => {
      const next = selected.includes(pf) ? selected.filter((s) => s !== pf) : [...selected, pf];
      onChange(next.join(','));
    };

    return (
      <Box sx={{ gridColumn: '1 / -1' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          {field.label}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {PLATFORM_OPTIONS.map((pf) => (
            <FormControlLabel
              key={pf.value}
              control={
                <Checkbox
                  checked={selected.includes(pf.value)}
                  onChange={() => toggle(pf.value)}
                  disabled={disabled}
                  size="small"
                />
              }
              label={<Typography variant="body2">{pf.label}</Typography>}
            />
          ))}
        </Box>
      </Box>
    );
  }

  if (field.type === 'select' && options) {
    const allOptions = options.includes(value) || !value ? options : [value, ...options];

    return (
      <Box sx={{ gridColumn: isWide ? '1 / -1' : undefined }}>
        <FormControl size="small" fullWidth>
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            label={field.label}
          >
            <MenuItem value="">-- 選択してください --</MenuItem>
            {allOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  }

  return (
    <Box sx={{ gridColumn: isWide ? '1 / -1' : undefined }}>
      <TextField
        label={field.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        size="small"
        fullWidth
        slotProps={{ htmlInput: { inputMode: field.type === 'number' ? 'numeric' : undefined } }}
      />
    </Box>
  );
}
