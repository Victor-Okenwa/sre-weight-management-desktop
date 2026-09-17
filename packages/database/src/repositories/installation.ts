import { eq } from 'drizzle-orm';
import type { DatabaseInstance } from '../index.js';
import { installation } from '../schema/index.js';

export function getInstallation(db: DatabaseInstance) {
  return db.select().from(installation).where(eq(installation.id, 1)).get();
}

export function ensureInstallationRow(db: DatabaseInstance) {
  const existing = db
    .select({ id: installation.id })
    .from(installation)
    .where(eq(installation.id, 1))
    .get();

  if (!existing) {
    db.insert(installation)
      .values({
        id: 1,
        setupCompleted: false,
        tourCompleted: false,
        machineId: '',
      })
      .run();
  }
}

export function upsertInstallation(
  db: DatabaseInstance,
  data: Partial<typeof installation.$inferInsert>,
) {
  const { id: _id, ...rest } = data;
  if (Object.keys(rest).length === 0) return;

  ensureInstallationRow(db);
  db.update(installation).set(rest).where(eq(installation.id, 1)).run();
}

export function markSetupCompleted(db: DatabaseInstance) {
  upsertInstallation(db, { setupCompleted: true });
}

export function saveLicense(
  db: DatabaseInstance,
  payload: {
    machineId: string;
    licenseIssuedAt: string;
    licenseExpiresAt: string;
    licenseSignature: string;
    activatedAt: string;
  },
) {
  upsertInstallation(db, {
    machineId: payload.machineId,
    licenseIssuedAt: payload.licenseIssuedAt,
    licenseExpiresAt: payload.licenseExpiresAt,
    licenseSignature: payload.licenseSignature,
    activatedAt: payload.activatedAt,
    // New / changed license always clears app password
    passwordMode: null,
    passwordSalt: null,
    passwordHash: null,
  });
}

export function clearLicenseAndPassword(db: DatabaseInstance) {
  upsertInstallation(db, {
    licenseIssuedAt: null,
    licenseExpiresAt: null,
    licenseSignature: null,
    activatedAt: null,
    passwordMode: null,
    passwordSalt: null,
    passwordHash: null,
    setupCompleted: false,
  });
}

export function isSetupCompleted(db: DatabaseInstance): boolean {
  const row = getInstallation(db);
  return row?.setupCompleted === true;
}

export function isTourCompleted(db: DatabaseInstance): boolean {
  const row = getInstallation(db);
  return row?.tourCompleted === true;
}

export function markTourCompleted(db: DatabaseInstance) {
  upsertInstallation(db, { tourCompleted: true });
}
