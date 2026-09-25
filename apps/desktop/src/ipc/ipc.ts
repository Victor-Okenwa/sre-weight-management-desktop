// apps/desktop/src/ipc/ipc.ts

import {
  deleteMaterial,
  deleteMaterials,
  getAllMaterials,
  getMaterialsPaginated,
  updateMaterial,
} from '@weight/database/repositories/materials';
import { checkDatabaseHealth } from '@weight/database/repositories/health';
import {
  createRecord,
  deleteRecord,
  deleteRecords,
  getRecordById,
  getRecordByTicketId,
  getRecordsPaginated,
  updateRecord,
} from '@weight/database/repositories/record';
import {
  isSetupCompleted,
  isTourCompleted,
  markSetupCompleted,
  markTourCompleted,
} from '@weight/database/repositories/installation';
import { getAllSettings, updateSettings } from '@weight/database/repositories/settings';
import {
  deleteVehicle,
  deleteVehicles,
  getAllVehicles,
  getVehiclesPaginated,
  updateVehicle,
} from '@weight/database/repositories/vehicles';
import type {
  PaperSizeGroup,
  PrintPreviewInput,
  PrintTicketInput,
  SerialOptions,
} from '@weight/shared/types/index';
import { ipcMain } from 'electron';
import { SerialPort } from 'serialport';
import { getDatabase } from '../database/connection.js';
import { fetchRegistryHealth, getDeviceDetails } from '../registry/report.js';
import {
  changePassword,
  clearLicenseForPasswordReset,
  clearPassword,
  getAuthStatus,
  setPassword,
  setPasswordless,
  verifyPassword,
} from '../license/app-password.js';
import { activateLicense, getLicenseStatus, getMachineId } from '../license/license-service.js';
import { logger } from '../logger.js';
import { listPrinters } from '../printing/list-printers.js';
import { previewTicket } from '../printing/preview-ticket.js';
import { printTicket } from '../printing/print-ticket.js';
import type { SerialManager } from '../serial/serial-manager.js';
import {
  checkForAppUpdates,
  downloadAppUpdate,
  getAppVersion,
  installAppUpdate,
} from '../updater/auto-updater.js';

