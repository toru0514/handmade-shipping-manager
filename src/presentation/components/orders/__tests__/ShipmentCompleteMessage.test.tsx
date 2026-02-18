// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ShipmentCompleteMessage } from '../ShipmentCompleteMessage';

describe('ShipmentCompleteMessage', () => {
  const data = {
    orderId: 'ORD-001',
    shippedAt: '2026-02-17T10:30:00.000Z',
    shippingMethod: 'click_post',
    trackingNumber: 'CP123456789JP',
  };

  it('open=false では表示されない', () => {
    render(<ShipmentCompleteMessage open={false} data={data} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('完了情報を表示できる', () => {
    render(<ShipmentCompleteMessage open data={data} onClose={() => {}} />);

    expect(screen.getByText('注文 ORD-001 を発送済みにしました。')).toBeInTheDocument();
    expect(screen.getByText('配送方法: クリックポスト')).toBeInTheDocument();
    expect(screen.getByText('追跡番号: CP123456789JP')).toBeInTheDocument();
  });

  it('閉じるボタンでonCloseが呼ばれる', () => {
    const onClose = vi.fn();
    render(<ShipmentCompleteMessage open data={data} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('発送連絡メッセージを生成してコピーできる', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/orders/ORD-001/message/shipping-notice') {
        return new Response(
          JSON.stringify({
            orderId: 'ORD-001',
            message: '山田 太郎 様\n発送しました。',
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText,
      },
    });

    render(<ShipmentCompleteMessage open data={data} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '発送連絡を作成' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '発送連絡メッセージ' })).toBeInTheDocument();
      expect(screen.getByText(/発送しました。/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'コピー' }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('山田 太郎 様\n発送しました。');
      expect(screen.getByRole('status')).toHaveTextContent('コピーしました');
    });
  });
});
