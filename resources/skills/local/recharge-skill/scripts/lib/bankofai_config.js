#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

const RECHARGE_SKILL_KEY = "recharge-skill";

function loadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_) {
    return null;
  }
}

function candidatePaths() {
  return [
    path.resolve(process.cwd(), "bankofai-config.json"),
    path.join(os.homedir(), ".bankofai", "config.json"),
    path.join(os.homedir(), ".mcporter", "bankofai-config.json"),
  ];
}

function readConfig() {
  for (const filePath of candidatePaths()) {
    const data = loadJson(filePath);
    if (data && typeof data === "object") {
      return { path: filePath, data };
    }
  }
  return { path: "", data: {} };
}

function readOpenClawSkillEnv() {
  const filePath = path.join(os.homedir(), ".openclaw", "openclaw.json");
  const data = loadJson(filePath);
  const env = data && data.skills && data.skills.entries
    ? data.skills.entries[RECHARGE_SKILL_KEY] && data.skills.entries[RECHARGE_SKILL_KEY].env
    : null;

  if (env && typeof env === "object") {
    return { path: filePath, data: env };
  }

  return { path: "", data: {} };
}

function getConfig(overrides = {}) {
  const loaded = readConfig();
  const skillEnv = readOpenClawSkillEnv();
  const data = loaded.data || {};
  const skillData = skillEnv.data || {};
  const configPath = loaded.path || skillEnv.path || "";
  return {
    configPath,
    apiKey: overrides.apiKey || process.env.BANKOFAI_API_KEY || data.api_key || skillData.BANKOFAI_API_KEY || "",
    baseUrl: (overrides.baseUrl || process.env.BANKOFAI_BASE_URL || data.base_url || skillData.BANKOFAI_BASE_URL || "https://chat.ainft.com").replace(/\/+$/, ""),
    timeoutMs: Number(overrides.timeoutMs || process.env.BANKOFAI_TIMEOUT_MS || data.timeout_ms || skillData.BANKOFAI_TIMEOUT_MS || 15000),
  };
}

module.exports = {
  getConfig,
};
