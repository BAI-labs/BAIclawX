import { hostApiFetch } from './host-api';

export interface BaiModelOption {
  id: string;
  displayName: string;
}

function normalizeModelText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, '');
}

function isTemporarilyHiddenBaiModel(model: BaiModelOption): boolean {
  const id = normalizeModelText(model.id);
  const displayName = normalizeModelText(model.displayName);
  const text = `${id} ${displayName}`;

  return text.includes('kimi') || text.includes('minimax') || text.includes('glm');
}

function isClaudeHaiku45Model(model: BaiModelOption): boolean {
  const id = normalizeModelText(model.id);
  const displayName = normalizeModelText(model.displayName);
  const text = `${id} ${displayName}`;

  if (!text.includes('claude') || !text.includes('haiku')) {
    return false;
  }

  return text.includes('4.5') || text.includes('45');
}

export async function fetchBaiModels(input: {
  apiKey: string;
  baseUrl: string;
}): Promise<BaiModelOption[]> {
  const apiKey = input.apiKey.trim();
  const baseUrl = input.baseUrl.trim();
  if (!apiKey || !baseUrl) {
    return [];
  }

  const response = await hostApiFetch<{ models?: BaiModelOption[] }>('/api/provider-models/discover', {
    method: 'POST',
    body: JSON.stringify({
      providerId: 'bai',
      apiKey,
      baseUrl,
    }),
  });

  if (!Array.isArray(response.models)) {
    return [];
  }

  return response.models.filter((model) => !isTemporarilyHiddenBaiModel(model));
}

function getChatGptPriority(model: BaiModelOption): number {
  if (isClaudeHaiku45Model(model)) return 0;

  const id = model.id.toLowerCase();

  if (id.includes('chatgpt') && id.includes('latest')) return 1;
  if (id.includes('gpt-5')) return 2;
  if (id.includes('chatgpt')) return 3;
  if (id.includes('gpt-4.1')) return 4;
  if (id.includes('gpt-4o')) return 5;
  if (id.includes('gpt-4')) return 6;
  if (id.includes('gpt-3.5')) return 7;
  return Number.MAX_SAFE_INTEGER;
}

export function pickPreferredBaiModelId(models: BaiModelOption[]): string | undefined {
  if (models.length === 0) {
    return undefined;
  }

  const ranked = models
    .map((model, index) => ({
      model,
      index,
      priority: getChatGptPriority(model),
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }
      return left.index - right.index;
    });

  if (ranked[0]?.priority !== Number.MAX_SAFE_INTEGER) {
    return ranked[0].model.id;
  }

  return models[0]?.id;
}

export async function resolvePreferredBaiModelId(input: {
  apiKey: string;
  baseUrl: string;
  fallbackModelId?: string;
}): Promise<string | undefined> {
  try {
    const models = await fetchBaiModels({
      apiKey: input.apiKey,
      baseUrl: input.baseUrl,
    });
    return pickPreferredBaiModelId(models) || input.fallbackModelId;
  } catch {
    return input.fallbackModelId;
  }
}
