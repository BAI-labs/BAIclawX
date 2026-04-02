import type { MouseEvent } from 'react';
import { invokeIpc } from './api-client';

export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;

  try {
    await invokeIpc('shell:openExternal', url);
    return;
  } catch (error) {
    console.error('[external-links] Failed to open external URL via IPC:', error);
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function onExternalLinkClick(url: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    void openExternalUrl(url);
  };
}
