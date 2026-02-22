import { OrderFetcher, PlatformOrderData } from '@/domain/ports/OrderFetcher';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { Platform } from '@/domain/valueObjects/Platform';
import {
  MinneCredentials,
  MinnePage,
  MinnePageLike,
  MinneScrapedOrderData,
} from '@/infrastructure/external/playwright/MinnePage';

export interface MinneBrowserLike {
  newPage(): Promise<MinnePageLike>;
  close(): Promise<void>;
}

export interface MinneBrowserFactory {
  launch(): Promise<MinneBrowserLike>;
}

interface MinneAdapterDependencies {
  readonly browserFactory: MinneBrowserFactory;
  readonly credentials: MinneCredentials;
}

export class MinneAdapter implements OrderFetcher {
  constructor(private readonly dependencies: MinneAdapterDependencies) {}

  async fetch(orderId: OrderId, platform: Platform): Promise<PlatformOrderData> {
    if (!platform.equals(Platform.Minne)) {
      throw new Error(`MinneAdapter は minne 専用です: ${platform.toString()}`);
    }

    const browser = await this.dependencies.browserFactory.launch();
    try {
      const page = await browser.newPage();
      const minnePage = new MinnePage(page);
      const scraped = await minnePage.fetchOrder(orderId, this.dependencies.credentials);
      return this.toPlatformOrderData(orderId, scraped);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`minne 注文取得に失敗しました: ${message}`, { cause: error });
    } finally {
      await browser.close().catch((closeError) => {
        console.warn('[MinneAdapter] browser.close に失敗しました', closeError);
      });
    }
  }

  private toPlatformOrderData(orderId: OrderId, scraped: MinneScrapedOrderData): PlatformOrderData {
    return {
      orderId: orderId.toString(),
      platform: Platform.Minne,
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
