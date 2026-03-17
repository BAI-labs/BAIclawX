import { hostApiFetch } from './host-api';

export interface AinftModelOption {
  id: string;
  displayName: string;
}

export async function fetchAinftModels(input: {
  apiKey: string;
  baseUrl: string;
}): Promise<AinftModelOption[]> {
  const apiKey = input.apiKey.trim();
  const baseUrl = input.baseUrl.trim();
  if (!apiKey || !baseUrl) {
    return [];
  }

  const response = await hostApiFetch<{ models?: AinftModelOption[] }>('/api/provider-models/discover', {
    method: 'POST',
    body: JSON.stringify({
      providerId: 'ainft',
      apiKey,
      baseUrl,
    }),
  });

  return Array.isArray(response.models) ? response.models : [];
}

function getChatGptPriority(modelId: string): number {
  const id = modelId.toLowerCase();

  if (id.includes('chatgpt') && id.includes('latest')) return 0;
  if (id.includes('gpt-5')) return 1;
  if (id.includes('chatgpt')) return 2;
  if (id.includes('gpt-4.1')) return 3;
  if (id.includes('gpt-4o')) return 4;
  if (id.includes('gpt-4')) return 5;
  if (id.includes('gpt-3.5')) return 6;
  return Number.MAX_SAFE_INTEGER;
}

export function pickPreferredAinftModelId(models: AinftModelOption[]): string | undefined {
  if (models.length === 0) {
    return undefined;
  }

  const ranked = models
    .map((model, index) => ({
      model,
      index,
      priority: getChatGptPriority(model.id),
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
