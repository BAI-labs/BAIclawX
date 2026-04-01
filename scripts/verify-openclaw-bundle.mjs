#!/usr/bin/env zx

import 'zx/globals';
import { createRequire } from 'module';

const ROOT_DIR = path.resolve(__dirname, '..');
const BUNDLE_ROOT = path.join(ROOT_DIR, 'build', 'openclaw');
const BUNDLE_PKG = path.join(BUNDLE_ROOT, 'package.json');

if (!(await fs.pathExists(BUNDLE_PKG))) {
  echo(chalk.red('❌ OpenClaw bundle not found. Run `zx scripts/bundle-openclaw.mjs` first.'));
  process.exit(1);
}

const bundleRequire = createRequire(BUNDLE_PKG);
const requiredSpecifiers = [
  '@whiskeysockets/baileys/package.json',
  'pino/package.json',
  'protobufjs/package.json',
  'qrcode-terminal/package.json',
];

const missing = [];

for (const specifier of requiredSpecifiers) {
  try {
    bundleRequire.resolve(specifier);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    missing.push({ specifier, reason });
  }
}

if (missing.length > 0) {
  echo(chalk.red('❌ OpenClaw bundle validation failed.'));
  for (const item of missing) {
    echo(`   - ${item.specifier}`);
    echo(`     ${item.reason}`);
  }
  process.exit(1);
}

echo(chalk.green(`✅ Verified OpenClaw bundle runtime modules (${requiredSpecifiers.join(', ')})`));
