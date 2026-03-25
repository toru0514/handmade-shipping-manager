import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseShippingLabelRepository } from '../SupabaseShippingLabelRepository';
import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { YamatoCompactLabel } from '@/domain/entities/YamatoCompactLabel';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';

function createClickPostLabel(id = 'LBL-001', orderId = 'ORD-001') {
  return new ClickPostLabel({
    labelId: new LabelId(id),
    orderId: new OrderId(orderId),
    pdfData: 'base64pdf',
    trackingNumber: new TrackingNumber('1234567890'),
    issuedAt: new Date('2026-03-20T10:00:00Z'),
  });
}

function createYamatoLabel(id = 'LBL-002', orderId = 'ORD-002') {
  return new YamatoCompactLabel({
    labelId: new LabelId(id),
    orderId: new OrderId(orderId),
    qrCode: 'qr-data',
    waybillNumber: 'WB-001',
    issuedAt: new Date('2026-03-20T10:00:00Z'),
  });
}

function createClickPostRow(id = 'LBL-001', orderId = 'ORD-001') {
  return {
    label_id: id,
    order_id: orderId,
    type: 'click_post',
    status: 'issued',
    issued_at: '2026-03-20T10:00:00.000Z',
    expires_at: null,
    click_post_pdf_data: 'base64pdf',
    click_post_tracking_number: '1234567890',
    yamato_qr_code: null,
    yamato_waybill_number: null,
    synced_at: '2026-03-20T10:00:00.000Z',
  };
}

function createYamatoRow(id = 'LBL-002', orderId = 'ORD-002') {
  return {
    label_id: id,
    order_id: orderId,
    type: 'yamato_compact',
    status: 'issued',
    issued_at: '2026-03-20T10:00:00.000Z',
    expires_at: '2026-04-03T10:00:00.000Z',
    click_post_pdf_data: null,
    click_post_tracking_number: null,
    yamato_qr_code: 'qr-data',
    yamato_waybill_number: 'WB-001',
    synced_at: '2026-03-20T10:00:00.000Z',
  };
}

function createMockSupabase() {
  const upsertFn = vi.fn().mockResolvedValue({ error: null });
  const maybeSingleFn = vi.fn().mockResolvedValue({ data: null, error: null });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  const fromFn = vi.fn().mockReturnValue({
    select: selectFn,
    upsert: upsertFn,
  });

  return { from: fromFn, select: selectFn, eq: eqFn, maybeSingle: maybeSingleFn, upsert: upsertFn };
}

describe('SupabaseShippingLabelRepository', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  let repository: SupabaseShippingLabelRepository;

  beforeEach(() => {
    mock = createMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new SupabaseShippingLabelRepository(mock as any);
  });

  describe('findById', () => {
    it('ClickPostLabel を取得できる', async () => {
      mock.maybeSingle.mockResolvedValue({ data: createClickPostRow(), error: null });

      const result = await repository.findById(new LabelId('LBL-001'));

      expect(result).toBeInstanceOf(ClickPostLabel);
      expect(result!.labelId.toString()).toBe('LBL-001');
      expect((result as ClickPostLabel).pdfData).toBe('base64pdf');
      expect(mock.from).toHaveBeenCalledWith('shipping_labels');
      expect(mock.eq).toHaveBeenCalledWith('label_id', 'LBL-001');
    });

    it('YamatoCompactLabel を取得できる', async () => {
      mock.maybeSingle.mockResolvedValue({ data: createYamatoRow(), error: null });

      const result = await repository.findById(new LabelId('LBL-002'));

      expect(result).toBeInstanceOf(YamatoCompactLabel);
      expect((result as YamatoCompactLabel).qrCode).toBe('qr-data');
      expect((result as YamatoCompactLabel).waybillNumber).toBe('WB-001');
    });

    it('存在しない場合は null を返す', async () => {
      mock.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await repository.findById(new LabelId('LBL-999'));

      expect(result).toBeNull();
    });

    it('エラー時は例外をスローする', async () => {
      mock.maybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(repository.findById(new LabelId('LBL-001'))).rejects.toThrow('DB error');
    });
  });

  describe('findByOrderId', () => {
    it('指定した orderId のラベルを返す', async () => {
      mock.eq.mockResolvedValue({
        data: [createClickPostRow('LBL-001', 'ORD-001'), createClickPostRow('LBL-003', 'ORD-001')],
        error: null,
      });

      const result = await repository.findByOrderId(new OrderId('ORD-001'));

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(ClickPostLabel);
      expect(mock.eq).toHaveBeenCalledWith('order_id', 'ORD-001');
    });

    it('エラー時は例外をスローする', async () => {
      mock.eq.mockResolvedValue({ data: null, error: { message: 'query failed' } });

      await expect(repository.findByOrderId(new OrderId('ORD-001'))).rejects.toThrow(
        'query failed',
      );
    });
  });

  describe('findAll', () => {
    it('全ラベルを返す', async () => {
      mock.select.mockResolvedValue({
        data: [createClickPostRow(), createYamatoRow()],
        error: null,
      });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(ClickPostLabel);
      expect(result[1]).toBeInstanceOf(YamatoCompactLabel);
    });

    it('エラー時は例外をスローする', async () => {
      mock.select.mockResolvedValue({ data: null, error: { message: 'select failed' } });

      await expect(repository.findAll()).rejects.toThrow('select failed');
    });
  });

  describe('save', () => {
    it('ClickPostLabel を upsert する', async () => {
      const label = createClickPostLabel();
      await repository.save(label);

      expect(mock.from).toHaveBeenCalledWith('shipping_labels');
      expect(mock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          label_id: 'LBL-001',
          type: 'click_post',
          click_post_pdf_data: 'base64pdf',
          click_post_tracking_number: '1234567890',
          yamato_qr_code: null,
          yamato_waybill_number: null,
        }),
        { onConflict: 'label_id' },
      );
    });

    it('YamatoCompactLabel を upsert する', async () => {
      const label = createYamatoLabel();
      await repository.save(label);

      expect(mock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          label_id: 'LBL-002',
          type: 'yamato_compact',
          yamato_qr_code: 'qr-data',
          yamato_waybill_number: 'WB-001',
          click_post_pdf_data: null,
          click_post_tracking_number: null,
        }),
        { onConflict: 'label_id' },
      );
    });

    it('エラー時は例外をスローする', async () => {
      mock.upsert.mockResolvedValue({ error: { message: 'upsert failed' } });

      await expect(repository.save(createClickPostLabel())).rejects.toThrow('upsert failed');
    });
  });

  describe('saveAll', () => {
    it('空配列の場合は何もしない', async () => {
      await repository.saveAll([]);

      expect(mock.from).not.toHaveBeenCalled();
    });

    it('複数ラベルを一括 upsert する', async () => {
      const labels = [createClickPostLabel(), createYamatoLabel()];
      await repository.saveAll(labels);

      expect(mock.from).toHaveBeenCalledWith('shipping_labels');
      expect(mock.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label_id: 'LBL-001', type: 'click_post' }),
          expect.objectContaining({ label_id: 'LBL-002', type: 'yamato_compact' }),
        ]),
        { onConflict: 'label_id' },
      );
    });

    it('エラー時は例外をスローする', async () => {
      mock.upsert.mockResolvedValue({ error: { message: 'bulk upsert failed' } });

      await expect(repository.saveAll([createClickPostLabel()])).rejects.toThrow(
        'bulk upsert failed',
      );
    });
  });
});
