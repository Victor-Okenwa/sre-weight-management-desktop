/**
 * Runs electron-builder while recording who locks the unpacked Windows exe.
 * Used to diagnose EBUSY during `pnpm release:win` / `pnpm dist:win`.
 */
import { execFile, spawn } from 'node:child_process';
import { existsSync, openSync, closeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { config as loadEnv } from 'dotenv';

const execFileAsync = promisify(execFile);
const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const exePath = join(
  desktopRoot,
  'release',
  'win-unpacked',
  'Solution Road Weight Management.exe',
);

async function debugLog(hypothesisId, message, data) {
  // #region agent log
  await fetch('http://127.0.0.1:7244/ingest/ae86dde8-539a-4041-add6-1f0ce25a4703', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ee3081' },
    body: JSON.stringify({
      sessionId: 'ee3081',
      runId: 'wrap-electron-builder',
      hypothesisId,
      location: 'apps/desktop/scripts/wrap-electron-builder.mjs',
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function tryOpenExclusive() {
  if (!existsSync(exePath)) return { exists: false, locked: false };
  try {
    const fd = openSync(exePath, 'r+');
    closeSync(fd);
    return { exists: true, locked: false };
  } catch (error) {
    return {
      exists: true,
      locked: true,
      code: error.code,
      err: error.message,
    };
  }
}

async function listCandidateProcesses() {
  const script = [
    'Get-CimInstance Win32_Process | Where-Object {',
    "  $_.Name -match 'Solution Road|electron|MsMpEng|MsSense' -or",
    "  ($_.ExecutablePath -and $_.ExecutablePath -like '*win-unpacked*') -or",
    "  ($_.CommandLine -and $_.CommandLine -like '*win-unpacked*')",
    "} | Select-Object ProcessId, Name, ExecutablePath | ConvertTo-Json -Compress",
  ].join(' ');

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-Command', script],
      { windowsHide: true, timeout: 15_000 },
    );
    const trimmed = stdout.trim();
    if (!trimmed) return [];
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    return [{ error: error.message }];
  }
}

function summarize(processes) {
  return processes.map((proc) => ({
    pid: proc.ProcessId ?? null,
    name: proc.Name ?? null,
    path: proc.ExecutablePath ?? null,
    error: proc.error ?? null,
  }));
}

function tokenMeta(name) {
  const raw = process.env[name];
  if (raw == null || raw === '') {
    return { name, present: false, length: 0 };
  }
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
  return {
    name,
    present: true,
    length: raw.length,
    trimmedLength: trimmed.length,
    hadWhitespace: raw !== raw.trim(),
    hadQuotes: raw !== trimmed && /^['"]/.test(raw.trim()),
    prefix: trimmed.slice(0, 7),
  };
}

function sanitizeToken(value) {
  if (!value) return value;
  return value.trim().replace(/^['"]|['"]$/g, '');
}

loadEnv({ path: join(desktopRoot, '.env') });
loadEnv({ path: join(desktopRoot, '.env.local') });

const builderArgs = process.argv.slice(2);
const initialLock = tryOpenExclusive();
const initialProcesses = await listCandidateProcesses();

await debugLog('A', 'before electron-builder', {
  exePath,
  initialLock,
  solutionRoad: summarize(initialProcesses).filter((proc) =>
    /solution road|win-unpacked/i.test(`${proc.name ?? ''} ${proc.path ?? ''}`),
  ),
});
await debugLog('D', 'scanners before builder', {
  scanners: summarize(initialProcesses).filter((proc) =>
    /msmpeng|mssense/i.test(String(proc.name ?? '')),
  ),
});
await debugLog('E', 'electron before builder', {
  electrons: summarize(initialProcesses).filter((proc) =>
    /electron/i.test(String(proc.name ?? '')),
  ),
});

await debugLog('F', 'github publish token metadata after dotenv', {
  tokens: ['GITHUB_RELEASE_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN'].map(tokenMeta),
  updateTokenPresent: Boolean(process.env.UPDATE_GH_TOKEN),
  updateTokenLength: (process.env.UPDATE_GH_TOKEN ?? '').length,
});

console.log(
  '[wrap-electron-builder] before: exists=',
  initialLock.exists,
  'locked=',
  initialLock.locked,
);

const preload = join(desktopRoot, 'scripts', 'retry-ebusy-writefile.cjs');
const existingNodeOptions = process.env.NODE_OPTIONS ?? '';
const requireFlag = `--require ${preload}`;
const ghToken = sanitizeToken(process.env.GH_TOKEN);
const childEnv = {
  ...process.env,
  NODE_OPTIONS: existingNodeOptions
    ? `${existingNodeOptions} ${requireFlag}`
    : requireFlag,
  // Allow uploading to an existing GitHub release (partial publish / re-run).
  // electron-builder otherwise ignores published releases older than 2 hours
  // and tries POST /releases again, which 422s with tag_name already_exists.
  EP_GH_IGNORE_TIME: 'true',
};
if (ghToken) {
  childEnv.GH_TOKEN = ghToken;
}

await debugLog('G', 'child GH_TOKEN after sanitize', {
  present: Boolean(childEnv.GH_TOKEN),
  length: childEnv.GH_TOKEN ? childEnv.GH_TOKEN.length : 0,
  prefix: childEnv.GH_TOKEN ? childEnv.GH_TOKEN.slice(0, 7) : null,
});

await debugLog('K', 'publish env for existing GitHub release', {
  EP_GH_IGNORE_TIME: childEnv.EP_GH_IGNORE_TIME,
});

await debugLog('D', 'spawning electron-builder with ebusy write retry preload', {
  preload,
  nodeOptions: childEnv.NODE_OPTIONS,
});

const child = spawn('electron-builder', builderArgs, {
  stdio: 'inherit',
  shell: true,
  cwd: desktopRoot,
  env: childEnv,
});

child.on('exit', (code) => {
  void (async () => {
    const finalLock = tryOpenExclusive();
    const processes = await listCandidateProcesses();
    await debugLog('A', 'electron-builder exited', {
      code,
      finalLock,
      processes: summarize(processes),
    });
    console.log(
      '[wrap-electron-builder] after: code=',
      code,
      'locked=',
      finalLock.locked,
    );
    process.exit(code ?? 1);
  })();
});
