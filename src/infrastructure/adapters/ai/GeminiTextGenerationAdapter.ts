import type {
  TextGenerationPort,
  TextGenerationRequest,
  TextGenerationResult,
} from '@/domain/ports/TextGenerationPort';
import { fetchWithRetry } from '@/infrastructure/lib/fetch-with-retry';
import { getLogger } from '@/infrastructure/lib/logger';

const log = getLogger('gemini-adapter');

const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_MAX_TOKENS = 1024;

export class GeminiTextGenerationAdapter implements TextGenerationPort {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model ?? DEFAULT_MODEL;
  }

  async generate(request: TextGenerationRequest): Promise<TextGenerationResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: request.userPrompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: request.systemPrompt }],
      },
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      },
    };

    log.info('Gemini API リクエスト開始', { model: this.model });

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '(読み取り不可)');
      log.error('Gemini API エラー', { status: response.status, body: errorBody });
      throw new Error(`Gemini API エラー: ${response.status} ${errorBody}`);
    }

    const data = (await response.json()) as GeminiResponse;

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      log.error('Gemini API レスポンスにテキストが含まれていません', { data });
      throw new Error('AIからの応答を取得できませんでした');
    }

    log.info('Gemini API レスポンス取得完了', { length: text.length });

    return { text: text.trim() };
  }
}

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
};
