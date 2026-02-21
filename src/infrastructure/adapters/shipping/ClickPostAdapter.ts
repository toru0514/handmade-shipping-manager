import { randomUUID } from 'node:crypto';
import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { Order } from '@/domain/entities/Order';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';
import {
  ClickPostCredentials,
  ClickPostDryRunCompletedError,
  ClickPostPage,
  PlaywrightPageLike,
} from '@/infrastructure/external/playwright/ClickPostPage';
import { ClickPostGateway } from './ClickPostGateway';

export { ClickPostDryRunCompletedError };

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
  readonly manualLogin?: boolean;
  readonly manualLoginTimeoutMs?: number;
  readonly keepBrowserOpenOnError?: boolean;
  /** true の場合、確認画面まで進んで停止（支払いは手動） */
  readonly dryRun?: boolean;
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
    let hasError = false;
    let isDryRunCompleted = false;
    try {
      const page = await browser.newPage();
      const clickPostPage = new ClickPostPage(page, {
        manualLogin: this.dependencies.manualLogin,
        manualLoginTimeoutMs: this.dependencies.manualLoginTimeoutMs,
        dryRun: this.dependencies.dryRun,
      });
      const result = await clickPostPage.issueLabel(order, this.dependencies.credentials);

      return new ClickPostLabel({
        labelId: new LabelId(this.createLabelId()),
        orderId: order.orderId,
        pdfData: result.pdfData,
        trackingNumber: new TrackingNumber(result.trackingNumber),
        issuedAt: this.now(),
      });
    } catch (error) {
      // ドライラン完了は正常終了扱い（ブラウザは開いたままにする）
      if (error instanceof ClickPostDryRunCompletedError) {
        isDryRunCompleted = true;
        throw error;
      }
      hasError = true;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`クリックポスト伝票の発行に失敗しました: ${message}`, { cause: error });
    } finally {
      // ドライラン完了時またはエラー時でkeepBrowserOpenOnErrorがtrueの場合はブラウザを維持
      if (isDryRunCompleted) {
        console.log(
          '[ClickPostAdapter] ドライラン完了: ブラウザを開いたままにします。手動で支払いを完了してください。',
        );
      } else if (hasError && this.dependencies.keepBrowserOpenOnError) {
        console.warn(
          '[ClickPostAdapter] keepBrowserOpenOnError=true のため、デバッグ目的でブラウザを維持します',
        );
      } else {
        await browser.close().catch((closeError) => {
          console.warn('[ClickPostAdapter] browser.close に失敗しました', closeError);
        });
      }
    }
  }
}
