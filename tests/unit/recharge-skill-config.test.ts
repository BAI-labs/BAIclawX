import { execFile } from 'child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const loaderPath = '/Users/jasonz/Documents/tron/ainft-baiclaw/resources/skills/local/recharge-skill/scripts/lib/bankofai_config.js';

let tempHome: string | null = null;

async function writeOpenClawJson(config: unknown): Promise<void> {
  if (!tempHome) {
    throw new Error('tempHome is not initialized');
  }

  const openclawDir = join(tempHome, '.openclaw');
  await mkdir(openclawDir, { recursive: true });
  await writeFile(join(openclawDir, 'openclaw.json'), JSON.stringify(config, null, 2), 'utf8');
}

async function loadConfig(): Promise<{
  configPath: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}> {
  const { stdout } = await execFileAsync(
    'node',
    [
      '-e',
      `const { getConfig } = require(${JSON.stringify(loaderPath)}); process.stdout.write(JSON.stringify(getConfig()));`,
    ],
    {
      env: {
        ...process.env,
        HOME: tempHome ?? '',
      },
    },
  );

  return JSON.parse(stdout) as {
    configPath: string;
    apiKey: string;
    baseUrl: string;
    timeoutMs: number;
  };
}

describe('recharge skill config loader', () => {
  afterEach(async () => {
    if (tempHome) {
      await rm(tempHome, { recursive: true, force: true });
      tempHome = null;
    }
  });

  it('falls back to ~/.openclaw/openclaw.json recharge-skill env', async () => {
    tempHome = await mkdtemp(join(tmpdir(), 'recharge-skill-config-'));
    await writeOpenClawJson({
      skills: {
        entries: {
          'recharge-skill': {
            enabled: true,
            env: {
              BANKOFAI_API_KEY: 'sk-test-openclaw',
              BANKOFAI_BASE_URL: 'https://chat.ainft.com/',
              BANKOFAI_TIMEOUT_MS: '20001',
            },
          },
        },
      },
    });

    const config = await loadConfig();

    expect(config.configPath).toBe(join(tempHome, '.openclaw', 'openclaw.json'));
    expect(config.apiKey).toBe('sk-test-openclaw');
    expect(config.baseUrl).toBe('https://chat.ainft.com');
    expect(config.timeoutMs).toBe(20001);
  });
});
