import { randomUUID } from 'node:crypto';
import { Order } from '@/domain/entities/Order';
import { YamatoCompactLabel } from '@/domain/entities/YamatoCompactLabel';
import { LabelId } from '@/domain/valueObjects/LabelId';
import {
  YamatoCredentials,
  YamatoPlaywrightPageLike,
  YamatoPudoPage,
} from '@/infrastructure/external/playwright/YamatoPudoPage';
import { YamatoCompactGateway } from './YamatoCompactGateway';

export interface YamatoBrowserLike {
  newPage(): Promise<YamatoPlaywrightPageLike>;
  close(): Promise<void>;
}

export interface YamatoBrowserFactory {
  launch(): Promise<YamatoBrowserLike>;
}

interface YamatoCompactAdapterDependencies {
  readonly browserFactory: YamatoBrowserFactory;
  readonly credentials: YamatoCredentials;
  readonly now?: () => Date;
  readonly createLabelId?: () => string;
}

export class YamatoCompactAdapter implements YamatoCompactGateway {
  private readonly now: () => Date;
  private readonly createLabelId: () => string;

  constructor(private readonly dependencies: YamatoCompactAdapterDependencies) {
    this.now = dependencies.now ?? (() => new Date());
    this.createLabelId = dependencies.createLabelId ?? (() => `LBL-YM-${randomUUID()}`);
  }

  async issue(order: Order): Promise<YamatoCompactLabel> {
    const browser = await this.dependencies.browserFactory.launch();
    try {
      const page = await browser.newPage();
      const yamatoPage = new YamatoPudoPage(page);
      const result = await yamatoPage.issueLabel(order, this.dependencies.credentials);

      return new YamatoCompactLabel({
        labelId: new LabelId(this.createLabelId()),
        orderId: order.orderId,
        qrCode: result.qrCode,
        waybillNumber: result.waybillNumber,
        issuedAt: this.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`宅急便コンパクト伝票の発行に失敗しました: ${message}`, { cause: error });
    } finally {
      await browser.close().catch((closeError) => {
        console.warn('[YamatoCompactAdapter] browser.close に失敗しました', closeError);
      });
    }
  }
}
