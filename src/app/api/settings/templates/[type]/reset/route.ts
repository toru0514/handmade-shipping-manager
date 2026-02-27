import { NextResponse } from 'next/server';
import { MessageTemplateTypeValue } from '@/domain/valueObjects/MessageTemplateType';
import { createContainer } from '@/infrastructure/di/container';
import {
  ValidationError,
  normalizeHttpError,
  toApiErrorResponse,
} from '@/infrastructure/errors/HttpErrors';

const VALID_TYPES: MessageTemplateTypeValue[] = ['purchase_thanks', 'shipping_notice'];

function isValidType(value: string): value is MessageTemplateTypeValue {
  return VALID_TYPES.includes(value as MessageTemplateTypeValue);
}

export async function POST(_request: Request, context: { params: Promise<{ type: string }> }) {
  const { type } = await context.params;

  if (!isValidType(type)) {
    const error = new ValidationError(`不明なテンプレートタイプです: ${type}`);
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  try {
    const container = createContainer();
    const useCase = container.getUpdateMessageTemplateUseCase();
    const result = await useCase.resetToDefault(type);
    return NextResponse.json(result);
  } catch (err) {
    const error = normalizeHttpError(err, 'テンプレートのリセットに失敗しました');
    console.error('テンプレートリセットエラー:', err);
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }
}
