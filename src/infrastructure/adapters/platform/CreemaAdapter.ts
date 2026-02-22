import { OrderFetcher, PlatformOrderData } from '@/domain/ports/OrderFetcher';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { Platform } from '@/domain/valueObjects/Platform';
import {
  CreemaCredentials,
  CreemaPage,
  CreemaPageLike,
  CreemaScrapedOrderData,
} from '@/infrastructure/external/playwright/CreemaPage';

export interface CreemaBrowserLike {
  newPage(): Promise<CreemaPageLike>;
  close(): Promise<void>;
}

export interface CreemaBrowserFactory {
  launch(): Promise<CreemaBrowserLike>;
}

interface CreemaAdapterDependencies {
  readonly browserFactory: CreemaBrowserFactory;
  readonly credentials: CreemaCredentials;
}

export class CreemaAdapter implements OrderFetcher {
  constructor(private readonly dependencies: CreemaAdapterDependencies) {}

  async fetch(orderId: OrderId, platform: Platform): Promise<PlatformOrderData> {
    if (!platform.equals(Platform.Creema)) {
      throw new Error(`CreemaAdapter は creema 専用です: ${platform.toString()}`);
    }

    const browser = await this.dependencies.browserFactory.launch();
    try {
      const page = await browser.newPage();
      const creemaPage = new CreemaPage(page);
      const scraped = await creemaPage.fetchOrder(orderId, this.dependencies.credentials);
      return this.toPlatformOrderData(orderId, scraped);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`creema 注文取得に失敗しました: ${message}`, { cause: error });
    } finally {
      await browser.close().catch((closeError) => {
        console.warn('[CreemaAdapter] browser.close に失敗しました', closeError);
      });
    }
  }

  private toPlatformOrderData(
    orderId: OrderId,
    scraped: CreemaScrapedOrderData,
  ): PlatformOrderData {
    return {
      orderId: orderId.toString(),
      platform: Platform.Creema,
      buyerName: scraped.buyerName,
      buyerPostalCode: scraped.buyerPostalCode,
      buyerPrefecture: scraped.buyerPrefecture,
      buyerCity: scraped.buyerCity,
      buyerAddress1: scraped.buyerAddress1,
      buyerAddress2: scraped.buyerAddress2,
      buyerPhone: scraped.buyerPhone,
      productName: scraped.productName,
      orderedAt: scraped.orderedAt,
    };
  }
}
