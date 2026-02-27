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

export async function GET(_request: Request, context: { params: Promise<{ type: string }> }) {
  const { type } = await context.params;

  if (!isValidType(type)) {
    const error = new ValidationError(`不明なテンプレートタイプです: ${type}`);
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  try {
    const container = createContainer();
    const useCase = container.getUpdateMessageTemplateUseCase();
    const result = await useCase.getTemplate(type);
    return NextResponse.json(result);
  } catch (err) {
    const error = normalizeHttpError(err, 'テンプレートの取得に失敗しました');
    console.error('テンプレート取得エラー:', err);
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ type: string }> }) {
  const { type } = await context.params;

  if (!isValidType(type)) {
    const error = new ValidationError(`不明なテンプレートタイプです: ${type}`);
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  const body = (await request.json().catch(() => ({}))) as { content?: string };

  if (typeof body.content !== 'string' || body.content.trim().length === 0) {
    const error = new ValidationError('content は必須です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  try {
    const container = createContainer();
    const useCase = container.getUpdateMessageTemplateUseCase();
    const result = await useCase.updateTemplate({ type, content: body.content });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message.includes('変数')) {
      const error = new ValidationError(err.message);
      return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
    }
    const error = normalizeHttpError(err, 'テンプレートの保存に失敗しました');
    console.error('テンプレート保存エラー:', err);
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }
}
