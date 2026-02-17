import { OrderId } from '@/domain/valueObjects/OrderId';
import { Platform } from '@/domain/valueObjects/Platform';

export interface PlatformOrderData {
  readonly orderId: string;
  readonly platform: Platform;
  readonly buyerName: string;
  readonly buyerPostalCode: string;
  readonly buyerPrefecture: string;
  readonly buyerCity: string;
  readonly buyerAddress1: string;
  readonly buyerAddress2?: string;
  readonly buyerPhone?: string;
  readonly productName: string;
  readonly price?: number;
  readonly orderedAt: Date;
}

export interface OrderFetcher {
  fetch(orderId: OrderId, platform: Platform): Promise<PlatformOrderData>;
}
