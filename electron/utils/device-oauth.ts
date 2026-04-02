import { EventEmitter } from 'events';
import type { BrowserWindow } from 'electron';
import { logger } from './logger';

export type OAuthProviderType = 'minimax-portal' | 'minimax-portal-cn' | 'qwen-portal';
export type MiniMaxRegion = 'global' | 'cn';

class DeviceOAuthManager extends EventEmitter {
  private mainWindow: BrowserWindow | null = null;

  setWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  async startFlow(
    provider: OAuthProviderType,
    _region: MiniMaxRegion = 'global',
    options?: { accountId?: string; label?: string },
  ): Promise<boolean> {
    const accountId = options?.accountId || provider;
    const message = 'MiniMax and Qwen OAuth is temporarily disabled in this build.';

    logger.warn(`[DeviceOAuth] ${message} provider=${provider} accountId=${accountId}`);
    this.emit('oauth:error', { message, provider, accountId });
    this.mainWindow?.webContents.send('oauth:error', { message, provider, accountId });

    return false;
  }

  async stopFlow(): Promise<void> {
    logger.info('[DeviceOAuth] stopFlow called while device OAuth is disabled');
  }
}

export const deviceOAuthManager = new DeviceOAuthManager();
