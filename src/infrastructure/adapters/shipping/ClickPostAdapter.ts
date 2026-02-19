import { randomUUID } from 'node:crypto';
import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { Order } from '@/domain/entities/Order';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';
import {
  ClickPostCredentials,
  ClickPostPage,
  PlaywrightPageLike,
} from '@/infrastructure/external/playwright/ClickPostPage';
import { ClickPostGateway } from './ClickPostGateway';

export interface PlaywrightBrowserLike {
  newPage(): Promise<PlaywrightPageLike>;
  close(): Promise<void>;
}

export interface PlaywrightBrowserFactory {
  launch(): Promise<PlaywrightBrowserLike>;
}

interface ClickPostAdapterDependencies {
  readonly browserFactory: PlaywrightBrowserFactory;
  readonly credentials: ClickPostCredentials;
  readonly now?: () => Date;
  readonly createLabelId?: () => string;
}

export class ClickPostAdapter implements ClickPostGateway {
  private readonly now: () => Date;
  private readonly createLabelId: () => string;

  constructor(private readonly dependencies: ClickPostAdapterDependencies) {
    this.now = dependencies.now ?? (() => new Date());
    this.createLabelId = dependencies.createLabelId ?? (() => `LBL-CP-${randomUUID()}`);
  }

  async issue(order: Order): Promise<ClickPostLabel> {
    const browser = await this.dependencies.browserFactory.launch();
    try {
      const page = await browser.newPage();
      const clickPostPage = new ClickPostPage(page);
      const result = await clickPostPage.issueLabel(order, this.dependencies.credentials);

      return new ClickPostLabel({
        labelId: new LabelId(this.createLabelId()),
        orderId: order.orderId,
        pdfData: result.pdfData,
        trackingNumber: new TrackingNumber(result.trackingNumber),
        issuedAt: this.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`クリックポスト伝票の発行に失敗しました: ${message}`, { cause: error });
    } finally {
      await browser.close().catch((closeError) => {
        console.warn('[ClickPostAdapter] browser.close に失敗しました', closeError);
      });
    }
  }
}
