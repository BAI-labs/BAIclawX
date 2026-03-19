import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSettingsState = {
  theme: 'system',
  setTheme: vi.fn(),
  language: 'en',
  setLanguage: vi.fn(),
  launchAtStartup: false,
  setLaunchAtStartup: vi.fn(),
  gatewayAutoStart: false,
  setGatewayAutoStart: vi.fn(),
  proxyEnabled: false,
  proxyServer: '',
  proxyHttpServer: '',
  proxyHttpsServer: '',
  proxyAllServer: '',
  proxyBypassRules: '',
  setProxyEnabled: vi.fn(),
  setProxyServer: vi.fn(),
  setProxyHttpServer: vi.fn(),
  setProxyHttpsServer: vi.fn(),
  setProxyAllServer: vi.fn(),
  setProxyBypassRules: vi.fn(),
  autoCheckUpdate: true,
  setAutoCheckUpdate: vi.fn(),
  autoDownloadUpdate: true,
  setAutoDownloadUpdate: vi.fn(),
  devModeUnlocked: false,
  setDevModeUnlocked: vi.fn(),
  telemetryEnabled: false,
  setTelemetryEnabled: vi.fn(),
};

const mockGatewayState = {
  status: 'connected',
  restart: vi.fn(),
};

const mockUpdateState = {
  currentVersion: '1.2.3',
  setAutoDownload: vi.fn(),
};

vi.mock('@/stores/settings', () => ({
  useSettingsStore: vi.fn(() => mockSettingsState),
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: vi.fn(() => mockGatewayState),
}));

vi.mock('@/stores/update', () => ({
  useUpdateStore: vi.fn((selector?: (state: typeof mockUpdateState) => unknown) =>
    selector ? selector(mockUpdateState) : mockUpdateState
  ),
}));

vi.mock('@/components/settings/UpdateSettings', () => ({
  UpdateSettings: () => <div>mock-update-settings</div>,
}));

vi.mock('@/lib/api-client', () => ({
  getGatewayWsDiagnosticEnabled: vi.fn().mockResolvedValue(false),
  invokeIpc: vi.fn().mockResolvedValue({ success: true }),
  setGatewayWsDiagnosticEnabled: vi.fn().mockResolvedValue(undefined),
  toUserMessage: vi.fn(() => ''),
}));

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/telemetry', () => ({
  clearUiTelemetry: vi.fn(),
  getUiTelemetrySnapshot: vi.fn(() => []),
  subscribeUiTelemetry: vi.fn(() => () => {}),
  trackUiEvent: vi.fn(),
}));

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, params?: Record<string, unknown>) =>
        params?.version ? `${key}:${String(params.version)}` : key,
    }),
  };
});

import { Settings } from '@/pages/Settings';

describe('Settings', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('does not render the updates section', async () => {
    render(<Settings />);

    await waitFor(() => {
      expect(screen.queryByText('updates.title')).not.toBeInTheDocument();
      expect(screen.queryByText('updates.autoCheck')).not.toBeInTheDocument();
      expect(screen.queryByText('updates.autoDownload')).not.toBeInTheDocument();
    });
  });
});
