import { describe, expect, it } from 'vitest';
import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { YamatoCompactLabel } from '@/domain/entities/YamatoCompactLabel';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';
import { SheetsClient } from '@/infrastructure/external/google/SheetsClient';
import { SpreadsheetShippingLabelRepository } from '../SpreadsheetShippingLabelRepository';

class InMemorySheetsClient implements SheetsClient {
  private rows: string[][] = [];
  clearCount = 0;
  writeCount = 0;

  async readRows(): Promise<string[][]> {
    return this.rows.map((row) => [...row]);
  }

  async writeRows(rows: string[][]): Promise<void> {
    this.writeCount += 1;
    this.rows = rows.map((row) => [...row]);
  }

  async clearRows(): Promise<void> {
    this.clearCount += 1;
    this.rows = [];
  }
}

function createClickPostLabel(params: { labelId: string; orderId: string }): ClickPostLabel {
  return new ClickPostLabel({
    labelId: new LabelId(params.labelId),
    orderId: new OrderId(params.orderId),
    pdfData: 'base64-pdf-data',
    trackingNumber: new TrackingNumber('CP123456789JP'),
    issuedAt: new Date('2026-02-10T00:00:00.000Z'),
  });
}

function createYamatoLabel(params: { labelId: string; orderId: string }): YamatoCompactLabel {
  return new YamatoCompactLabel({
    labelId: new LabelId(params.labelId),
    orderId: new OrderId(params.orderId),
    qrCode: 'yamato-qr-code',
    waybillNumber: 'YMT-1234-5678',
    issuedAt: new Date('2026-02-11T00:00:00.000Z'),
  });
}

describe('SpreadsheetShippingLabelRepository', () => {
  it('save/findById で ClickPostLabel を保存・取得できる', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetShippingLabelRepository(client);

    await repository.save(createClickPostLabel({ labelId: 'LBL-001', orderId: 'ORD-001' }));

    const found = await repository.findById(new LabelId('LBL-001'));
    expect(found).not.toBeNull();
    expect(found).toBeInstanceOf(ClickPostLabel);

    const clickPost = found as ClickPostLabel;
    expect(clickPost.labelId.toString()).toBe('LBL-001');
    expect(clickPost.orderId.toString()).toBe('ORD-001');
    expect(clickPost.pdfData).toBe('base64-pdf-data');
    expect(clickPost.trackingNumber.toString()).toBe('CP123456789JP');
    expect(clickPost.issuedAt.toISOString()).toBe('2026-02-10T00:00:00.000Z');
  });

  it('save/findById で YamatoCompactLabel を保存・取得できる', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetShippingLabelRepository(client);

    await repository.save(createYamatoLabel({ labelId: 'LBL-010', orderId: 'ORD-010' }));

    const found = await repository.findById(new LabelId('LBL-010'));
    expect(found).not.toBeNull();
    expect(found).toBeInstanceOf(YamatoCompactLabel);

    const yamato = found as YamatoCompactLabel;
    expect(yamato.labelId.toString()).toBe('LBL-010');
    expect(yamato.orderId.toString()).toBe('ORD-010');
    expect(yamato.qrCode).toBe('yamato-qr-code');
    expect(yamato.waybillNumber).toBe('YMT-1234-5678');
    expect(yamato.issuedAt.toISOString()).toBe('2026-02-11T00:00:00.000Z');
    expect(yamato.expiresAt?.toISOString()).toBe('2026-02-25T00:00:00.000Z');
  });

  it('findByOrderId は同一注文のラベルを配列で返す（1:N）', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetShippingLabelRepository(client);

    await repository.save(createClickPostLabel({ labelId: 'LBL-001', orderId: 'ORD-001' }));
    await repository.save(createYamatoLabel({ labelId: 'LBL-002', orderId: 'ORD-001' }));
    await repository.save(createClickPostLabel({ labelId: 'LBL-003', orderId: 'ORD-999' }));

    const labels = await repository.findByOrderId(new OrderId('ORD-001'));
    expect(labels).toHaveLength(2);
    expect(labels.map((label) => label.labelId.toString())).toEqual(['LBL-001', 'LBL-002']);
  });

  it('save は同一 labelId の場合に上書きする', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetShippingLabelRepository(client);

    await repository.save(createClickPostLabel({ labelId: 'LBL-001', orderId: 'ORD-001' }));
    await repository.save(createYamatoLabel({ labelId: 'LBL-001', orderId: 'ORD-001' }));

    const found = await repository.findById(new LabelId('LBL-001'));
    expect(found).toBeInstanceOf(YamatoCompactLabel);
    expect(await repository.findByOrderId(new OrderId('ORD-001'))).toHaveLength(1);
  });

  it('findById は存在しない場合に null を返す', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetShippingLabelRepository(client);

    const found = await repository.findById(new LabelId('LBL-NOT-FOUND'));
    expect(found).toBeNull();
  });

  it('save 時に clearRows 後に writeRows を行う', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetShippingLabelRepository(client);

    await repository.save(createClickPostLabel({ labelId: 'LBL-001', orderId: 'ORD-001' }));
    await repository.save(createYamatoLabel({ labelId: 'LBL-002', orderId: 'ORD-001' }));

    expect(client.clearCount).toBe(2);
    expect(client.writeCount).toBe(2);
  });

  it('不正な type を含む行はデシリアライズ時にエラーになる', async () => {
    const client = new InMemorySheetsClient();
    await client.writeRows([
      ['LBL-001', 'ORD-001', 'unknown', 'issued', '2026-02-10T00:00:00.000Z'],
    ]);
    const repository = new SpreadsheetShippingLabelRepository(client);

    await expect(repository.findById(new LabelId('LBL-001'))).rejects.toThrow(
      '不正なラベル種別です',
    );
  });

  it('issuedAt が空の行はデシリアライズ時にエラーになる', async () => {
    const client = new InMemorySheetsClient();
    await client.writeRows([['LBL-002', 'ORD-001', 'click_post', 'issued', '']]);
    const repository = new SpreadsheetShippingLabelRepository(client);

    await expect(repository.findById(new LabelId('LBL-002'))).rejects.toThrow('issuedAt が空です');
  });

  it('issuedAt が不正形式の行はデシリアライズ時にエラーになる', async () => {
    const client = new InMemorySheetsClient();
    await client.writeRows([['LBL-003', 'ORD-001', 'click_post', 'issued', 'not-a-date']]);
    const repository = new SpreadsheetShippingLabelRepository(client);

    await expect(repository.findById(new LabelId('LBL-003'))).rejects.toThrow(
      'issuedAt の日付フォーマットが不正です',
    );
  });

  it('findByOrderId は型を維持して返す', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetShippingLabelRepository(client);

    await repository.save(createClickPostLabel({ labelId: 'LBL-100', orderId: 'ORD-100' }));
    await repository.save(createYamatoLabel({ labelId: 'LBL-101', orderId: 'ORD-100' }));

    const labels = await repository.findByOrderId(new OrderId('ORD-100'));
    const types = labels.map((label: ShippingLabel) => label.type);
    expect(types).toEqual(['click_post', 'yamato_compact']);
  });
});
