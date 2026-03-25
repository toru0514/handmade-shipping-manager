'use client';

import { useCallback, useRef, useState } from 'react';
import { uploadImageToMicroCms } from '../../actions';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloseIcon from '@mui/icons-material/Close';

type FileEntry = {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  url?: string;
  error?: string;
};

export default function ImageUploadPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const entries: FileEntry[] = Array.from(newFiles)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const,
      }));
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const entry = prev[index];
      URL.revokeObjectURL(entry.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleUpload = async () => {
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;

      setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f)));

      const formData = new FormData();
      formData.append('file', files[i].file);

      try {
        const result = await uploadImageToMicroCms(formData);
        if ('error' in result) {
          setFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, status: 'error', error: result.error } : f)),
          );
        } else {
          setFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, status: 'done', url: result.url } : f)),
          );
        }
      } catch {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', error: 'アップロードに失敗しました' } : f,
          ),
        );
      }
    }
    setUploading(false);
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" fontWeight="bold">
        画像追加
      </Typography>

      {/* Drop zone */}
      <Box
        onDragOver={(e: React.DragEvent) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          p: 6,
          borderRadius: 2,
          border: 2,
          borderStyle: 'dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          bgcolor: dragOver ? 'action.hover' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': { borderColor: 'primary.light' },
        }}
      >
        <AddPhotoAlternateIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          ここに画像をドラッグ&ドロップ、またはクリックして選択
        </Typography>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </Box>

      {/* File list */}
      {files.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              {files.length}件の画像
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={handleUpload}
              disabled={uploading || pendingCount === 0}
            >
              {uploading ? 'アップロード中...' : 'アップロード'}
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {files.map((entry, i) => (
              <Paper
                key={`${entry.file.name}-${i}`}
                variant="outlined"
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5 }}
              >
                {/* Thumbnail */}
                <Box
                  component="img"
                  src={entry.preview}
                  alt={entry.file.name}
                  sx={{ height: 48, width: 48, borderRadius: 1, objectFit: 'cover' }}
                />

                {/* Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight="medium" noWrap>
                    {entry.file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(entry.file.size / 1024).toFixed(0)} KB
                  </Typography>
                  {entry.status === 'done' && entry.url && (
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {entry.url}
                    </Typography>
                  )}
                  {entry.status === 'error' && entry.error && (
                    <Typography variant="caption" color="error">
                      {entry.error}
                    </Typography>
                  )}
                </Box>

                {/* Status */}
                <Box sx={{ flexShrink: 0 }}>
                  {entry.status === 'pending' && (
                    <IconButton size="small" onClick={() => removeFile(i)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                  {entry.status === 'uploading' && <CircularProgress size={20} />}
                  {entry.status === 'done' && <CheckCircleIcon color="success" />}
                  {entry.status === 'error' && <ErrorIcon color="error" />}
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
