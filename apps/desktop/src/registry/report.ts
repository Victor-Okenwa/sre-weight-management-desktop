import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { getMachineId } from '../license/license-service.js';
import { logger } from '../logger.js';
import { checkHostReachable } from '../updater/connectivity.js';
import { REGISTRY_INGEST_SECRET, REGISTRY_URL } from './registry-config.generated.js';

const REPORT_TIMEOUT_MS = 5_000;

type RegistryEvent = 'online' | 'updated';

type PendingUpdate = {
  fromVersion: string;
  toVersion: string;
  downloadedAt: string;
};

type LastReport = {
  machineId: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  version: string;
};

export type RegistryCompany = {
  companyName: string;
  companyAddress: string;
  companyEmail: string;
};

export function recordPendingUpdate(pending: PendingUpdate) {
  try {
    writeJson(pendingUpdatePath(), pending);
    logger.info(
      `[registry] pending update ${pending.fromVersion} -> ${pending.toVersion} recorded`,
    );
  } catch (error) {
    logger.warn(`[registry] could not record pending update: ${(error as Error).message}`);
  }
}

export function startRegistryReporter(company: RegistryCompany) {
  void reportInstallation(company).catch((error) => {
    logger.warn(`[registry] report failed: ${(error as Error).message}`);
  });
}

async function reportInstallation(company: RegistryCompany) {
  const url = registryUrl();
  const secret = registrySecret();
  if (app.isPackaged && isLocalRegistry(url)) {
    logger.warn('[registry] skipped: packaged build is pointed at a local registry');
    return;
  }
  if (!url || !secret) {
    logger.info('[registry] skipped: not configured');
    return;
  }

  const version = app.getVersion();
  const pending = readPendingUpdate();
  const updated = pending?.toVersion === version;
  const machineId = getMachineId();
  if (!machineId) {
    logger.warn('[registry] skipped: missing machine id');
    return;
  }

  const fingerprint: LastReport = {
    machineId,
    companyName: company.companyName.trim(),
    companyAddress: company.companyAddress.trim(),
    companyEmail: company.companyEmail.trim(),
    version,
  };

  if (!updated && sameAsLastReport(fingerprint)) {
    logger.info('[registry] skipped: unchanged since last report');
    return;
  }

  if (!isLocalRegistry(url)) {
    const reachable = await registryHostReachable(url);
    if (!reachable) {
      logger.info('[registry] skipped: registry unreachable');
      return;
    }
  }

  const last = readLastReport();
  const payload = {
    machineId: fingerprint.machineId,
    companyName: fingerprint.companyName,
    companyAddress: fingerprint.companyAddress,
    companyEmail: fingerprint.companyEmail,
    version,
    previousVersion: updated ? (pending?.fromVersion ?? null) : (last?.version ?? null),
    event: (updated ? 'updated' : 'online') satisfies RegistryEvent,
    downloadedAt: updated ? (pending?.downloadedAt ?? null) : null,
    updatedAt: updated ? new Date().toISOString() : null,
  };

  const response = await fetch(new URL('/v1/reports', url), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
  });

  if (!response.ok && response.status !== 204) {
    logger.warn(`[registry] report rejected: HTTP ${response.status}`);
    return;
  }

  writeJson(lastReportPath(), fingerprint);
  if (updated) clearPendingUpdate();
  logger.info(
    `[registry] reported machineId=${payload.machineId} version=${payload.version} event=${payload.event}`,
  );
}

function registryUrl() {
  const fromEnv = app.isPackaged ? '' : (process.env.REGISTRY_URL ?? '');
  return (fromEnv || REGISTRY_URL).trim().replace(/\/$/, '');
}

function registrySecret() {
  const fromEnv = app.isPackaged ? '' : (process.env.REGISTRY_INGEST_SECRET ?? '');
  return (fromEnv || REGISTRY_INGEST_SECRET).trim();
}

async function registryHostReachable(url: string) {
  try {
    const parsed = new URL(url);
    const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'http:' ? 80 : 443;
    return checkHostReachable(parsed.hostname, port);
  } catch {
    return false;
  }
}

function isLocalRegistry(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

function sameAsLastReport(next: LastReport) {
  const last = readLastReport();
  if (!last) return false;
  return (
    last.machineId === next.machineId &&
    last.companyName === next.companyName &&
    last.companyAddress === next.companyAddress &&
    last.companyEmail === next.companyEmail &&
    last.version === next.version
  );
}

function readPendingUpdate() {
  return readJson<PendingUpdate>(pendingUpdatePath());
}

function readLastReport() {
  return readJson<LastReport>(lastReportPath());
}

function clearPendingUpdate() {
  try {
    unlinkSync(pendingUpdatePath());
  } catch {
    // already gone
  }
}

function pendingUpdatePath() {
  return path.join(app.getPath('userData'), 'registry-pending-update.json');
}

function lastReportPath() {
  return path.join(app.getPath('userData'), 'registry-last-report.json');
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeJson(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value), 'utf8');
}
