import { execFile } from 'child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const runtimePath = '/Users/jasonz/Documents/tron/ainft-baiclaw/resources/skills/local/recharge-skill/scripts/lib/recharge_runtime.js';

let tempHome: string | null = null;

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function evaluateExpression(expression: string): Promise<unknown> {
  const { stdout } = await execFileAsync(
    'node',
    [
      '-e',
      `const runtime = require(${JSON.stringify(runtimePath)}); process.stdout.write(JSON.stringify(${expression}));`,
    ],
    {
      env: {
        ...process.env,
        HOME: tempHome ?? '',
      },
    },
  );

  return JSON.parse(stdout);
}

describe('recharge runtime compatibility', () => {
  afterEach(async () => {
    if (tempHome) {
      await rm(tempHome, { recursive: true, force: true });
      tempHome = null;
    }
  });

  it('reads wallet password from baiclaw appSecrets and BANK OF AI key from openclaw skill env', async () => {
    tempHome = await mkdtemp(join(tmpdir(), 'recharge-runtime-'));

    await writeJson(join(tempHome, '.openclaw', 'openclaw.json'), {
      skills: {
        entries: {
          'recharge-skill': {
            env: {
              BANKOFAI_API_KEY: 'sk-from-openclaw',
              BANKOFAI_BASE_URL: 'https://chat.ainft.com',
            },
          },
        },
      },
    });

    await writeJson(join(tempHome, 'Library', 'Application Support', 'baiclaw', 'clawx-providers.json'), {
      appSecrets: {
        agentWalletBaiclawPassword: 'vault-secret-password',
      },
    });

    const walletEnv = await evaluateExpression('runtime.getWalletEnv()') as Record<string, string>;
    expect(walletEnv.AGENT_WALLET_PASSWORD).toBe('vault-secret-password');
    expect(walletEnv.AGENT_WALLET_DIR).toBe(join(tempHome, '.openclaw', 'agent-wallet-baiclaw'));

    const requestEnv = await evaluateExpression('runtime.getRechargeRequestEnv()') as Record<string, string>;
    expect(requestEnv.BANKOFAI_API_KEY).toBe('sk-from-openclaw');
    expect(requestEnv.BANKOFAI_BASE_URL).toBe('https://chat.ainft.com');
    expect(requestEnv.AGENT_WALLET_PASSWORD).toBe('vault-secret-password');
  });

  it('only requests post-recharge balance for settled payments and parses points balance', async () => {
    const shouldFetch = await evaluateExpression(
      'runtime.shouldFetchPostRechargeBalance({ settlement_status: "paid" })',
    );
    expect(shouldFetch).toBe(true);

    const shouldSkip = await evaluateExpression(
      'runtime.shouldFetchPostRechargeBalance({ settlement_status: "pending" })',
    );
    expect(shouldSkip).toBe(false);

    const pointsBalance = await evaluateExpression(
      `runtime.parsePointsBalanceFromTrpcResult({
        ok: true,
        status: 200,
        data: [{ result: { data: { json: { points_balance: 123456 } } } }],
      })`,
    );
    expect(pointsBalance).toBe(123456);
  });
});
