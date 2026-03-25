import type { SupabaseClient } from '@supabase/supabase-js';
import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { YamatoCompactLabel } from '@/domain/entities/YamatoCompactLabel';
import type { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';

interface ShippingLabelRow {
  label_id: string;
  order_id: string;
  type: string;
  status: string;
  issued_at: string;
  expires_at: string | null;
  click_post_pdf_data: string | null;
  click_post_tracking_number: string | null;
  yamato_qr_code: string | null;
  yamato_waybill_number: string | null;
  synced_at: string;
}

const TABLE = 'shipping_labels';

export class SupabaseShippingLabelRepository implements ShippingLabelRepository<ShippingLabel> {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(labelId: LabelId): Promise<ShippingLabel | null> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .eq('label_id', labelId.toString())
      .maybeSingle();

    if (error) {
      throw new Error(`shipping_labels findById failed: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.fromRow(data as ShippingLabelRow);
  }

  async findByOrderId(orderId: OrderId): Promise<ShippingLabel[]> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('*')
      .eq('order_id', orderId.toString());

    if (error) {
      throw new Error(`shipping_labels findByOrderId failed: ${error.message}`);
    }

    return (data as ShippingLabelRow[]).map((row) => this.fromRow(row));
  }

  async findAll(): Promise<ShippingLabel[]> {
    const { data, error } = await this.supabase.from(TABLE).select('*');

    if (error) {
      throw new Error(`shipping_labels findAll failed: ${error.message}`);
    }

    return (data as ShippingLabelRow[]).map((row) => this.fromRow(row));
  }

  async save(label: ShippingLabel): Promise<void> {
    const row = this.toRow(label);
    const { error } = await this.supabase.from(TABLE).upsert(row, { onConflict: 'label_id' });

    if (error) {
      throw new Error(`shipping_labels save failed: ${error.message}`);
    }
  }

  async saveAll(labels: ShippingLabel[]): Promise<void> {
    if (labels.length === 0) {
      return;
    }

    const rows = labels.map((label) => this.toRow(label));
    const { error } = await this.supabase.from(TABLE).upsert(rows, { onConflict: 'label_id' });

    if (error) {
      throw new Error(`shipping_labels saveAll failed: ${error.message}`);
    }
  }

  private toRow(label: ShippingLabel): ShippingLabelRow {
    const row: ShippingLabelRow = {
      label_id: label.labelId.toString(),
      order_id: label.orderId.toString(),
      type: label.type,
      status: label.status,
      issued_at: label.issuedAt.toISOString(),
      expires_at: label.expiresAt?.toISOString() ?? null,
      click_post_pdf_data: null,
      click_post_tracking_number: null,
      yamato_qr_code: null,
      yamato_waybill_number: null,
      synced_at: new Date().toISOString(),
    };

    if (label instanceof ClickPostLabel) {
      row.click_post_pdf_data = label.pdfData;
      row.click_post_tracking_number = label.trackingNumber.toString();
    } else if (label instanceof YamatoCompactLabel) {
      row.yamato_qr_code = label.qrCode;
      row.yamato_waybill_number = label.waybillNumber;
    }

    return row;
  }

  private fromRow(row: ShippingLabelRow): ShippingLabel {
    const labelId = new LabelId(row.label_id);
    const orderId = new OrderId(row.order_id);
    const issuedAt = new Date(row.issued_at);

    if (row.type === 'click_post') {
      return new ClickPostLabel({
        labelId,
        orderId,
        pdfData: row.click_post_pdf_data ?? '',
        trackingNumber: new TrackingNumber(row.click_post_tracking_number ?? ''),
        issuedAt,
      });
    }

    if (row.type === 'yamato_compact') {
      return new YamatoCompactLabel({
        labelId,
        orderId,
        qrCode: row.yamato_qr_code ?? '',
        waybillNumber: row.yamato_waybill_number ?? '',
        issuedAt,
      });
    }

    throw new Error(`不正なラベル種別です: ${row.type}`);
  }
}
