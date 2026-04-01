import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';

const { testUserData } = vi.hoisted(() => {
  const suffix = Math.random().toString(36).slice(2);
  return {
    testUserData: `/tmp/bai-logger-${suffix}`,
  };
});

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => testUserData,
    getVersion: () => '0.0.0-test',
  },
}));

describe('logger branding', () => {
  beforeEach(async () => {
    vi.resetModules();
    await rm(testUserData, { recursive: true, force: true });
  });

  it('writes bai-branded log filenames and session headers', async () => {
    const logger = await import('@electron/utils/logger');

    logger.initLogger();
    logger.info('hello world');

    await new Promise((resolve) => setTimeout(resolve, 600));

    const date = new Date().toISOString().split('T')[0];
    const logPath = join(testUserData, 'logs', `bai-${date}.log`);
    const content = await readFile(logPath, 'utf8');

    expect(logger.getLogFilePath()).toBe(logPath);
    expect(content).toContain('=== bai Session Start (v0.0.0-test) ===');
    expect(content).toContain('hello world');
    expect(content).not.toContain('ClawX Session Start');
  });

  it('migrates legacy clawx log files and visible prefixes', async () => {
    const legacyDate = '2026-03-17';
    const legacyDir = join(testUserData, 'logs');
    const legacyPath = join(legacyDir, `clawx-${legacyDate}.log`);
    await mkdir(legacyDir, { recursive: true });
    await writeFile(
      legacyPath,
      [
        '[2026-03-17T00:00:00.000Z] === ClawX Session Start (v0.0.0-test) ===',
        '[clawx-validate] bai HTTP 200',
        '=== ClawX Application Starting ===',
        'Merged ClawX context into bootstrap.md',
      ].join('\n'),
      'utf8',
    );

    const logger = await import('@electron/utils/logger');
    logger.initLogger();

    const migratedPath = join(legacyDir, `bai-${legacyDate}.log`);
    const content = await readFile(migratedPath, 'utf8');

    expect(content).toContain('bai Session Start');
    expect(content).toContain('[bai-validate] bai HTTP 200');
    expect(content).toContain('=== bai Application Starting ===');
    expect(content).toContain('Merged bai context into bootstrap.md');
  });
});
