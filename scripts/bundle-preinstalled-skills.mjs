#!/usr/bin/env zx

import 'zx/globals';
import { readFileSync, existsSync, mkdirSync, rmSync, cpSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MANIFEST_PATH = join(ROOT, 'resources', 'skills', 'preinstalled-manifest.json');
const OUTPUT_ROOT = join(ROOT, 'build', 'preinstalled-skills');
const TMP_ROOT = join(ROOT, 'build', '.tmp-preinstalled-skills');
const CACHE_ROOT = join(ROOT, 'build', '.cache-preinstalled-skills');

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Missing manifest: ${MANIFEST_PATH}`);
  }
  const raw = readFileSync(MANIFEST_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.skills)) {
    throw new Error('Invalid preinstalled-skills manifest format');
  }
  for (const item of parsed.skills) {
    if (!item.slug) {
      throw new Error(`Invalid manifest entry: ${JSON.stringify(item)}`);
    }
    if (!item.localPath && (!item.repo || !item.repoPath)) {
      throw new Error(`Manifest entry must provide localPath or repo/repoPath: ${JSON.stringify(item)}`);
    }
  }
  return parsed.skills;
}

function groupByRepoRef(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    if (entry.localPath) continue;
    const ref = entry.ref || 'main';
    const key = `${entry.repo}#${ref}`;
    if (!grouped.has(key)) grouped.set(key, { repo: entry.repo, ref, entries: [] });
    grouped.get(key).entries.push(entry);
  }
  return [...grouped.values()];
}

function bundleSkillFromDirectory(entry, sourceDir, commit) {
  const targetDir = join(OUTPUT_ROOT, entry.slug);

  if (!existsSync(sourceDir)) {
    throw new Error(`Missing skill source directory: ${sourceDir}`);
  }

  rmSync(targetDir, { recursive: true, force: true });
  cpSync(sourceDir, targetDir, { recursive: true, dereference: true });

  const skillManifest = join(targetDir, 'SKILL.md');
  if (!existsSync(skillManifest)) {
    throw new Error(`Skill ${entry.slug} is missing SKILL.md after copy`);
  }

  const requestedVersion = (entry.version || '').trim();
  return {
    slug: entry.slug,
    version: requestedVersion || commit,
    repo: entry.repo,
    repoPath: entry.repoPath,
    ref: entry.ref,
    commit,
  };
}

function createRepoDirName(repo, ref) {
  return `${repo.replace(/[\\/]/g, '__')}__${ref.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

async function fetchSparseRepo(repo, ref, paths, checkoutDir) {
  const remote = `https://github.com/${repo}.git`;
  const repoExists = existsSync(join(checkoutDir, '.git'));

  mkdirSync(checkoutDir, { recursive: true });

  if (!repoExists) {
    await $`git init ${checkoutDir}`;
    await $`git -C ${checkoutDir} remote add origin ${remote}`;
    await $`git -C ${checkoutDir} sparse-checkout init --cone`;
  }

  await $`git -C ${checkoutDir} sparse-checkout set ${paths}`;

  try {
    await $`git -C ${checkoutDir} fetch --depth 1 origin ${ref}`;
    await $`git -C ${checkoutDir} checkout FETCH_HEAD`;
    return {
      commit: (await $`git -C ${checkoutDir} rev-parse HEAD`).stdout.trim(),
      source: 'remote',
    };
  } catch (error) {
    const hasCachedHead = existsSync(join(checkoutDir, '.git', 'HEAD'));
    const hasAllPaths = paths.every((path) => existsSync(join(checkoutDir, path)));
    if (!hasCachedHead || !hasAllPaths) {
      throw error;
    }

    echo`   WARN fetch failed for ${repo} @ ${ref}; reusing cached checkout`;
    return {
      commit: (await $`git -C ${checkoutDir} rev-parse HEAD`).stdout.trim(),
      source: 'cache',
    };
  }
}

echo`Bundling preinstalled skills...`;
const manifestSkills = loadManifest();

rmSync(OUTPUT_ROOT, { recursive: true, force: true });
mkdirSync(OUTPUT_ROOT, { recursive: true });
rmSync(TMP_ROOT, { recursive: true, force: true });
mkdirSync(TMP_ROOT, { recursive: true });
mkdirSync(CACHE_ROOT, { recursive: true });

const lock = {
  generatedAt: new Date().toISOString(),
  skills: [],
};

for (const entry of manifestSkills.filter((item) => item.localPath)) {
  const sourceDir = join(ROOT, entry.localPath);
  const commit = `local:${entry.localPath}`;

  echo`Using local skill source for ${entry.slug}: ${entry.localPath}`;
  lock.skills.push(bundleSkillFromDirectory(entry, sourceDir, commit));
  echo`   OK ${entry.slug}`;
}

const groups = groupByRepoRef(manifestSkills);
for (const group of groups) {
  const cacheRepoDir = join(CACHE_ROOT, createRepoDirName(group.repo, group.ref));
  const repoDir = join(TMP_ROOT, createRepoDirName(group.repo, group.ref));
  const sparsePaths = [...new Set(group.entries.map((entry) => entry.repoPath))];

  echo`Fetching ${group.repo} @ ${group.ref}`;
  const { commit, source } = await fetchSparseRepo(group.repo, group.ref, sparsePaths, cacheRepoDir);
  echo`   commit ${commit} (${source})`;
  cpSync(cacheRepoDir, repoDir, { recursive: true, dereference: false });

  for (const entry of group.entries) {
    const sourceDir = join(repoDir, entry.repoPath);
    const requestedVersion = (entry.version || '').trim();
    const resolvedVersion = !requestedVersion || requestedVersion === 'main' ? commit : requestedVersion;
    lock.skills.push(bundleSkillFromDirectory(entry, sourceDir, resolvedVersion));

    echo`   OK ${entry.slug}`;
  }
}

writeFileSync(join(OUTPUT_ROOT, '.preinstalled-lock.json'), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
rmSync(TMP_ROOT, { recursive: true, force: true });
echo`Preinstalled skills ready: ${OUTPUT_ROOT}`;
