import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  PostHogMock,
  shutdownMock,
  captureMock,
  getSettingMock,
  setSettingMock,
  loggerDebugMock,
  loggerInfoMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  PostHogMock: vi.fn(function PostHogMock() {
    return {
      capture: captureMock,
      shutdown: shutdownMock,
    };
  }),
  shutdownMock: vi.fn(),
  captureMock: vi.fn(),
  getSettingMock: vi.fn(),
  setSettingMock: vi.fn(),
  loggerDebugMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('posthog-node', () => ({
  PostHog: PostHogMock,
}));

vi.mock('@electron/utils/store', () => ({
  getSetting: getSettingMock,
  setSetting: setSettingMock,
}));

vi.mock('@electron/utils/logger', () => ({
  logger: {
    debug: loggerDebugMock,
    error: loggerErrorMock,
    info: loggerInfoMock,
    warn: vi.fn(),
  },
}));

vi.mock('electron', () => ({
  app: {
    getVersion: () => '0.2.1',
  },
}));

vi.mock('node-machine-id', () => ({
  machineIdSync: () => 'machine-id-1',
}));

describe('main telemetry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getSettingMock.mockImplementation(async (key: string) => {
      switch (key) {
        case 'telemetryEnabled':
          return true;
        case 'machineId':
          return 'existing-machine-id';
        case 'hasReportedInstall':
          return true;
        default:
          return undefined;
      }
    });
    setSettingMock.mockResolvedValue(undefined);
    captureMock.mockReturnValue(undefined);
  });

  it('short-circuits when remote PostHog telemetry is disabled', async () => {
    const { initTelemetry, shutdownTelemetry } = await import('@electron/utils/telemetry');
    await initTelemetry();
    await shutdownTelemetry();

    expect(PostHogMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
    expect(shutdownMock).not.toHaveBeenCalled();
    expect(getSettingMock).not.toHaveBeenCalledWith('machineId');
    expect(setSettingMock).not.toHaveBeenCalled();
    expect(loggerErrorMock).not.toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledWith('Remote telemetry is disabled at build time');
  });
});
