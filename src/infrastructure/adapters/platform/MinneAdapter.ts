import { OrderFetcher, PlatformOrderData } from '@/domain/ports/OrderFetcher';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { Platform } from '@/domain/valueObjects/Platform';
import {
  MinneFetchResult,
  MinnePage,
  MinnePlaywrightPageLike,
} from '@/infrastructure/external/playwright/MinnePage';

export interface MinneBrowserLike {
  newPage(): Promise<MinnePlaywrightPageLike>;
  close(): Promise<void>;
}

export interface MinneBrowserFactory {
  launch(): Promise<MinneBrowserLike>;
}

interface MinneAdapterDependencies {
  readonly browserFactory: MinneBrowserFactory;
  readonly email: string;
  /**
   * ログインリンク URL を提供するコールバック。
   * - テスト時: ターミナルでユーザーが入力
   * - Phase 5: GmailAdapter を使って自動取得予定
   */
  readonly getLoginUrl: (email: string) => Promise<string>;
}

export class MinneAdapter implements OrderFetcher {
  constructor(private readonly dependencies: MinneAdapterDependencies) {}

  async fetch(orderId: OrderId, _platform: Platform): Promise<PlatformOrderData> {
    const browser = await this.dependencies.browserFactory.launch();
    try {
      const page = await browser.newPage();
      const minnePage = new MinnePage(page);

      await minnePage.sendLoginLink(this.dependencies.email);
      const loginUrl = await this.dependencies.getLoginUrl(this.dependencies.email);
      await minnePage.openLoginLink(loginUrl);
      const result = await minnePage.fetchOrderData(orderId.toString());

      return this.toPlatformOrderData(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`minne注文情報の取得に失敗しました: ${message}`, { cause: error });
    } finally {
      await browser.close().catch((closeError) => {
        console.warn('[MinneAdapter] browser.close に失敗しました', closeError);
      });
    }
  }

  private toPlatformOrderData(result: MinneFetchResult): PlatformOrderData {
    return {
      orderId: result.orderId,
      platform: Platform.Minne,
      buyerName: result.buyerName,
      buyerPostalCode: result.buyerPostalCode,
      buyerPrefecture: result.buyerPrefecture,
      buyerCity: result.buyerCity,
      buyerAddress1: result.buyerAddress1,
      buyerAddress2: result.buyerAddress2,
      buyerPhone: result.buyerPhone,
      productName: result.productName,
      price: result.price,
      orderedAt: result.orderedAt,
    };
  }
}
