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
    const serialized = this.serialize(order);
    const index = rows.findIndex((row) => row[COL.orderId] === order.orderId.toString());

    if (index >= 0) {
      rows[index] = serialized;
    } else {
      rows.push(serialized);
    }

    // NOTE: 現状は全行置換で整合性を保つ実装。高頻度/同時書き込みには非対応。
    await this.sheetsClient.clearRows();
    await this.sheetsClient.writeRows(rows, DEFAULT_RANGE);
    this.invalidateCache();
  }

  async exists(orderId: OrderId): Promise<boolean> {
    const order = await this.findById(orderId);
    return order !== null;
  }

  async findAll(): Promise<Order[]> {
    const rows = await this.getRows();
    const orders: Order[] = [];

    rows.forEach((row, index) => {
      if ((row[COL.orderId] ?? '').trim().length === 0) {
        return;
      }

      try {
        orders.push(this.deserialize(row));
      } catch (error) {
        this.warnDeserializeError(index, row, error);
      }
    });

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

  private serialize(order: Order): string[] {
    return [
      order.orderId.toString(),
      order.platform.toString(),
      order.buyer.name.toString(),
      order.buyer.address.postalCode.toString(),
      order.buyer.address.prefecture.toString(),
      order.buyer.address.city,
      order.buyer.address.street,
      order.buyer.address.building ?? '',
      order.buyer.phoneNumber?.toString() ?? '',
      order.product.name,
      String(order.product.price),
      order.status.toString(),
      order.orderedAt.toISOString(),
      order.shippedAt?.toISOString() ?? '',
      order.shippingMethod?.toString() ?? '',
      order.trackingNumber?.toString() ?? '',
      order.clickPostItemName,
    ];
  }

  private deserialize(row: string[]): Order {
    const status = new OrderStatus(row[COL.status] ?? 'pending');

    return Order.reconstitute({
      orderId: new OrderId(row[COL.orderId] ?? ''),
      platform: new Platform(row[COL.platform] ?? ''),
      buyer: new Buyer({
        name: new BuyerName(row[COL.buyerName] ?? ''),
        address: new Address({
          postalCode: new PostalCode(row[COL.buyerPostalCode] ?? ''),
          prefecture: new Prefecture(row[COL.buyerPrefecture] ?? ''),
          city: row[COL.buyerCity] ?? '',
          street: row[COL.buyerStreet] ?? '',
          building: row[COL.buyerBuilding] || undefined,
        }),
        phoneNumber: row[COL.buyerPhone] ? new PhoneNumber(row[COL.buyerPhone]) : undefined,
      }),
      product: new Product({
        name: row[COL.productName] ?? '',
        price: Number(row[COL.productPrice] ?? 0),
      }),
      status,
      orderedAt: new Date(row[COL.orderedAt] ?? ''),
      clickPostItemName: row[COL.clickPostItemName] ?? DEFAULT_CLICK_POST_ITEM_NAME,
      shippedAt: row[COL.shippedAt] ? new Date(row[COL.shippedAt]) : undefined,
      shippingMethod: row[COL.shippingMethod]
        ? new ShippingMethod(row[COL.shippingMethod])
        : undefined,
      trackingNumber: row[COL.trackingNumber]
        ? new TrackingNumber(row[COL.trackingNumber])
        : undefined,
    });
  }
}
