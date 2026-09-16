/**
 * electron-builder's resEdit writeFile hits EBUSY on Windows when Defender
 * briefly scans the newly extracted exe. Retry that write until the lock
 * clears or the wall-clock budget expires.
 */
const fs = require('node:fs');
const path = require('node:path');

const TARGET = 'Solution Road Weight Management.exe';
const BUDGET_MS = 15_000;

function isTarget(file) {
  return path.basename(String(file ?? '')).toLowerCase() === TARGET.toLowerCase();
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
  const tryWrite = () => {
    origWriteFile(file, data, options, (error) => {
      if (!error || !shouldRetry(error, file) || Date.now() - started >= BUDGET_MS) {
        callback(error);
        return;
      }
      setImmediate(tryWrite);
    });
  };
  tryWrite();
};

const origPromisesWriteFile = fs.promises.writeFile.bind(fs.promises);
fs.promises.writeFile = async function writeFileRetry(file, data, options) {
  const started = Date.now();
  for (;;) {
    try {
      return await origPromisesWriteFile(file, data, options);
    } catch (error) {
      if (!shouldRetry(error, file) || Date.now() - started >= BUDGET_MS) {
        throw error;
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
};
