import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** 环境变量名：优先级高于本地配置文件，用于 CI/CD 非交互场景 */
export const ENV_API_KEY = 'SIVE_API_KEY';

export interface SiveConfig {
  apiKey: string;
  createdAt: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.sive');
export const configFilePath = path.join(CONFIG_DIR, 'config.json');

/** 保存 API Key 到本地，目录权限 0700、文件权限 0600 */
export function saveApiKey(apiKey: string): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const config: SiveConfig = { apiKey, createdAt: new Date().toISOString() };
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function readConfig(): SiveConfig | null {
  try {
    const raw = fs.readFileSync(configFilePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<SiveConfig>;
    if (typeof parsed.apiKey === 'string' && parsed.apiKey.length > 0) {
      return { apiKey: parsed.apiKey, createdAt: parsed.createdAt ?? '' };
    }
    return null;
  } catch {
    return null;
  }
}

/** 获取 API Key：环境变量 SIVE_API_KEY 优先，其次本地配置文件 */
export function getApiKey(): string | undefined {
  const fromEnv = process.env[ENV_API_KEY];
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  return readConfig()?.apiKey;
}

/** 删除本地配置，返回是否实际删除了文件 */
export function clearConfig(): boolean {
  try {
    fs.unlinkSync(configFilePath);
    return true;
  } catch {
    return false;
  }
}
