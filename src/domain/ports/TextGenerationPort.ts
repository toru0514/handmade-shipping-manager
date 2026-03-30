export type TextGenerationRequest = {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly maxTokens?: number;
};

export type TextGenerationResult = {
  readonly text: string;
};

export interface TextGenerationPort {
  generate(request: TextGenerationRequest): Promise<TextGenerationResult>;
}
