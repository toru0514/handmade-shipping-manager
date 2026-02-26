// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FetchOrdersResult } from '../FetchOrdersResult';

describe('FetchOrdersResult', () => {
  it('結果がない場合は何も表示しない', () => {
    const { container } = render(<FetchOrdersResult result={null} requestError={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('件数を表示する', () => {
    render(
      <FetchOrdersResult
        result={{
          fetched: 3,
          skipped: 1,
          errors: [],
        }}
        requestError={null}
      />,
    );

    expect(screen.getByRole('region', { name: '取得結果' })).toBeInTheDocument();
    expect(screen.getByText('✓ 3件取得')).toBeInTheDocument();
    expect(screen.getByText('- 1件スキップ（重複）')).toBeInTheDocument();
    expect(screen.getByText('✗ 0件エラー')).toBeInTheDocument();
  });

  it('エラー詳細を表示する', () => {
    render(
      <FetchOrdersResult
        result={{
          fetched: 1,
          skipped: 0,
          errors: [
            { orderId: 'MN-001', reason: 'scrape failed' },
            { orderId: '', reason: 'invalid order id' },
          ],
        }}
        requestError={null}
      />,
    );

    expect(screen.getByText('✗ 2件エラー')).toBeInTheDocument();
    expect(screen.getByText('MN-001: scrape failed')).toBeInTheDocument();
    expect(screen.getByText('(orderId なし): invalid order id')).toBeInTheDocument();
  });

  it('リクエスト失敗時のエラーを表示する', () => {
    render(<FetchOrdersResult result={null} requestError="新規注文の取得に失敗しました" />);

    expect(screen.getByRole('alert')).toHaveTextContent('新規注文の取得に失敗しました');
  });
});
