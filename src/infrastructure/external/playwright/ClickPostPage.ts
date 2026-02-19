import { Order } from '@/domain/entities/Order';

const CLICK_POST_URL = 'https://clickpost.jp/';

export interface ClickPostCredentials {
  readonly email: string;
  readonly password: string;
}

export interface PlaywrightDownloadLike {
  createReadStream(): Promise<NodeJS.ReadableStream | null>;
}

export interface PlaywrightPageLike {
  goto(url: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string): Promise<void>;
  waitForEvent(event: 'download'): Promise<PlaywrightDownloadLike>;
  textContent(selector: string): Promise<string | null>;
}

export interface ClickPostIssueResult {
  readonly pdfData: string;
  readonly trackingNumber: string;
}

export class ClickPostPage {
  constructor(private readonly page: PlaywrightPageLike) {}

  async issueLabel(order: Order, credentials: ClickPostCredentials): Promise<ClickPostIssueResult> {
    await this.page.goto(CLICK_POST_URL);
    await this.login(credentials);
    await this.openSingleApplyForm();
    await this.fillOrder(order);

    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('text=支払い手続きをする');
    const download = await downloadPromise;
    const pdfData = await this.readDownloadAsBase64(download);

    const trackingNumber = (await this.page.textContent('#tracking-number'))?.trim();
    if (!trackingNumber) {
      throw new Error('追跡番号を取得できませんでした');
    }

    return {
      pdfData,
      trackingNumber,
    };
  }

  private async login(credentials: ClickPostCredentials): Promise<void> {
    await this.page.fill('#email', credentials.email);
    await this.page.fill('#password', credentials.password);
    await this.page.click('text=ログイン');
  }

  private async openSingleApplyForm(): Promise<void> {
    await this.page.click('text=1件申込');
  }

  private async fillOrder(order: Order): Promise<void> {
    await this.page.fill('#postal-code', order.buyer.address.postalCode.toString());
    await this.page.fill('#address', this.buildAddress(order));
    await this.page.fill('#name', order.buyer.name.toString());
    await this.page.fill('#contents', order.product.name);
    await this.page.click('text=次へ');
  }

  private buildAddress(order: Order): string {
    const address = order.buyer.address;
    return [address.prefecture.toString(), address.city, address.street, address.building ?? '']
      .join('')
      .trim();
  }

  private async readDownloadAsBase64(download: PlaywrightDownloadLike): Promise<string> {
    const stream = await download.createReadStream();
    if (!stream) {
      throw new Error('PDFストリームを取得できませんでした');
    }

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.on('end', () => resolve());
      stream.on('error', (error) => reject(error));
    });

    if (chunks.length === 0) {
      throw new Error('PDFデータが空です');
    }

    return Buffer.concat(chunks).toString('base64');
  }
}
