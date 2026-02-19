import { Order } from '@/domain/entities/Order';

const YAMATO_PUDO_URL = 'https://pudo.kuronekoyamato.co.jp/';

export interface YamatoCredentials {
  readonly memberId: string;
  readonly password: string;
}

export interface YamatoPlaywrightPageLike {
  goto(url: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string): Promise<void>;
  textContent(selector: string): Promise<string | null>;
}

export interface YamatoIssueResult {
  readonly qrCode: string;
  readonly waybillNumber: string;
}

export class YamatoPudoPage {
  constructor(private readonly page: YamatoPlaywrightPageLike) {}

  async issueLabel(order: Order, credentials: YamatoCredentials): Promise<YamatoIssueResult> {
    await this.page.goto(YAMATO_PUDO_URL);
    await this.login(credentials);
    await this.openIssueForm();
    await this.fillOrder(order);
    await this.page.click('text=送り状を発行');

    const qrCode = (await this.page.textContent('#qr-code-data'))?.trim();
    if (!qrCode) {
      throw new Error('QRコードを取得できませんでした');
    }

    const waybillNumber = (await this.page.textContent('#waybill-number'))?.trim();
    if (!waybillNumber) {
      throw new Error('送り状番号を取得できませんでした');
    }

    return {
      qrCode,
      waybillNumber,
    };
  }

  private async login(credentials: YamatoCredentials): Promise<void> {
    await this.page.fill('#member-id', credentials.memberId);
    await this.page.fill('#password', credentials.password);
    await this.page.click('text=ログイン');
  }

  private async openIssueForm(): Promise<void> {
    await this.page.click('text=宅急便コンパクト');
    await this.page.click('text=PUDO');
  }

  private async fillOrder(order: Order): Promise<void> {
    await this.page.fill('#postal-code', order.buyer.address.postalCode.toString());
    await this.page.fill('#address', this.buildAddress(order));
    await this.page.fill('#name', order.buyer.name.toString());
    await this.page.fill('#phone', order.buyer.phoneNumber?.toString() ?? '');
    await this.page.fill('#product-name', order.product.name);
  }

  private buildAddress(order: Order): string {
    const address = order.buyer.address;
    return [address.prefecture.toString(), address.city, address.street, address.building ?? '']
      .join('')
      .trim();
  }
}
