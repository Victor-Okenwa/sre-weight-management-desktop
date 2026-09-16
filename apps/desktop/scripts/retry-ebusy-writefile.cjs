/**
 * electron-builder's resEdit writeFile hits EBUSY on Windows when Defender
 * briefly scans the newly extracted exe. Retry that write until the lock
 * clears (no timer delay — keep trying until success or wall-clock budget).
 */
const fs = require('node:fs');
const path = require('node:path');

const TARGET = 'Solution Road Weight Management.exe';
const BUDGET_MS = 15_000;

function isTarget(file) {
  return path.basename(String(file ?? '')).toLowerCase() === TARGET.toLowerCase();
}

function debugRetry(attempt, code, file) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/ae86dde8-539a-4041-add6-1f0ce25a4703', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ee3081' },
    body: JSON.stringify({
      sessionId: 'ee3081',
      runId: 'post-fix',
      hypothesisId: 'D',
      location: 'apps/desktop/scripts/retry-ebusy-writefile.cjs',
      message: 'retrying writeFile after EBUSY',
      data: { attempt, code, file: String(file) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function shouldRetry(error, file) {
  return isTarget(file) && (error.code === 'EBUSY' || error.code === 'EPERM');
}

const origWriteFile = fs.writeFile.bind(fs);
fs.writeFile = function writeFileRetry(file, data, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  if (!callback) {
    return origWriteFile(file, data, options);
  }
  const started = Date.now();
  let attempt = 0;
  const tryWrite = () => {
    origWriteFile(file, data, options, (error) => {
      if (!error || !shouldRetry(error, file) || Date.now() - started >= BUDGET_MS) {
        callback(error);
        return;
      }
      attempt += 1;
      debugRetry(attempt, error.code, file);
      setImmediate(tryWrite);
    });
  };
  tryWrite();
};

const origPromisesWriteFile = fs.promises.writeFile.bind(fs.promises);
fs.promises.writeFile = async function writeFileRetry(file, data, options) {
  const started = Date.now();
  let attempt = 0;
  for (;;) {
    try {
      return await origPromisesWriteFile(file, data, options);
    } catch (error) {
      if (!shouldRetry(error, file) || Date.now() - started >= BUDGET_MS) {
        throw error;
      }
      attempt += 1;
      debugRetry(attempt, error.code, file);
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
};
