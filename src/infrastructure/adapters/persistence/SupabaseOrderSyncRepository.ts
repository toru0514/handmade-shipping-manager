import type { SupabaseClient } from '@supabase/supabase-js';
import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { Order } from '@/domain/entities/Order';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { YamatoCompactLabel } from '@/domain/entities/YamatoCompactLabel';
import type { OrderSyncRepository } from '@/domain/ports/OrderSyncRepository';

interface OrderRow {
  order_id: string;
  platform: string;
  buyer_name: string;
  buyer_postal_code: string;
  buyer_prefecture: string;
  buyer_city: string;
  buyer_street: string;
  buyer_building: string;
  buyer_phone: string;
  product_name: string;
  product_price: number;
  products_json: Array<{ name: string; price: number; quantity: number }> | null;
  status: string;
  ordered_at: string;
  shipped_at: string | null;
  shipping_method: string | null;
  tracking_number: string | null;
  short_product_name: string;
  synced_at: string;
}

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

export class SupabaseOrderSyncRepository implements OrderSyncRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async upsertOrders(orders: Order[]): Promise<{ synced: number; errors: string[] }> {
    if (orders.length === 0) {
      return { synced: 0, errors: [] };
    }

    const rows: OrderRow[] = orders.map((order) => ({
      order_id: order.orderId.toString(),
      platform: order.platform.toString(),
      buyer_name: order.buyer.name.toString(),
      buyer_postal_code: order.buyer.address.postalCode.toString(),
      buyer_prefecture: order.buyer.address.prefecture.toString(),
      buyer_city: order.buyer.address.city,
      buyer_street: order.buyer.address.street,
      buyer_building: order.buyer.address.building ?? '',
      buyer_phone: order.buyer.phoneNumber?.toString() ?? '',
      product_name: order.products.map((p) => p.name).join('、'),
      product_price: order.totalPrice,
      products_json: order.products.map((p) => ({
        name: p.name,
        price: p.price,
        quantity: p.quantity,
      })),
      status: order.status.toString(),
      ordered_at: order.orderedAt.toISOString(),
      shipped_at: order.shippedAt?.toISOString() ?? null,
      shipping_method: order.shippingMethod?.toString() ?? null,
      tracking_number: order.trackingNumber?.toString() ?? null,
      short_product_name: order.shortProductName,
      synced_at: new Date().toISOString(),
    }));

    const { error } = await this.supabase.from('orders').upsert(rows, { onConflict: 'order_id' });

    if (error) {
      return { synced: 0, errors: [`orders upsert failed: ${error.message}`] };
    }

    return { synced: rows.length, errors: [] };
  }

  async upsertShippingLabels(
    labels: ShippingLabel[],
  ): Promise<{ synced: number; errors: string[] }> {
    if (labels.length === 0) {
      return { synced: 0, errors: [] };
    }

    const rows: ShippingLabelRow[] = labels.map((label) => {
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
    });

    const { error } = await this.supabase
      .from('shipping_labels')
      .upsert(rows, { onConflict: 'label_id' });

    if (error) {
      return { synced: 0, errors: [`shipping_labels upsert failed: ${error.message}`] };
    }

    return { synced: rows.length, errors: [] };
  }
}
