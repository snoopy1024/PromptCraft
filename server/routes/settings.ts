import { Router } from 'express';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '../../.env');

async function readEnvFile(): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(ENV_PATH, 'utf-8');
    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

async function writeEnvFile(vars: Record<string, string>) {
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);
  await fs.writeFile(ENV_PATH, lines.join('\n') + '\n', 'utf-8');
}

const PROVIDER_CONFIG: Record<string, { envKey: string; baseURL: string }> = {
  deepseek: { envKey: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com' },
};

export const settingsRouter = Router();

settingsRouter.get('/api-keys', async (_req, res) => {
  const vars = await readEnvFile();
  const keys: Record<string, string | null> = {
    deepseek: vars.DEEPSEEK_API_KEY || null,
  };
  res.json(keys);
});

settingsRouter.put('/api-keys/:provider', async (req, res) => {
  const { provider } = req.params;
  const { key } = req.body as { key: string };

  const config = PROVIDER_CONFIG[provider];
  if (!config) {
    res.status(400).json({ error: `Unknown provider: ${provider}` });
    return;
  }

  const trimmed = (key ?? '').trim();
  const vars = await readEnvFile();

  if (trimmed) {
    vars[config.envKey] = trimmed;
    process.env[config.envKey] = trimmed;
  } else {
    delete vars[config.envKey];
    delete process.env[config.envKey];
  }

  await writeEnvFile(vars);
  res.json({ ok: true });
});

settingsRouter.post('/api-keys/:provider/verify', async (req, res) => {
  const { provider } = req.params;
  const config = PROVIDER_CONFIG[provider];
  if (!config) {
    res.status(400).json({ status: 'error', error: `Unknown provider: ${provider}` });
    return;
  }

  const apiKey = process.env[config.envKey];
  if (!apiKey) {
    res.json({ status: 'empty' });
    return;
  }

  try {
    const client = new OpenAI({ apiKey, baseURL: config.baseURL });
    await client.models.list();
    res.json({ status: 'ok' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.json({ status: 'error', error: message });
  }
});
