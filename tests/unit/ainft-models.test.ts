import { describe, expect, it } from 'vitest';
import { pickPreferredAinftModelId } from '@/lib/ainft-models';

describe('AINFT model selection', () => {
  it('prefers a latest ChatGPT model when available', () => {
    expect(
      pickPreferredAinftModelId([
        { id: 'gpt-4.1-mini', displayName: 'GPT-4.1 Mini' },
        { id: 'chatgpt-4o-latest', displayName: 'ChatGPT Latest' },
        { id: 'gpt-5', displayName: 'GPT-5' },
      ]),
    ).toBe('chatgpt-4o-latest');
  });

  it('falls back to the first model when there is no clear ChatGPT match', () => {
    expect(
      pickPreferredAinftModelId([
        { id: 'deepseek-chat', displayName: 'DeepSeek Chat' },
        { id: 'qwen-max', displayName: 'Qwen Max' },
      ]),
    ).toBe('deepseek-chat');
  });
});
