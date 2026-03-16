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
import { SheetsClient } from '../../external/google/SheetsClient';

const DEFAULT_RANGE = 'Orders!A2';

const COL = {
  orderId: 0,
  platform: 1,
  buyerName: 2,
  buyerPostalCode: 3,
  buyerPrefecture: 4,
  buyerCity: 5,
  buyerStreet: 6,
  buyerBuilding: 7,
  buyerPhone: 8,
  productName: 9,
  productPrice: 10,
  status: 11,
  orderedAt: 12,
  shippedAt: 13,
  shippingMethod: 14,
  trackingNumber: 15,
  clickPostItemName: 16,
  productQuantity: 17,
} as const;

export class SpreadsheetOrderRepository implements OrderRepository<Order> {
  private cachedRows: string[][] | null = null;

  constructor(private readonly sheetsClient: SheetsClient) {}

  async findById(orderId: OrderId): Promise<Order | null> {
    const orders = await this.findAll();
    return orders.find((order) => order.orderId.equals(orderId)) ?? null;
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const orders = await this.findAll();
    return orders.filter((order) => order.status.equals(status));
  }

  async findByBuyerName(name: string): Promise<Order[]> {
    const orders = await this.findAll();
    const normalized = name.trim();
    return orders.filter((order) => order.buyer.name.toString().includes(normalized));
  }

  async save(order: Order): Promise<void> {
    const rows = await this.getRows();
    const serializedRows = this.serializeRows(order);
    // 既存の同一orderId行を全て除去してから新しい行群を追加
    const filtered = rows.filter((row) => row[COL.orderId] !== order.orderId.toString());
    filtered.push(...serializedRows);

    // NOTE: 現状は全行置換で整合性を保つ実装。高頻度/同時書き込みには非対応。
    await this.sheetsClient.clearRows();
    await this.sheetsClient.writeRows(filtered, DEFAULT_RANGE);
    this.invalidateCache();
  }

  async exists(orderId: OrderId): Promise<boolean> {
    const order = await this.findById(orderId);
    return order !== null;
  }

  async findAll(): Promise<Order[]> {
    const rows = await this.getRows();

    // orderIdでグループ化（出現順を維持）
    const grouped = new Map<string, { rows: string[][]; firstIndex: number }>();
    rows.forEach((row, index) => {
      const id = (row[COL.orderId] ?? '').trim();
      if (id.length === 0) return;

      const existing = grouped.get(id);
      if (existing) {
        existing.rows.push(row);
      } else {
        grouped.set(id, { rows: [row], firstIndex: index });
      }
    });

    const orders: Order[] = [];
    for (const [, group] of grouped) {
      try {
        orders.push(this.deserializeGroup(group.rows));
      } catch (error) {
        this.warnDeserializeError(group.firstIndex, group.rows[0]!, error);
      }
    }

    return orders;
  }

  private async getRows(): Promise<string[][]> {
    if (this.cachedRows !== null) {
      return this.cloneRows(this.cachedRows);
    }

    const rows = await this.sheetsClient.readRows();
    this.cachedRows = this.cloneRows(rows);
    return this.cloneRows(this.cachedRows);
  }

  private invalidateCache(): void {
    this.cachedRows = null;
  }

  private cloneRows(rows: string[][]): string[][] {
    return rows.map((row) => [...row]);
  }

  private warnDeserializeError(index: number, row: string[], error: unknown): void {
    const rowNumber = index + 2;
    const orderId = row[COL.orderId] ?? '(empty)';
    const message = error instanceof Error ? error.message : String(error);

    console.warn(
      `[SpreadsheetOrderRepository] 壊れた行をスキップしました (row=${rowNumber}, orderId=${orderId}): ${message}`,
    );
  }

  private serializeRows(order: Order): string[][] {
    return order.products.map((product) => [
      order.orderId.toString(),
      order.platform.toString(),
      order.buyer.name.toString(),
      order.buyer.address.postalCode.toString(),
      order.buyer.address.prefecture.toString(),
      order.buyer.address.city,
      order.buyer.address.street,
      order.buyer.address.building ?? '',
      order.buyer.phoneNumber?.toString() ?? '',
      product.name,
      String(product.price),
      order.status.toString(),
      order.orderedAt.toISOString(),
      order.shippedAt?.toISOString() ?? '',
      order.shippingMethod?.toString() ?? '',
      order.trackingNumber?.toString() ?? '',
      order.clickPostItemName,
      String(product.quantity),
    ]);
  }

  private deserializeGroup(rows: string[][]): Order {
    const firstRow = rows[0]!;

    // 後方互換: 旧形式（productsJson列にJSON）の場合はJSONから復元
    const products = this.deserializeProductsFromGroup(rows);

    return Order.reconstitute({
      orderId: new OrderId(firstRow[COL.orderId] ?? ''),
      platform: new Platform(firstRow[COL.platform] ?? ''),
      buyer: new Buyer({
        name: new BuyerName(firstRow[COL.buyerName] ?? ''),
        address: new Address({
          postalCode: new PostalCode(firstRow[COL.buyerPostalCode] ?? ''),
          prefecture: new Prefecture(firstRow[COL.buyerPrefecture] ?? ''),
          city: firstRow[COL.buyerCity] ?? '',
          street: firstRow[COL.buyerStreet] ?? '',
          building: firstRow[COL.buyerBuilding] || undefined,
        }),
        phoneNumber: firstRow[COL.buyerPhone]
          ? new PhoneNumber(firstRow[COL.buyerPhone])
          : undefined,
      }),
      products,
      status: new OrderStatus(firstRow[COL.status] ?? 'pending'),
      orderedAt: new Date(firstRow[COL.orderedAt] ?? ''),
      clickPostItemName: firstRow[COL.clickPostItemName] ?? DEFAULT_CLICK_POST_ITEM_NAME,
      shippedAt: firstRow[COL.shippedAt] ? new Date(firstRow[COL.shippedAt]) : undefined,
      shippingMethod: firstRow[COL.shippingMethod]
        ? new ShippingMethod(firstRow[COL.shippingMethod])
        : undefined,
      trackingNumber: firstRow[COL.trackingNumber]
        ? new TrackingNumber(firstRow[COL.trackingNumber])
        : undefined,
    });
  }

  private deserializeProductsFromGroup(rows: string[][]): Product[] {
    const firstRow = rows[0]!;

    // 後方互換: 旧形式のproductsJson列（JSON文字列）が残っている場合
    const maybeJson = firstRow[COL.productQuantity];
    if (rows.length === 1 && maybeJson && maybeJson.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(maybeJson) as Array<{
          name: string;
          price: number;
          quantity?: number;
        }>;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(
            (p) => new Product({ name: p.name, price: p.price, quantity: p.quantity }),
          );
        }
      } catch {
        // JSON パース失敗時は通常フローへ
      }
    }

    // 新形式: 各行から商品を復元
    return rows.map(
      (row) =>
        new Product({
          name: row[COL.productName] ?? '',
          price: Number(row[COL.productPrice] ?? 0),
          quantity: row[COL.productQuantity] ? Number(row[COL.productQuantity]) : 1,
        }),
    );
  }
}
