// Shared helpers for RunPod provisioning scripts.
// Loads secrets from server/.env (no extra deps) and wraps the REST API.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '..', '..', 'server', '.env');

function loadEnv() {
  try {
    for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* fall back to process.env */ }
}
loadEnv();

export const ENV_FILE = ENV_PATH;
const REST = 'https://rest.runpod.io/v1';

function key() {
  const k = process.env.RUNPOD_API_KEY;
  if (!k) throw new Error('RUNPOD_API_KEY not set (put it in server/.env)');
  return k;
}

export async function rp(method, path, body) {
  const res = await fetch(`${REST}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return json;
}

export function arg(name, fallback) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

export function confirmFlag() {
  return process.argv.includes('--confirm');
}
