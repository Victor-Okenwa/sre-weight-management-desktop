import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export const APP_USER_MODEL_ID = 'com.solutionroad.weightmanagement';
export const APP_DISPLAY_NAME = 'Solution Road Weight Management';
export const APP_USER_DATA_DIR_NAME = 'Solution Road Weight Management';

const LEGACY_USER_DATA_SEGMENTS = [['@weight', 'desktop'], ['@weight'], ['Weight Management']];

function hasDatabase(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'data.db'));
}

function findLegacyUserData(appData: string, dest: string): string | null {
  const destResolved = path.resolve(dest);
  const matches = LEGACY_USER_DATA_SEGMENTS.map((segments) => path.join(appData, ...segments)).filter(
    (dir) => path.resolve(dir) !== destResolved && hasDatabase(dir),
  );

  if (matches.length === 0) return null;

  return matches.sort(
    (a, b) => fs.statSync(path.join(b, 'data.db')).mtimeMs - fs.statSync(path.join(a, 'data.db')).mtimeMs,
  )[0];
}

function migrateLegacyUserData(dest: string) {
  if (hasDatabase(dest)) return;

  const source = findLegacyUserData(app.getPath('appData'), dest);
  if (!source) return;

  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(source, dest, { recursive: true, force: false });
}

/** Must run before any module reads `app.getPath('userData')`. */
export function initAppIdentity() {
  app.setName(APP_DISPLAY_NAME);
  app.setAppUserModelId(APP_USER_MODEL_ID);

  const userData = path.join(app.getPath('appData'), APP_USER_DATA_DIR_NAME);
  app.setPath('userData', userData);
  fs.mkdirSync(userData, { recursive: true });
  migrateLegacyUserData(userData);
}
