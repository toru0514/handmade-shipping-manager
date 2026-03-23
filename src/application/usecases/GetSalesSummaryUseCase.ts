import { Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';
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

// 注文一覧DTO
export interface SalesOrderDto {
  readonly orderId: string;
  readonly platform: string;
  readonly buyerName: string;
  readonly productName: string;
  readonly totalPrice: number;
  readonly shippedAt: string;
}

// 出力DTO
export interface SalesSummaryDto {
  readonly totalSales: number; // 総売上金額（発送済みのみ）
  readonly totalOrders: number; // 発送済み件数
  readonly averageOrderValue: number; // 平均注文単価
  readonly platformBreakdown: PlatformSalesDto[]; // PF別集計
  readonly monthlyBreakdown: MonthlySalesDto[]; // 月別集計（グラフ用）
  readonly orders: SalesOrderDto[]; // 注文一覧
}

export class GetSalesSummaryUseCase {
  constructor(private readonly orderRepository: OrderRepository<Order>) {}

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
    const averageOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

    // プラットフォーム別集計
    const platformBreakdown = this.calculatePlatformBreakdown(filteredOrders);

    // 月別集計
    const monthlyBreakdown = this.calculateMonthlyBreakdown(filteredOrders, startDate, endDate);

    // 注文一覧
    const orders = this.toOrderDtos(filteredOrders);

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      platformBreakdown,
      monthlyBreakdown,
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

  private toOrderDtos(orders: Order[]): SalesOrderDto[] {
    return orders
      .map((order) => ({
        orderId: order.orderId.toString(),
        platform: order.platform.toString(),
        buyerName: order.buyer.name.toString(),
        productName: order.products.map((p) => p.name).join('、'),
        totalPrice: order.totalPrice,
        shippedAt: order.shippedAt!.toISOString(),
      }))
      .sort((a, b) => b.shippedAt.localeCompare(a.shippedAt));
  }
}
