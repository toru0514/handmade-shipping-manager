// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LabelResultView } from '../LabelResultView';

describe('LabelResultView', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('クリックポスト結果のダウンロードリンクと追跡番号を表示する', () => {
    render(
      <LabelResultView
        result={{
          orderId: 'ORD-001',
          labelId: 'LBL-001',
          shippingMethod: 'click_post',
          labelType: 'click_post',
          status: 'issued',
          issuedAt: '2026-03-01T10:00:00.000Z',
          pdfData: 'ZHVtbXk=',
          trackingNumber: 'CP123456789JP',
        }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText('伝票を発行しました')).toBeInTheDocument();
    expect(screen.getByText('CP123456789JP')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'PDFをダウンロード' });
    expect(link).toHaveAttribute('download', 'LBL-001.pdf');
    expect(link).toHaveAttribute('href', 'data:application/pdf;base64,ZHVtbXk=');
  });

  it('重複警告を表示できる', () => {
    render(
      <LabelResultView
        result={{
          orderId: 'ORD-002',
          labelId: 'LBL-002',
          shippingMethod: 'click_post',
          labelType: 'click_post',
          status: 'issued',
          issuedAt: '2026-03-01T10:00:00.000Z',
          pdfData: 'ZHVtbXk=',
          warnings: ['同一注文に既存の伝票があります（重複発行）'],
        }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('同一注文に既存の伝票があります');
  });

  it('閉じるボタンでコールバックが呼ばれる', () => {
    const onClose = vi.fn();
    render(
      <LabelResultView
        result={{
          orderId: 'ORD-003',
          labelId: 'LBL-003',
          shippingMethod: 'click_post',
          labelType: 'click_post',
          status: 'issued',
          issuedAt: '2026-03-01T10:00:00.000Z',
        }}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('宅急便コンパクトは QRコードと有効期限を表示する', () => {
    render(
      <LabelResultView
        result={{
          orderId: 'ORD-004',
          labelId: 'LBL-004',
          shippingMethod: 'yamato_compact',
          labelType: 'yamato_compact',
          status: 'issued',
          issuedAt: '2026-03-01T10:00:00.000Z',
          expiresAt: '2026-03-15T10:00:00.000Z',
          qrCode: 'data:image/png;base64,ZHVtbXk=',
          waybillNumber: 'YMT-1234-5678',
        }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText('有効期限:')).toBeInTheDocument();
    expect(screen.getByAltText('宅急便コンパクトQRコード')).toHaveAttribute(
      'src',
      'data:image/png;base64,ZHVtbXk=',
    );
    expect(screen.getByText('送り状番号:')).toBeInTheDocument();
    expect(screen.getByText('YMT-1234-5678')).toBeInTheDocument();
  });

  it('有効期限切れの宅急便コンパクトは警告を表示する', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T00:00:00.000Z'));

    render(
      <LabelResultView
        result={{
          orderId: 'ORD-005',
          labelId: 'LBL-005',
          shippingMethod: 'yamato_compact',
          labelType: 'yamato_compact',
          status: 'issued',
          issuedAt: '2026-03-01T10:00:00.000Z',
          expiresAt: '2026-03-15T10:00:00.000Z',
          qrCode: 'data:image/png;base64,ZHVtbXk=',
        }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('有効期限切れ');
  });
});
