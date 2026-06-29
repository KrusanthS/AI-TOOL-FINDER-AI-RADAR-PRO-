import { config as dotenvConfig } from 'dotenv';
import path, { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from repo root (local dev). On Render, env vars are injected directly.
const __dirnameApp = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirnameApp, '../../.env') });
