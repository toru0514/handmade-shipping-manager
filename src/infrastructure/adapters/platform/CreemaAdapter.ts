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

    const debug = isCreemaDebugEnabled();
    if (debug) console.log(`[CreemaAdapter] fetch start orderId=${orderId.toString()}`);

    const browser = await this.dependencies.browserFactory.launch();
    if (debug) console.log('[CreemaAdapter] browser launched');
    try {
      const page = await browser.newPage();
      if (debug) console.log('[CreemaAdapter] newPage created');
      const creemaPage = new CreemaPage(page);
      const scraped = await creemaPage.fetchOrder(orderId, this.dependencies.credentials);
      if (debug) console.log('[CreemaAdapter] fetchOrder completed');
      return this.toPlatformOrderData(orderId, scraped);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`creema 注文取得に失敗しました: ${message}`, { cause: error });
    } finally {
      if (debug) console.log('[CreemaAdapter] closing browser');
      await browser.close().catch((closeError) => {
        console.warn('[CreemaAdapter] browser.close に失敗しました', closeError);
      });
      if (debug) console.log('[CreemaAdapter] browser closed');
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

function isCreemaDebugEnabled(): boolean {
  const raw = process.env['CREEMA_DEBUG']?.trim().toLowerCase();
  return raw === 'true' || raw === '1';
}
