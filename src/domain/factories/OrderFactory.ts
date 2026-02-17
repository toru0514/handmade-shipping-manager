import { Order } from '../entities/Order';
import { PlatformOrderData } from '../ports/OrderFetcher';
import { Address } from '../valueObjects/Address';
import { Buyer } from '../valueObjects/Buyer';
import { BuyerName } from '../valueObjects/BuyerName';
import { OrderId } from '../valueObjects/OrderId';
import { PhoneNumber } from '../valueObjects/PhoneNumber';
import { PostalCode } from '../valueObjects/PostalCode';
import { Prefecture } from '../valueObjects/Prefecture';
import { Product } from '../valueObjects/Product';

export class OrderFactory {
  createFromPlatformData(data: PlatformOrderData): Order {
    const buyer = new Buyer({
      name: new BuyerName(data.buyerName),
      address: new Address({
        postalCode: new PostalCode(data.buyerPostalCode),
        prefecture: new Prefecture(data.buyerPrefecture),
        city: data.buyerCity,
        street: data.buyerAddress1,
        building: data.buyerAddress2,
      }),
      phoneNumber: data.buyerPhone ? new PhoneNumber(data.buyerPhone) : undefined,
    });

    const product = new Product({
      name: data.productName,
      price: data.price ?? 0,
    });

    return Order.create({
      orderId: new OrderId(data.orderId),
      platform: data.platform,
      buyer,
      product,
      orderedAt: data.orderedAt,
    });
  }
}
