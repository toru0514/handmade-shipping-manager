import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { YamatoCompactLabel } from '@/domain/entities/YamatoCompactLabel';
import { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';
import { SheetsClient } from '../../external/google/SheetsClient';

const DEFAULT_RANGE = 'ShippingLabels!A2';

const COL = {
  labelId: 0,
  orderId: 1,
  type: 2,
  status: 3,
  issuedAt: 4,
  expiresAt: 5,
  clickPostPdfData: 6,
  clickPostTrackingNumber: 7,
  yamatoQrCode: 8,
  yamatoWaybillNumber: 9,
} as const;

export class SpreadsheetShippingLabelRepository implements ShippingLabelRepository<ShippingLabel> {
  constructor(private readonly sheetsClient: SheetsClient) {}

  async findById(labelId: LabelId): Promise<ShippingLabel | null> {
    const labels = await this.findAll();
    return labels.find((label) => label.labelId.equals(labelId)) ?? null;
  }

  async findByOrderId(orderId: OrderId): Promise<ShippingLabel[]> {
    const labels = await this.findAll();
    return labels.filter((label) => label.orderId.equals(orderId));
  }

  async save(label: ShippingLabel): Promise<void> {
    const rows = await this.sheetsClient.readRows();
    const serialized = this.serialize(label);
    const index = rows.findIndex((row) => row[COL.labelId] === label.labelId.toString());

    if (index >= 0) {
      rows[index] = serialized;
    } else {
      rows.push(serialized);
    }

    await this.sheetsClient.clearRows();
    await this.sheetsClient.writeRows(rows, DEFAULT_RANGE);
  }

  private async findAll(): Promise<ShippingLabel[]> {
    const rows = await this.sheetsClient.readRows();
    return rows
      .filter((row) => (row[COL.labelId] ?? '').trim().length > 0)
      .map((row) => this.deserialize(row));
  }

  private serialize(label: ShippingLabel): string[] {
    if (label instanceof ClickPostLabel) {
      return [
        label.labelId.toString(),
        label.orderId.toString(),
        label.type,
        label.status,
        label.issuedAt.toISOString(),
        '',
        label.pdfData,
        label.trackingNumber.toString(),
        '',
        '',
      ];
    }

    if (label instanceof YamatoCompactLabel) {
      return [
        label.labelId.toString(),
        label.orderId.toString(),
        label.type,
        label.status,
        label.issuedAt.toISOString(),
        // expiresAt はコンストラクタで issuedAt + EXPIRY_DAYS として再計算されるため、
        // スプレッドシート値は運用上の参照情報として保存する（現状 deserialize では未使用）。
        label.expiresAt?.toISOString() ?? '',
        '',
        '',
        label.qrCode,
        label.waybillNumber,
      ];
    }

    throw new Error(`未対応のラベル種別です: ${(label as ShippingLabel).type}`);
  }

  private deserialize(row: string[]): ShippingLabel {
    const labelId = new LabelId(row[COL.labelId] ?? '');
    const orderId = new OrderId(row[COL.orderId] ?? '');
    const type = row[COL.type] ?? '';
    // 現在 status は 'issued' のみのため deserialize では未使用。
    // 将来的にステータス追加時は row[COL.status] を読み取り、エンティティ生成へ反映する。

    const issuedAtRaw = row[COL.issuedAt];
    if (!issuedAtRaw || issuedAtRaw.trim().length === 0) {
      throw new Error(`issuedAt が空です: labelId=${labelId.toString()}`);
    }
    const issuedAt = new Date(issuedAtRaw);
    if (Number.isNaN(issuedAt.getTime())) {
      throw new Error(`issuedAt の日付フォーマットが不正です: ${issuedAtRaw}`);
    }

    if (type === 'click_post') {
      return new ClickPostLabel({
        labelId,
        orderId,
        pdfData: row[COL.clickPostPdfData] ?? '',
        trackingNumber: new TrackingNumber(row[COL.clickPostTrackingNumber] ?? ''),
        issuedAt,
      });
    }

    if (type === 'yamato_compact') {
      return new YamatoCompactLabel({
        labelId,
        orderId,
        qrCode: row[COL.yamatoQrCode] ?? '',
        waybillNumber: row[COL.yamatoWaybillNumber] ?? '',
        issuedAt,
      });
    }

    throw new Error(`不正なラベル種別です: ${type}`);
  }
}
