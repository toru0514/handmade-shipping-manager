import { Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { ProductNameResolver } from '@/domain/ports/ProductNameResolver';
import { PlatformValue, PlatformValues } from '@/domain/valueObjects/Platform';

// 入力フィルタ
export interface SalesFilterInput {
  startDate?: string; // YYYY-MM-DD（デフォルト: 今年1月1日）
  endDate?: string; // YYYY-MM-DD（デフォルト: 今日）
  platform?: PlatformValue | 'all';
}

// プラットフォーム別集計DTO
export interface PlatformSalesDto {
  readonly platform: PlatformValue;
  readonly totalSales: number;
  readonly orderCount: number;
}

// 月別集計DTO
export interface MonthlySalesDto {
  readonly yearMonth: string; // YYYY-MM
  readonly totalSales: number;
  readonly orderCount: number;
}

// 商品別集計DTO
export interface ProductSalesDto {
  readonly productName: string;
  readonly totalSales: number; // 売上合計（subtotal の合計）
  readonly totalQuantity: number; // 販売数合計
  readonly orderCount: number; // この商品を含む注文数
  readonly priceMissing: boolean; // 売上0円（価格未入力の可能性）
}

// 注文一覧DTO
export interface SalesOrderDto {
  readonly orderId: string;
  readonly platform: string;
  readonly buyerName: string;
  readonly productName: string;
  readonly totalPrice: number;
  readonly shippedAt: string;
  readonly priceMissing: boolean; // totalPrice === 0 のとき true
}

// 出力DTO
export interface SalesSummaryDto {
  readonly totalSales: number; // 総売上金額（発送済みのみ）
  readonly totalOrders: number; // 発送済み件数
  readonly averageOrderValue: number; // 平均注文単価
  readonly ordersWithMissingPrice: number; // 価格未入力の注文数
  readonly platformBreakdown: PlatformSalesDto[]; // PF別集計
  readonly monthlyBreakdown: MonthlySalesDto[]; // 月別集計（グラフ用）
  readonly productBreakdown: ProductSalesDto[]; // 商品別集計
  readonly orders: SalesOrderDto[]; // 注文一覧
}

class IdentityProductNameResolver implements ProductNameResolver {
  async resolve(name: string): Promise<string> {
    return name;
  }
}

export class GetSalesSummaryUseCase {
  private readonly productNameResolver: ProductNameResolver;

  constructor(
    private readonly orderRepository: OrderRepository<Order>,
    productNameResolver?: ProductNameResolver,
  ) {
    this.productNameResolver = productNameResolver ?? new IdentityProductNameResolver();
  }

  async execute(input: SalesFilterInput = {}): Promise<SalesSummaryDto> {
    const { startDate, endDate, platform } = this.normalizeInput(input);

    // TODO: 注文数が増えた場合、findAll() + メモリフィルタリングはスケールしない。
    // OrderRepository に findShippedByDateRange(startDate, endDate, platform?) を追加し、
    // DB/スプレッドシート側でフィルタリングすることを検討する。
    const allOrders = await this.orderRepository.findAll();

    // 発送済み注文のみフィルタリング
    const shippedOrders = allOrders.filter((order) => order.status.isShipped());

    // 期間・プラットフォームでフィルタリング
    const filteredOrders = shippedOrders.filter((order) => {
      // 発送日が期間内
      if (!order.shippedAt) return false;
      const shippedDate = this.toDateString(order.shippedAt);
      if (shippedDate < startDate || shippedDate > endDate) return false;

      // プラットフォームフィルタ
      if (platform !== 'all' && order.platform.value !== platform) {
        return false;
      }

      return true;
    });

    // 集計
    const totalSales = filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalOrders = filteredOrders.length;
    const pricedOrders = filteredOrders.filter((order) => order.totalPrice > 0);
    const averageOrderValue =
      pricedOrders.length > 0 ? Math.round(totalSales / pricedOrders.length) : 0;

    // プラットフォーム別集計
    const platformBreakdown = this.calculatePlatformBreakdown(filteredOrders);

    // 月別集計
    const monthlyBreakdown = this.calculateMonthlyBreakdown(filteredOrders, startDate, endDate);

    // 商品名を一括解決（API呼び出し回数を最小化）
    const nameCache = await this.resolveAllProductNames(filteredOrders);

    // 商品別集計
    const productBreakdown = this.calculateProductBreakdown(filteredOrders, nameCache);

    // 注文一覧
    const orders = this.toOrderDtos(filteredOrders, nameCache);

    // 価格未入力（totalPrice === 0）の注文数
    const ordersWithMissingPrice = orders.filter((o) => o.priceMissing).length;

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      ordersWithMissingPrice,
      platformBreakdown,
      monthlyBreakdown,
      productBreakdown,
      orders,
    };
  }

  private normalizeInput(input: SalesFilterInput): {
    startDate: string;
    endDate: string;
    platform: PlatformValue | 'all';
  } {
    const now = new Date();
    const thisYearStart = `${now.getFullYear()}-01-01`;
    const today = this.toDateString(now);

    return {
      startDate: input.startDate ?? thisYearStart,
      endDate: input.endDate ?? today,
      platform: input.platform ?? 'all',
    };
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private calculatePlatformBreakdown(orders: Order[]): PlatformSalesDto[] {
    const breakdown: Record<PlatformValue, { totalSales: number; orderCount: number }> = {
      minne: { totalSales: 0, orderCount: 0 },
      creema: { totalSales: 0, orderCount: 0 },
    };

    for (const order of orders) {
      const platform = order.platform.value;
      breakdown[platform].totalSales += order.totalPrice;
      breakdown[platform].orderCount += 1;
    }

    return PlatformValues.map((platform) => ({
      platform,
      totalSales: breakdown[platform].totalSales,
      orderCount: breakdown[platform].orderCount,
    }));
  }

  private calculateMonthlyBreakdown(
    orders: Order[],
    startDate: string,
    endDate: string,
  ): MonthlySalesDto[] {
    // 期間内の全月を生成
    const months = this.generateMonthRange(startDate, endDate);

    // 月別に集計
    const monthlyMap: Record<string, { totalSales: number; orderCount: number }> = {};
    for (const month of months) {
      monthlyMap[month] = { totalSales: 0, orderCount: 0 };
    }

    for (const order of orders) {
      if (!order.shippedAt) continue;
      const yearMonth = this.toYearMonth(order.shippedAt);
      if (monthlyMap[yearMonth]) {
        monthlyMap[yearMonth].totalSales += order.totalPrice;
        monthlyMap[yearMonth].orderCount += 1;
      }
    }

    return months.map((yearMonth) => ({
      yearMonth,
      totalSales: monthlyMap[yearMonth].totalSales,
      orderCount: monthlyMap[yearMonth].orderCount,
    }));
  }

  private generateMonthRange(startDate: string, endDate: string): string[] {
    const months: string[] = [];
    const [startYear, startMonth] = startDate.split('-').map(Number);
    const [endYear, endMonth] = endDate.split('-').map(Number);

    let year = startYear;
    let month = startMonth;

    while (year < endYear || (year === endYear && month <= endMonth)) {
      months.push(`${year}-${String(month).padStart(2, '0')}`);
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    return months;
  }

  private async resolveAllProductNames(orders: Order[]): Promise<Map<string, string>> {
    const uniqueNames = new Set<string>();
    for (const order of orders) {
      for (const product of order.products) {
        uniqueNames.add(product.name);
      }
    }

    const cache = new Map<string, string>();
    await Promise.all(
      Array.from(uniqueNames).map(async (name) => {
        const resolved = await this.productNameResolver.resolve(name);
        cache.set(name, resolved);
      }),
    );
    return cache;
  }

  private calculateProductBreakdown(
    orders: Order[],
    nameCache: Map<string, string>,
  ): ProductSalesDto[] {
    const productMap = new Map<
      string,
      { totalSales: number; totalQuantity: number; orderCount: number }
    >();

    for (const order of orders) {
      const countedProducts = new Set<string>();
      for (const product of order.products) {
        // オプション部分（末尾の括弧、複数対応）を除去してベース商品名でグルーピング
        const resolved = nameCache.get(product.name) ?? product.name;
        const name = resolved.replace(/(\s*[（(][^)）]*[)）])+\s*$/, '').trim();
        const existing = productMap.get(name) ?? { totalSales: 0, totalQuantity: 0, orderCount: 0 };
        existing.totalSales += product.subtotal;
        existing.totalQuantity += product.quantity;
        if (!countedProducts.has(name)) {
          existing.orderCount += 1;
          countedProducts.add(name);
        }
        productMap.set(name, existing);
      }
    }

    return Array.from(productMap.entries())
      .map(([productName, data]) => ({
        productName,
        totalSales: data.totalSales,
        totalQuantity: data.totalQuantity,
        orderCount: data.orderCount,
        priceMissing: data.totalSales === 0 && data.totalQuantity > 0,
      }))
      .sort((a, b) => b.totalSales - a.totalSales);
  }

  private toOrderDtos(orders: Order[], nameCache: Map<string, string>): SalesOrderDto[] {
    return orders
      .map((order) => ({
        orderId: order.orderId.toString(),
        platform: order.platform.toString(),
        buyerName: order.buyer.name.toString(),
        productName: order.products.map((p) => nameCache.get(p.name) ?? p.name).join('、'),
        totalPrice: order.totalPrice,
        shippedAt: order.shippedAt!.toISOString(),
        priceMissing: order.totalPrice === 0,
      }))
      .sort((a, b) => b.shippedAt.localeCompare(a.shippedAt));
  }
}
