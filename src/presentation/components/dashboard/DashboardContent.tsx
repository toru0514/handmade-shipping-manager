'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ContentCopy from '@mui/icons-material/ContentCopy';
import OpenInNew from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import {
  addProduct,
  enqueueDraft,
  refreshProductsFromSheets,
  ProductRow,
  JobRow,
} from '@/app/(manage)/products/actions';
import { AddProductModal, type AddProductFormData } from './AddProductModal';
import { CopyProductDialog } from '@/presentation/components/products/CopyProductDialog';
import { useToast } from '@/presentation/components/providers/ToastProvider';

type Props = {
  products: ProductRow[];
  jobs: JobRow[];
  spreadsheetUrl: string | null;
};

export type JobsContentProps = {
  jobs: JobRow[];
};

type DetailProduct = ProductRow & {
  jobHistory: JobRow[];
};

type OperationLogEntry = {
  id: string;
  type: 'sync' | 'enqueue' | 'add';
  status: 'success' | 'error';
  message: string;
  detail?: string;
  createdAt: number;
};

/** microCMS画像URLにリサイズパラメータを安全に付与する */
function buildThumbnailSrc(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.set('w', '80');
    url.searchParams.set('h', '80');
    url.searchParams.set('fit', 'crop');
    return url.toString();
  } catch {
    return raw;
  }
}

function NoImagePlaceholder() {
  return (
    <Box
      sx={{
        display: 'flex',
        height: 40,
        width: 40,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        fontSize: '0.75rem',
        color: 'text.secondary',
      }}
    >
      No img
    </Box>
  );
}

