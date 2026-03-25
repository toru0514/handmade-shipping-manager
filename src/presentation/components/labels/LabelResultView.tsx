import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import type { IssueShippingLabelResultDto } from '@/application/usecases/IssueShippingLabelUseCase';

interface LabelResultViewProps {
  readonly result: IssueShippingLabelResultDto;
  readonly onClose: () => void;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ja-JP');
}

export function LabelResultView({ result, onClose }: LabelResultViewProps) {
  const pdfDataUrl =
    result.labelType === 'click_post'
      ? `data:application/pdf;base64,${result.pdfData ?? ''}`
      : null;
  const isYamatoCompact = result.labelType === 'yamato_compact';
  const expiresAt = result.expiresAt ? new Date(result.expiresAt) : null;
  const isExpired = expiresAt !== null && expiresAt.getTime() < Date.now();

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label="伝票発行結果"
      sx={{ mt: 2, p: 2, borderColor: 'success.main', bgcolor: 'success.50' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" color="success.dark">
          伝票を発行しました
        </Typography>
        <Button size="small" variant="outlined" color="success" onClick={onClose}>
          閉じる
        </Button>
      </Box>

      {result.warnings && result.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {result.warnings.map((warning) => (
            <Typography key={warning} variant="body2">
              {warning}
            </Typography>
          ))}
        </Alert>
      )}

      <Stack spacing={0.5} sx={{ fontSize: '0.875rem' }}>
        <Typography variant="body2">
          <strong>注文ID:</strong> {result.orderId}
        </Typography>
        <Typography variant="body2">
          <strong>伝票ID:</strong> {result.labelId}
        </Typography>
        <Typography variant="body2">
          <strong>配送方法:</strong> {result.shippingMethod}
        </Typography>
        <Typography variant="body2">
          <strong>発行日時:</strong> {formatDateTime(result.issuedAt)}
        </Typography>
        {expiresAt && (
          <Typography variant="body2">
            <strong>有効期限:</strong> {formatDateTime(expiresAt.toISOString())}
          </Typography>
        )}
        {result.trackingNumber && (
          <Typography variant="body2">
            <strong>追跡番号:</strong> {result.trackingNumber}
          </Typography>
        )}
      </Stack>

      {isYamatoCompact && result.qrCode && (
        <Box sx={{ mt: 1.5 }}>
          {isExpired && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              このQRコードは有効期限切れです
            </Alert>
          )}
          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            QRコード
          </Typography>
          <Box
            component="img"
            alt="宅急便コンパクトQRコード"
            src={result.qrCode}
            sx={{
              width: 160,
              height: 160,
              borderRadius: 1,
              border: 1,
              borderColor: 'success.200',
              bgcolor: 'background.paper',
              p: 1,
            }}
          />
          {result.waybillNumber && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              送り状番号: <strong>{result.waybillNumber}</strong>
            </Typography>
          )}
        </Box>
      )}

      {pdfDataUrl && (
        <Button
          variant="contained"
          color="success"
          size="small"
          component="a"
          download={`${result.labelId}.pdf`}
          href={pdfDataUrl}
          sx={{ mt: 1.5 }}
        >
          PDFをダウンロード
        </Button>
      )}
    </Paper>
  );
}
