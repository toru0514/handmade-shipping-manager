import { OrderFetcher, PlatformOrderData } from '@/domain/ports/OrderFetcher';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { Platform } from '@/domain/valueObjects/Platform';

interface PlatformOrderFetcherDependencies {
  readonly minneFetcher: OrderFetcher;
  readonly creemaFetcher: OrderFetcher;
}

/**
 * platform 指定に応じて注文取得アダプタを切り替える。
 */
export class PlatformOrderFetcher implements OrderFetcher {
  constructor(private readonly dependencies: PlatformOrderFetcherDependencies) {}

  async fetch(orderId: OrderId, platform: Platform): Promise<PlatformOrderData> {
    if (platform.equals(Platform.Creema)) {
      return this.dependencies.creemaFetcher.fetch(orderId, platform);
    }
    return this.dependencies.minneFetcher.fetch(orderId, platform);
  }
}
