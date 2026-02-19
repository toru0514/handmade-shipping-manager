export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`対象注文が見つかりません: ${orderId}`);
    this.name = 'OrderNotFoundError';
  }
}

export class InvalidLabelIssueInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLabelIssueInputError';
  }
}

export class InvalidLabelIssueOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLabelIssueOperationError';
  }
}