function ProductThumbnail({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <NoImagePlaceholder />;
  return (
    <Box
      component="img"
      src={buildThumbnailSrc(url)}
      alt=""
      onError={() => setFailed(true)}
      sx={{
        height: 40,
        width: 40,
        flexShrink: 0,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        objectFit: 'cover',
      }}
    />
  );
}

export function DashboardContent({ products, jobs, spreadsheetUrl }: Props) {
  const router = useRouter();
  const [pendingRefresh, startRefresh] = useTransition();
  const [pendingEnqueue, startEnqueue] = useTransition();
  const [pendingAddProduct, startAddProduct] = useTransition();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [copyingProductId, setCopyingProductId] = useState<string | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [operationLogs, setOperationLogs] = useState<OperationLogEntry[]>([]);
  const { showToast } = useToast();

  const appendLog = useCallback(
    (entry: Omit<OperationLogEntry, 'id' | 'createdAt'> & { detail?: string }) => {
      setOperationLogs((prev) => {
        const next: OperationLogEntry[] = [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            createdAt: Date.now(),
            ...entry,
          },
          ...prev,
        ];
        return next.slice(0, 20);
      });
    },
    [],
  );

  const handleRefresh = () => {
    startRefresh(async () => {
      try {
        await refreshProductsFromSheets();
        showToast({
          title: '同期が完了しました',
          description: 'スプレッドシートの内容を読み込みました。',
          variant: 'success',
        });
        appendLog({
          type: 'sync',
          status: 'success',
          message: '最新データを同期しました。',
        });
      } catch (error) {
        const message = extractErrorMessage(error);
        showToast({
          title: '同期に失敗しました',
          description: message,
          variant: 'error',
        });
        appendLog({
          type: 'sync',
          status: 'error',
          message: '同期に失敗しました。',
          detail: message,
        });
      }
    });
  };

  const handleAddProduct = (data: AddProductFormData) => {
    startAddProduct(async () => {
      try {
        await addProduct(data);
        setShowAddProductModal(false);
        showToast({
          title: '商品を追加しました',
          description: `${data.title} (${renderPlatformsForToast(data.platforms)})`,
          variant: 'success',
        });
        appendLog({
          type: 'add',
          status: 'success',
          message: `${data.title} を追加しました。`,
        });
      } catch (error) {
        const message = extractErrorMessage(error);
        showToast({
          title: '商品の追加に失敗しました',
          description: message,
          variant: 'error',
        });
        appendLog({
          type: 'add',
          status: 'error',
          message: '商品の追加に失敗しました。',
          detail: message,
        });
      }
    });
  };

  const selectedProduct: DetailProduct | null = useMemo(() => {
    if (!selectedProductId) return null;
    const product = products.find((item) => item.id === selectedProductId);
    if (!product) return null;
    const jobHistory = jobs.filter((job) => job.productId === product.id);
    return {
      ...product,
      jobHistory,
    };
  }, [jobs, products, selectedProductId]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box
        component="header"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: { sm: 'center' },
          justifyContent: { sm: 'space-between' },
        }}
      >
        <Box>
          <Typography variant="h5" component="h1" fontWeight={600} color="text.primary">
            ダッシュボード
          </Typography>
          <Typography variant="body2" color="text.secondary">
            スプレッドシートの同期状態と自動化ジョブの状況を確認できます。
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          {spreadsheetUrl && (
            <Button
              variant="contained"
              size="small"
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<OpenInNew />}
              sx={{
                backgroundColor: '#15803d',
                '&:hover': { backgroundColor: '#166534' },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                スプレッドシートを開く
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                シート
              </Box>
            </Button>
          )}
          <Button variant="outlined" size="small" onClick={() => setShowAddProductModal(true)}>
            商品を追加
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleRefresh}
            disabled={pendingRefresh}
          >
            {pendingRefresh ? '同期中...' : '最新データを同期'}
          </Button>
        </Box>
      </Box>

      <Paper variant="outlined">
        <Box
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            px: 2,
            py: 1,
          }}
        >
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            商品一覧
          </Typography>
        </Box>

        {/* Mobile card list */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {products.map((product) => (
            <Box
              key={product.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
                onClick={() => router.push(`/products/${encodeURIComponent(product.id)}`)}
              >
                {product.imageUrl ? (
                  <ProductThumbnail url={product.imageUrl} />
                ) : (
                  <NoImagePlaceholder />
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" fontWeight={500} color="text.primary" noWrap>
                    {product.title}
                  </Typography>
                  <Box
                    sx={{
                      mt: 0.5,
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 0.75,
                    }}
                  >
                    <StatusBadge status={product.status} />
                    <PlatformBadges values={product.platforms} />
                  </Box>
                </Box>
              </Box>
              {product.lastError && (
                <Typography variant="caption" color="error">
                  {product.lastError}
                </Typography>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                  onClick={() => router.push(`/products/${encodeURIComponent(product.id)}`)}
                  sx={{ fontSize: '0.75rem' }}
                >
                  編集
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopy sx={{ fontSize: 14 }} />}
                  onClick={() => setCopyingProductId(product.id)}
                  sx={{ fontSize: '0.75rem' }}
                >
                  コピー
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSelectedProductId(product.id)}
                  sx={{ fontSize: '0.75rem' }}
                >
                  詳細
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="secondary"
                  disabled={pendingEnqueue}
                  onClick={() =>
                    startEnqueue(async () => {
                      try {
                        await enqueueDraft(product.id, product.platforms);
                        showToast({
                          title: '送信キューに登録しました',
                          description: `${product.title} (${renderPlatformsForToast(product.platforms)})`,
                          variant: 'success',
                        });
                        appendLog({
                          type: 'enqueue',
                          status: 'success',
                          message: `${product.title} を送信キューに登録しました。`,
                        });
                      } catch (error) {
                        const message = extractErrorMessage(error);
                        showToast({
                          title: '送信キュー登録に失敗しました',
                          description: message,
                          variant: 'error',
                        });
                        appendLog({
                          type: 'enqueue',
                          status: 'error',
                          message: `${product.title} の送信キュー登録に失敗しました。`,
                          detail: message,
                        });
                      }
                    })
                  }
                  sx={{ fontSize: '0.75rem' }}
                >
                  {pendingEnqueue ? '送信中...' : '送信'}
                </Button>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Desktop table */}
        <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>商品名</TableCell>
                <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>出品先</TableCell>
                <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>ステータス</TableCell>
                <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>最終同期</TableCell>
                <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>エラー</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow
                  key={product.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/products/${encodeURIComponent(product.id)}`)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {product.imageUrl ? (
                        <ProductThumbnail url={product.imageUrl} />
                      ) : (
                        <NoImagePlaceholder />
                      )}
                      <Typography variant="body2" fontWeight={500} color="text.primary">
                        {product.title}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <PlatformBadges values={product.platforms} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={product.status} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {product.lastSyncedAt ? formatDate(product.lastSyncedAt) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="error">
                      {product.lastError ?? '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 1,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton
                        size="small"
                        onClick={() => router.push(`/products/${encodeURIComponent(product.id)}`)}
                        title="編集"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setCopyingProductId(product.id)}
                        title="コピー"
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setSelectedProductId(product.id)}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        詳細
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        color="secondary"
                        disabled={pendingEnqueue}
                        onClick={() =>
                          startEnqueue(async () => {
                            try {
                              await enqueueDraft(product.id, product.platforms);
                              showToast({
                                title: '送信キューに登録しました',
                                description: `${product.title} (${renderPlatformsForToast(product.platforms)})`,
                                variant: 'success',
                              });
                              appendLog({
                                type: 'enqueue',
                                status: 'success',
                                message: `${product.title} を送信キューに登録しました。`,
                              });
                            } catch (error) {
                              const message = extractErrorMessage(error);
                              showToast({
                                title: '送信キュー登録に失敗しました',
                                description: message,
                                variant: 'error',
                              });
                              appendLog({
                                type: 'enqueue',
                                status: 'error',
                                message: `${product.title} の送信キュー登録に失敗しました。`,
                                detail: message,
                              });
                            }
                          })
                        }
                        sx={{ fontSize: '0.75rem' }}
                      >
                        {pendingEnqueue ? '送信中...' : '送信'}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {selectedProduct ? (
        <DetailSheet product={selectedProduct} onClose={() => setSelectedProductId(null)} />
      ) : null}

      {showAddProductModal && (
        <AddProductModal
          pending={pendingAddProduct}
          onSubmit={handleAddProduct}
          onClose={() => setShowAddProductModal(false)}
        />
      )}

      {copyingProductId &&
        (() => {
          const copyingProduct = products.find((p) => p.id === copyingProductId);
          return (
            <CopyProductDialog
              sourceProductId={copyingProductId}
              sourceProductTitle={copyingProduct?.title ?? copyingProductId}
              onClose={() => setCopyingProductId(null)}
              onCopied={(newId) => {
                setCopyingProductId(null);
                showToast({
                  title: '商品をコピーしました',
                  description: `${copyingProduct?.title ?? newId} のコピーを作成しました。`,
                  variant: 'success',
                });
                appendLog({
                  type: 'add',
                  status: 'success',
                  message: `${copyingProduct?.title ?? copyingProductId} をコピーしました。`,
                });
                router.push(`/products/${encodeURIComponent(newId)}`);
              }}
            />
          );
        })()}

      <OperationLogSection logs={operationLogs} />
    </Box>
  );
}

function PlatformBadges({ values }: { values: string[] }) {
  if (!values.length) {
    return (
      <Typography variant="caption" color="text.secondary">
        -
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {values.map((value) => (
        <Chip key={value} label={renderPlatformLabel(value)} size="small" variant="outlined" />
      ))}
    </Box>
  );
}

function StatusBadge({ status }: { status: ProductRow['status'] }) {
  const colorMap: Record<
    ProductRow['status'],
    'default' | 'info' | 'warning' | 'success' | 'error'
  > = {
    new: 'default',
    ready: 'info',
    queued: 'warning',
    processing: 'info',
    drafted: 'success',
    error: 'error',
    skipped: 'default',
  };
  const labelMap: Record<ProductRow['status'], string> = {
    new: '新規',
    ready: '下書き準備済み',
    queued: '待機中',
    processing: '処理中',
    drafted: '下書き作成済み',
    error: 'エラー',
    skipped: '対象外',
  };
  return <Chip label={labelMap[status] ?? status} color={colorMap[status]} size="small" />;
}

function JobStatusBadge({ status }: { status: JobRow['status'] }) {
  const colorMap: Record<JobRow['status'], 'default' | 'info' | 'warning' | 'success' | 'error'> = {
    queued: 'warning',
    processing: 'info',
    success: 'success',
    error: 'error',
    skipped: 'default',
  };
  const labelMap: Record<JobRow['status'], string> = {
    queued: '待機中',
    processing: '処理中',
    success: '完了',
    error: 'エラー',
    skipped: '対象外',
  };
  return <Chip label={labelMap[status] ?? status} color={colorMap[status]} size="small" />;
}

function formatDate(value: string | null | undefined) {
  try {
    if (!value) return '-';
    return new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value ?? '-';
  }
}

function DetailSheet({ product, onClose }: { product: DetailProduct; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" component="span" fontWeight={600}>
          {product.title}
        </Typography>
        <Button variant="outlined" size="small" onClick={onClose}>
          閉じる
        </Button>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={600} color="text.primary">
            基本情報
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, pt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                価格
              </Typography>
              <Typography variant="body2" fontWeight={500} color="text.primary">
                {product.price !== null ? `¥${product.price.toLocaleString()}` : '-'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                在庫
              </Typography>
              <Typography variant="body2" fontWeight={500} color="text.primary">
                {product.inventory ?? '-'}
              </Typography>
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="caption" color="text.secondary">
                タグ
              </Typography>
              <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {product.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="caption" color="text.secondary">
                説明
              </Typography>
              <Typography
                variant="body2"
                color="text.primary"
                sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}
              >
                {product.description}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle2" fontWeight={600} color="text.primary">
            ジョブ履歴
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {product.jobHistory.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                ジョブ履歴はありません。
              </Typography>
            ) : (
              product.jobHistory.map((job) => (
                <Paper key={job.id} variant="outlined" sx={{ px: 1.5, py: 1 }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography variant="body2" fontWeight={500} color="text.primary">
                      {renderPlatformLabel(job.platform)}
                    </Typography>
                    <JobStatusBadge status={job.status} />
                  </Box>
                  <Box
                    sx={{
                      mt: 0.5,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 0.5,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      ジョブID: {job.id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      試行回数: {job.attempt ?? '-'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      開始: {formatDate(job.startedAt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      所要: {job.durationSeconds ? `${job.durationSeconds}s` : '-'}
                    </Typography>
                  </Box>
                  {job.lastError ? (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ mt: 0.5, display: 'block', fontSize: '11px' }}
                    >
                      {job.lastError}
                    </Typography>
                  ) : null}
                </Paper>
              ))
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function renderPlatformLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === 'creema') return 'Creema';
  if (normalized === 'minne') return 'minne';
  if (normalized === 'base') return 'BASE';
  return value;
}

function renderPlatformsForToast(platforms: string[]) {
  if (!platforms.length) return 'プラットフォーム未指定';
  return platforms.map(renderPlatformLabel).join(', ');
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return '不明なエラーが発生しました';
  }
}

function OperationLogSection({ logs }: { logs: OperationLogEntry[] }) {
  return (
    <Paper variant="outlined" component="section">
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
          px: 2,
          py: 1,
        }}
      >
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          操作ログ
        </Typography>
      </Box>
      {logs.length === 0 ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', px: 2, py: 2 }}
        >
          まだ操作履歴はありません。同期・送信を行うと最新20件がここに表示されます。
        </Typography>
      ) : (
        <>
          {/* Mobile card list */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            {logs.map((log) => (
              <Box
                key={log.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  px: 2,
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight={500} color="text.primary">
                    {renderOperationLabel(log.type)}
                  </Typography>
                  <Chip
                    label={log.status === 'success' ? '成功' : '失敗'}
                    color={log.status === 'success' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {log.message}
                </Typography>
                {log.detail && (
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    {log.detail}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {formatDate(new Date(log.createdAt).toISOString())}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Desktop table */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>時刻</TableCell>
                  <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>操作</TableCell>
                  <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>結果</TableCell>
                  <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>詳細</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(new Date(log.createdAt).toISOString())}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.primary">
                        {renderOperationLabel(log.type)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.status === 'success' ? '成功' : '失敗'}
                        color={log.status === 'success' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {log.message}
                      </Typography>
                      {log.detail ? (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          {log.detail}
                        </Typography>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </Paper>
  );
}

function renderOperationLabel(type: OperationLogEntry['type']) {
  if (type === 'sync') return 'シート同期';
  if (type === 'enqueue') return '送信キュー登録';
  if (type === 'add') return '商品追加';
  return type;
}

export function JobsContent({ jobs }: JobsContentProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box component="header">
        <Typography variant="h5" component="h1" fontWeight={600} color="text.primary">
          ジョブステータス
        </Typography>
        <Typography variant="body2" color="text.secondary">
          各プラットフォームへの出品ジョブの状況を確認できます。
        </Typography>
      </Box>

      <Paper variant="outlined" component="section">
        {jobs.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 2, py: 4, textAlign: 'center' }}
          >
            ジョブはまだありません。
          </Typography>
        ) : (
          <>
            {/* Mobile card list */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              {jobs.map((job) => (
                <Box
                  key={job.id}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PlatformBadges values={[job.platform]} />
                      <JobStatusBadge status={job.status} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      試行: {job.attempt ?? '-'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={500} color="text.primary" noWrap>
                    {job.productId}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(job.startedAt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {job.durationSeconds ? `${job.durationSeconds}s` : '-'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Desktop table */}
            <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      ジョブID
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>商品</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      プラットフォーム
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      ステータス
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>試行</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      開始時刻
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      所要時間
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} color="text.primary">
                          {job.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {job.productId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <PlatformBadges values={[job.platform]} />
                      </TableCell>
                      <TableCell>
                        <JobStatusBadge status={job.status} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {job.attempt ?? '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(job.startedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {job.durationSeconds ? `${job.durationSeconds}s` : '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
