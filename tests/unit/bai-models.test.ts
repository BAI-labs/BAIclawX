import { describe, expect, it } from 'vitest';
import { pickPreferredBaiModelId } from '@/lib/bai-models';

describe('BAI model selection', () => {
  it('prefers GPT-5 over lower-priority or hidden-brand models', () => {
    expect(
      pickPreferredBaiModelId([
        { id: 'gpt-5.2', displayName: 'GPT-5.2' },
        { id: 'MiniMax-M2.5', displayName: 'MiniMax M2.5' },
        { id: 'gpt-5', displayName: 'GPT-5' },
      ]),
    ).toBe('gpt-5.2');
  });

  it('falls back to the first model when no prioritized model is available', () => {
    expect(
      pickPreferredBaiModelId([
        { id: 'deepseek-chat', displayName: 'DeepSeek Chat' },
        { id: 'qwen-max', displayName: 'Qwen Max' },
      ]),
    ).toBe('deepseek-chat');
  });
});