export function registerIpcHandlers(serialManager: SerialManager) {
  // Serial-port
  ipcMain.handle('serial:list-ports', async () => {
    const ports = await SerialPort.list();
    // Return only the fields the renderer needs
    return ports.map((p) => ({
      path: p.path,
      manufacturer: p.manufacturer || 'Unknown',
      serialNumber: p.serialNumber,
      pnpId: p.pnpId,
      productId: p.productId,
    }));
  });

  // Serial Reconnection
  ipcMain.handle('serial:reconnect', () => {
    const db = getDatabase();
    const row = getAllSettings(db);

    if (row) {
      const newOptions: SerialOptions = {
        port: (row.serialPort || 'COM1') as `COM${number}`,
        baudRate: (row.baudRate || 2400) as 2400,
        dataBits: (row.dataBits || 8) as 8,
        stopBits: (row.stopBits || 1) as 1,
        parity: (row.parity || 'none') as 'none',
        flowControl: (row.flowControl || 'none') as 'none',
        autoOpen: row.autoOpen || false,
      };
      // Instruct the serial manager to reconnect with the new settings
      serialManager.reconnect(newOptions);
    }
  });

  // ---------- Settings ----------
  ipcMain.handle('settings:get-all', () => {
    const db = getDatabase();
    const row = getAllSettings(db);
    if (!row) return null;
    // Return a plain object (camelCase keys)
    return {
      companyName: row.companyName,
      companyEmail: row.companyEmail,
      companyAddress: row.companyAddress,
      companyPhone: row.companyPhone,
      companyLogoPath: row.companyLogoPath,
      ticketPrefix: row.ticketPrefix,
      ticketFooter: row.ticketFooter,
      nextTicketNumber: row.nextTicketNumber,
      serialPort: row.serialPort,
      baudRate: row.baudRate,
      dataBits: row.dataBits,
      parity: row.parity,
      stopBits: row.stopBits,
      indicatorType: row.indicatorType,
      weightUnit: row.weightUnit,
      stableTolerance: row.stableTolerance,
      stableDurationMs: row.stableDurationMs,
      theme: row.theme,
      printAuto: row.printAuto,
      printPrinterName: row.printPrinterName,
      printCopies: row.printCopies,
      printPaperSize: (row.printPaperSize || '80mm') as PaperSizeGroup,
      flowControl: row.flowControl,
      autoOpen: row.autoOpen,
    };
  });

  ipcMain.handle('settings:update', (_event, data: Record<string, never>) => {
    const db = getDatabase();
    updateSettings(db, data);
    db.save();

    // Check if any serial‑related settings were changed
    const serialKeys = [
      'serialPort',
      'baudRate',
      'dataBits',
      'parity',
      'stopBits',
      'indicatorType',
      'flowControl',
    ];

    const hasSerialChange = Object.keys(data).some((key) => serialKeys.includes(key));

    if (hasSerialChange) {
      // Read the full settings row to get all serial options
      const row = getAllSettings(db);
      if (row) {
        const newOptions: SerialOptions = {
          port: (row.serialPort || 'COM1') as `COM${number}`,
          baudRate: (row.baudRate || 2400) as 2400,
          dataBits: (row.dataBits || 8) as 8,
          stopBits: (row.stopBits || 1) as 1,
          parity: (row.parity || 'none') as 'none',
          flowControl: (row.flowControl || 'none') as 'none',
          autoOpen: row.autoOpen || false,
        };
        // Instruct the serial manager to reconnect with the new settings
        serialManager.reconnect(newOptions);
      }
    }

    const stabilityKeys = ['stableTolerance', 'stableDurationMs'];
    const hasStabilityChange = Object.keys(data).some((key) => stabilityKeys.includes(key));
    if (hasStabilityChange) {
      const row = getAllSettings(db);
      if (row) {
        serialManager.setStabilityConfig(row.stableTolerance, row.stableDurationMs);
      }
    }

    return true;
  });

  // ---------- Setup wizard ----------
  ipcMain.handle('app:is-setup-completed', () => {
    const db = getDatabase();
    const completed = isSetupCompleted(db);
    logger.info(`is app setup? ${completed}`);
    return completed;
  });

  ipcMain.handle('app:complete-setup', async (_event, newSettings: Record<string, never>) => {
    const db = getDatabase();
    if (newSettings && Object.keys(newSettings).length > 0) {
      updateSettings(db, newSettings);
    }
    markSetupCompleted(db);
    db.save();
    return true;
  });

  ipcMain.handle('app:is-tour-completed', () => {
    const db = getDatabase();
    return isTourCompleted(db);
  });

  ipcMain.handle('app:complete-tour', () => {
    const db = getDatabase();
    markTourCompleted(db);
    db.save();
    return true;
  });

  // ---------- License (Machine ID + DB persist; Ed25519 verify pending) ----------
  ipcMain.handle('license:get-machine-id', () => {
    return getMachineId();
  });

  ipcMain.handle('license:activate', (_event, licenseJson: string) => {
    return activateLicense(licenseJson);
  });

  ipcMain.handle('license:get-status', () => {
    return getLicenseStatus();
  });

  // ---------- App password / session ----------
  ipcMain.handle('auth:get-status', () => {
    return getAuthStatus();
  });

  ipcMain.handle('auth:set-passwordless', () => {
    return setPasswordless();
  });

  ipcMain.handle('auth:set-password', (_event, password: string) => {
    return setPassword(password);
  });

  ipcMain.handle('auth:verify-password', (_event, password: string) => {
    return verifyPassword(password);
  });

  ipcMain.handle('auth:change-password', (_event, payload: { current: string; next: string }) => {
    return changePassword(payload.current, payload.next);
  });

  ipcMain.handle('auth:clear-password', (_event, current: string) => {
    return clearPassword(current);
  });

  ipcMain.handle('auth:forgot-password-reset', () => {
    return clearLicenseForPasswordReset();
  });

  // ---------- Serial status ----------
  ipcMain.handle('serial:get-status', () => {
    return serialManager.getStatus();
  });

  // ---------- Materials ----------
  ipcMain.handle('materials:get-all', () => {
    const db = getDatabase();
    return getAllMaterials(db);
  });

  ipcMain.handle('materials:get-paginated', (_event, page: number, pageSize: number, filters?) => {
    const db = getDatabase();
    return getMaterialsPaginated(db, page, pageSize, filters);
  });

  ipcMain.handle('materials:update', (_event, id: number, data) => {
    const db = getDatabase();
    const result = updateMaterial(db, id, data);
    db.save();
    return result;
  });

  ipcMain.handle('materials:delete', (_event, id: number) => {
    const db = getDatabase();
    deleteMaterial(db, id);
    db.save();
  });

  ipcMain.handle('materials:delete-many', (_event, ids: number[]) => {
    const db = getDatabase();
    const count = deleteMaterials(db, ids);
    db.save();
    return count;
  });

  // ---------- Vehicles ----------
  ipcMain.handle('vehicles:get-all', () => {
    const db = getDatabase();
    return getAllVehicles(db);
  });

  ipcMain.handle('vehicles:get-paginated', (_event, page: number, pageSize: number, filters?) => {
    const db = getDatabase();
    return getVehiclesPaginated(db, page, pageSize, filters);
  });

  ipcMain.handle('vehicles:update', (_event, id: number, data) => {
    const db = getDatabase();
    const result = updateVehicle(db, id, data);
    db.save();
    return result;
  });

  ipcMain.handle('vehicles:delete', (_event, id: number) => {
    const db = getDatabase();
    deleteVehicle(db, id);
    db.save();
  });

  ipcMain.handle('vehicles:delete-many', (_event, ids: number[]) => {
    const db = getDatabase();
    const count = deleteVehicles(db, ids);
    db.save();
    return count;
  });

  // ---------- Records ----------
  ipcMain.handle('records:create', (_event, data) => {
    const db = getDatabase();
    const record = createRecord(db, data);
    db.save();
    return record;
  });

  ipcMain.handle('records:update', (_event, id: number, data) => {
    const db = getDatabase();
    const record = updateRecord(db, id, data);
    db.save();
    return record;
  });

  ipcMain.handle('records:get-by-id', (_event, id: number) => {
    const db = getDatabase();
    return getRecordById(db, id);
  });

  ipcMain.handle('records:get-by-ticket-id', (_event, ticketId: string) => {
    const db = getDatabase();
    return getRecordByTicketId(db, ticketId);
  });

  ipcMain.handle('records:get-paginated', (_event, page: number, pageSize: number, filters?) => {
    const db = getDatabase();
    return getRecordsPaginated(db, page, pageSize, filters);
  });

  ipcMain.handle('records:delete', (_event, id: number) => {
    const db = getDatabase();
    const result = deleteRecord(db, id);
    db.save();
    return result;
  });

  ipcMain.handle('records:delete-many', (_event, ids: number[]) => {
    const db = getDatabase();
    const count = deleteRecords(db, ids);
    db.save();
    return count;
  });

  // ---------- Printing ----------
  ipcMain.handle('printers:list', async () => listPrinters());

  ipcMain.handle('print:preview', (_event, input: PrintPreviewInput) => previewTicket(input));

  ipcMain.handle('print:ticket', async (_event, input: PrintTicketInput) => printTicket(input));

  // ---------- Registry (testing) ----------
  ipcMain.handle('registry:health', () => fetchRegistryHealth());
  ipcMain.handle('registry:device-details', () => getDeviceDetails());

  // ---------- Updates ----------
  ipcMain.handle('update:get-version', () => getAppVersion());
  ipcMain.handle('update:check', () => checkForAppUpdates());
  ipcMain.handle('update:download', () => downloadAppUpdate());
  ipcMain.handle('update:install', () => installAppUpdate());

  // ---------- Renderer logging ----------
  ipcMain.handle('db:health-check', () => {
    const db = getDatabase();
    return checkDatabaseHealth(db);
  });

  ipcMain.on('log', (_event, { level, message }: { level: string; message: string }) => {
    switch (level) {
      case 'error':
        logger.error(`[renderer] ${message}`);
        break;
      case 'warn':
        logger.warn(`[renderer] ${message}`);
        break;
      case 'info':
        logger.info(`[renderer] ${message}`);
        break;
      case 'debug':
        logger.debug(`[renderer] ${message}`);
        break;
      default:
        logger.info(`[renderer] ${message}`);
    }
  });
}
