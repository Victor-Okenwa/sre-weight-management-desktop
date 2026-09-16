/**
 * Inspect GitHub releases for tag matching (no secrets logged).
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: join(desktopRoot, '.env') });
loadEnv({ path: join(desktopRoot, '.env.local') });

const token = (process.env.GH_TOKEN ?? '').trim().replace(/^['"]|['"]$/g, '');
const owner = 'Victor-Okenwa';
const repo = 'weight-management-desktop';

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'wms-release-inspect',
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

function summarizeRelease(rel) {
  if (!rel || typeof rel !== 'object') return rel;
  return {
    id: rel.id,
    tag_name: rel.tag_name,
    name: rel.name,
    draft: rel.draft,
    prerelease: rel.prerelease,
    published_at: rel.published_at,
    assetNames: Array.isArray(rel.assets) ? rel.assets.map((a) => a.name) : [],
  };
}

async function debugLog(hypothesisId, message, data) {
  // #region agent log
  await fetch('http://127.0.0.1:7244/ingest/ae86dde8-539a-4041-add6-1f0ce25a4703', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ee3081' },
    body: JSON.stringify({
      sessionId: 'ee3081',
      runId: 'github-release-inspect',
      hypothesisId,
      location: 'apps/desktop/scripts/inspect-github-releases.mjs',
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

if (!token) {
  console.log('no GH_TOKEN');
  await debugLog('H', 'no GH_TOKEN', {});
  process.exit(1);
}

const list = await gh(`/repos/${owner}/${repo}/releases?per_page=30`);
const byV = await gh(`/repos/${owner}/${repo}/releases/tags/v1.1.0`);
const byPlain = await gh(`/repos/${owner}/${repo}/releases/tags/1.1.0`);

const listed = Array.isArray(list.body) ? list.body.map(summarizeRelease) : { status: list.status, body: list.body };

await debugLog('H', 'GET /releases list', {
  status: list.status,
  count: Array.isArray(list.body) ? list.body.length : 0,
  listed,
});
await debugLog('I', 'GET /releases/tags/v1.1.0', {
  status: byV.status,
  release: byV.status === 200 ? summarizeRelease(byV.body) : byV.body?.message,
});
await debugLog('J', 'GET /releases/tags/1.1.0', {
  status: byPlain.status,
  release: byPlain.status === 200 ? summarizeRelease(byPlain.body) : byPlain.body?.message,
});

console.log(JSON.stringify({ listStatus: list.status, listed, byV: { status: byV.status, release: byV.status === 200 ? summarizeRelease(byV.body) : byV.body?.message }, byPlain: { status: byPlain.status, release: byPlain.status === 200 ? summarizeRelease(byPlain.body) : byPlain.body?.message } }, null, 2));
