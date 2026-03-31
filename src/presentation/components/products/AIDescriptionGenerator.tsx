'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { WoodMaterial } from '@/domain/types/wood';
import { DEFAULT_TEMPLATE } from '@/domain/services/ProductDescriptionPromptBuilder';
import type { DescriptionTemplate } from '@/infrastructure/adapters/persistence/GoogleSheetsDescriptionTemplateRepository';
import {
  generateProductDescription,
  getDescriptionTemplates,
  addDescriptionTemplateAction,
  updateDescriptionTemplateAction,
  deleteDescriptionTemplateAction,
} from '@/app/(manage)/products/actions';

const PLACEHOLDER_CHIPS = ['{木材名}', '{木材の特徴}', '{商品の特徴}'] as const;

type Props = {
  woods: WoodMaterial[];
  onGenerated: (description: string) => void;
  disabled?: boolean;
};

export function AIDescriptionGenerator({ woods, onGenerated, disabled = false }: Props) {
  const [selectedWoods, setSelectedWoods] = useState<WoodMaterial[]>([]);
  const [characteristics, setCharacteristics] = useState('');
  const [templates, setTemplates] = useState<DescriptionTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DescriptionTemplate | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // テンプレート編集ダイアログ
  const [editDialog, setEditDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editPending, startEditTransition] = useTransition();

  useEffect(() => {
    getDescriptionTemplates()
      .then(setTemplates)
      .catch(() => {});
  }, []);

  const canGenerate = selectedWoods.length > 0 && characteristics.trim().length > 0 && !pending;

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateProductDescription({
          woodIds: selectedWoods.map((w) => w.id),
          productCharacteristics: characteristics.trim(),
          template: selectedTemplate?.body ?? DEFAULT_TEMPLATE,
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

  const openNewTemplateDialog = useCallback(() => {
    setEditId(null);
    setEditName('');
    setEditBody(DEFAULT_TEMPLATE);
    setEditDialog(true);
  }, []);

  const openEditTemplateDialog = useCallback((tmpl: DescriptionTemplate) => {
    setEditId(tmpl.id);
    setEditName(tmpl.name);
    setEditBody(tmpl.body);
    setEditDialog(true);
  }, []);

  const handleSaveTemplate = () => {
    startEditTransition(async () => {
      try {
        if (editId) {
          await updateDescriptionTemplateAction({ id: editId, name: editName, body: editBody });
        } else {
          await addDescriptionTemplateAction({ name: editName, body: editBody });
        }
        const updated = await getDescriptionTemplates();
        setTemplates(updated);
        setEditDialog(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'テンプレートの保存に失敗しました');
      }
    });
  };

  const handleDeleteTemplate = useCallback(
    (tmplId: string) => {
      if (!confirm('このテンプレートを削除しますか？')) return;
      startEditTransition(async () => {
        try {
          await deleteDescriptionTemplateAction(tmplId);
          const updated = await getDescriptionTemplates();
          setTemplates(updated);
          if (selectedTemplate?.id === tmplId) setSelectedTemplate(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'テンプレートの削除に失敗しました');
        }
      });
    },
    [selectedTemplate],
  );

  const insertPlaceholder = useCallback((placeholder: string) => {
    setEditBody((prev) => prev + placeholder);
  }, []);

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

          {/* テンプレート選択 */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Autocomplete
                size="small"
                options={templates}
                getOptionLabel={(option) => option.name}
                value={selectedTemplate}
                onChange={(_, value) => setSelectedTemplate(value)}
                disabled={disabled || pending}
                sx={{ flex: 1 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="テンプレート（オプション）"
                    placeholder="デフォルトテンプレートを使用"
                  />
                )}
                noOptionsText="テンプレートがありません"
              />
              <IconButton
                size="small"
                onClick={openNewTemplateDialog}
                title="新規テンプレート作成"
                disabled={disabled || pending}
              >
                <AddIcon fontSize="small" />
              </IconButton>
              {selectedTemplate && (
                <>
                  <IconButton
                    size="small"
                    onClick={() => openEditTemplateDialog(selectedTemplate)}
                    title="テンプレートを編集"
                    disabled={disabled || pending}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                    title="テンプレートを削除"
                    disabled={disabled || pending}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              未選択時はデフォルトテンプレートを使用します。
              {'{木材名}'} {'{木材の特徴}'} {'{商品の特徴}'} が置換されます。
            </Typography>
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

      {/* テンプレート編集ダイアログ */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? 'テンプレートを編集' : '新規テンプレート作成'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              size="small"
              label="テンプレート名"
              placeholder="例: リング用テンプレート"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={editPending}
              fullWidth
            />
            <Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                  プレースホルダー挿入:
                </Typography>
                {PLACEHOLDER_CHIPS.map((ph) => (
                  <Chip
                    key={ph}
                    label={ph}
                    size="small"
                    variant="outlined"
                    onClick={() => insertPlaceholder(ph)}
                    disabled={editPending}
                    sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
              <TextField
                size="small"
                label="テンプレート本文"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                disabled={editPending}
                fullWidth
                multiline
                rows={15}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)} disabled={editPending}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveTemplate}
            disabled={editPending || !editName.trim() || !editBody.trim()}
            startIcon={editPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          >
            {editPending ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
