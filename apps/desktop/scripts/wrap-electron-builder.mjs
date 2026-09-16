/**
 * Runs electron-builder with Windows/GitHub publish workarounds:
 * - Retry EBUSY when Defender locks the freshly extracted exe
 * - Load GH_TOKEN from .env / .env.local (electron-builder does not)
 * - Allow re-uploading to an existing GitHub release (EP_GH_IGNORE_TIME)
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

loadEnv({ path: join(desktopRoot, '.env') });
loadEnv({ path: join(desktopRoot, '.env.local') });

function sanitizeToken(value) {
  if (!value) return value;
  return value.trim().replace(/^['"]|['"]$/g, '');
}

const builderArgs = process.argv.slice(2);
const preload = join(desktopRoot, 'scripts', 'retry-ebusy-writefile.cjs');
const existingNodeOptions = process.env.NODE_OPTIONS ?? '';
const requireFlag = `--require ${preload}`;
const ghToken = sanitizeToken(process.env.GH_TOKEN);

const childEnv = {
  ...process.env,
  NODE_OPTIONS: existingNodeOptions ? `${existingNodeOptions} ${requireFlag}` : requireFlag,
  EP_GH_IGNORE_TIME: 'true',
};
if (ghToken) {
  childEnv.GH_TOKEN = ghToken;
}

const child = spawn('electron-builder', builderArgs, {
  stdio: 'inherit',
  shell: true,
  cwd: desktopRoot,
  env: childEnv,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
