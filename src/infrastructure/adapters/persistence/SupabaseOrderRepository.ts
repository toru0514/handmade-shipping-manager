import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_CLICK_POST_ITEM_NAME, Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { Address } from '@/domain/valueObjects/Address';
import { Buyer } from '@/domain/valueObjects/Buyer';
import { BuyerName } from '@/domain/valueObjects/BuyerName';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { PhoneNumber } from '@/domain/valueObjects/PhoneNumber';
import { Platform } from '@/domain/valueObjects/Platform';
import { PostalCode } from '@/domain/valueObjects/PostalCode';
import { Prefecture } from '@/domain/valueObjects/Prefecture';
import { Product } from '@/domain/valueObjects/Product';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';

// OrderRow 型は SupabaseOrderSyncRepository と同じ構造
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
  click_post_item_name: string;
  synced_at: string;
}

export class SupabaseOrderRepository implements OrderRepository<Order> {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(orderId: OrderId): Promise<Order | null> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId.toString())
      .single();
    if (error || !data) return null;
    return this.fromRow(data as OrderRow);
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('status', status.toString());
    if (error || !data) return [];
    return (data as OrderRow[]).map((row) => this.fromRow(row));
  }

  async findByBuyerName(name: string): Promise<Order[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .ilike('buyer_name', `%${name.trim()}%`);
    if (error || !data) return [];
    return (data as OrderRow[]).map((row) => this.fromRow(row));
  }

  async findAll(): Promise<Order[]> {
    const { data, error } = await this.supabase.from('orders').select('*');
    if (error || !data) return [];
    return (data as OrderRow[]).map((row) => this.fromRow(row));
  }

  async save(order: Order): Promise<void> {
    const row = this.toRow(order);
    const { error } = await this.supabase.from('orders').upsert(row, { onConflict: 'order_id' });
    if (error) throw new Error(`Order save failed: ${error.message}`);
  }

  async saveAll(orders: Order[]): Promise<void> {
    if (orders.length === 0) return;
    const rows = orders.map((o) => this.toRow(o));
    const { error } = await this.supabase.from('orders').upsert(rows, { onConflict: 'order_id' });
    if (error) throw new Error(`Order saveAll failed: ${error.message}`);
  }

  async exists(orderId: OrderId): Promise<boolean> {
    const order = await this.findById(orderId);
    return order !== null;
  }

  private toRow(order: Order): OrderRow {
    return {
      order_id: order.orderId.toString(),
      platform: order.platform.toString(),
      buyer_name: order.buyer.name.toString(),
      buyer_postal_code: order.buyer.address.postalCode.toString(),
      buyer_prefecture: order.buyer.address.prefecture.toString(),
      buyer_city: order.buyer.address.city,
      buyer_street: order.buyer.address.street,
      buyer_building: order.buyer.address.building ?? '',
      buyer_phone: order.buyer.phoneNumber?.toString() ?? '',
      product_name: order.products.map((p) => p.name).join('\u3001'),
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
      click_post_item_name: order.clickPostItemName,
      synced_at: new Date().toISOString(),
    };
  }

  private fromRow(row: OrderRow): Order {
    const products = this.restoreProducts(row);

    return Order.reconstitute({
      orderId: new OrderId(row.order_id),
      platform: new Platform(row.platform),
      buyer: new Buyer({
        name: new BuyerName(row.buyer_name),
        address: new Address({
          postalCode: new PostalCode(row.buyer_postal_code),
          prefecture: new Prefecture(row.buyer_prefecture),
          city: row.buyer_city,
          street: row.buyer_street,
          building: row.buyer_building || undefined,
        }),
        phoneNumber: row.buyer_phone ? new PhoneNumber(row.buyer_phone) : undefined,
      }),
      products,
      status: new OrderStatus(row.status),
      orderedAt: new Date(row.ordered_at),
      clickPostItemName: row.click_post_item_name || DEFAULT_CLICK_POST_ITEM_NAME,
      shippedAt: row.shipped_at ? new Date(row.shipped_at) : undefined,
      shippingMethod: row.shipping_method ? new ShippingMethod(row.shipping_method) : undefined,
      trackingNumber: row.tracking_number ? new TrackingNumber(row.tracking_number) : undefined,
    });
  }

  private restoreProducts(row: OrderRow): Product[] {
    if (row.products_json && row.products_json.length > 0) {
      return row.products_json.map(
        (p) => new Product({ name: p.name, price: p.price, quantity: p.quantity }),
      );
    }
    // Fallback: product_name と product_price から単一商品を復元
    return [new Product({ name: row.product_name, price: row.product_price, quantity: 1 })];
  }
}
