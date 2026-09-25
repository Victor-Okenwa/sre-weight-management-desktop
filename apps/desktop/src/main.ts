import dotenv from 'dotenv';
import { app, BrowserWindow, screen } from 'electron';

if (!app.isPackaged) {
  dotenv.config({ path: '.env.local' });
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllSettings } from '@weight/database/repositories/settings';
import type { SerialOptions, SettingsRow } from '@weight/shared/types/index';
import { getDatabase, setupDatabase } from './database/connection.js';
import { registerIpcHandlers } from './ipc/ipc.js';
import type { IndicatorType } from './parser/index.js';
import { SerialManager } from './serial/serial-manager.js';
import { startRegistryReporter } from './registry/report.js';
import { startAutoUpdater } from './updater/auto-updater.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let isCleaningUp = false;

const iconPath = path.join(app.getAppPath(), 'assets', 'logo.png');

function createMainWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const windowWidth = Math.floor(width * 0.9);
  const windowHeight = Math.floor(height * 0.9);

  mainWindow = new BrowserWindow({
    icon: iconPath,
    width: windowWidth,
    height: windowHeight,
    autoHideMenuBar: isDev,
    title: 'Solution Road Weight Management',
    backgroundColor: '#1e1e1e',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      enableWebSQL: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
    mainWindow.loadURL('http://localhost:2500');
  } else if (app.isPackaged) {
    mainWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'index.html'));
  } else {
    // Running `electron .` against local dist without a full package
    mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getSerialOptions(settingsRow: SettingsRow): SerialOptions {
  return {
    port: (settingsRow.serialPort || 'COM1') as `COM${number}`,
    baudRate: (settingsRow.baudRate || 2400) as 2400,
    dataBits: (settingsRow.dataBits || 8) as 8,
    stopBits: (settingsRow.stopBits || 1) as 1,
    parity: (settingsRow.parity || 'none') as 'none',
    flowControl: (settingsRow.flowControl || 'none') as 'none',
    autoOpen: settingsRow.autoOpen || false,
  };
}

function cleanupResources(serialManager: SerialManager) {
  if (isCleaningUp) return;
  isCleaningUp = true;
  try {
    serialManager.disconnect();
    const currentDb = getDatabase();
    currentDb.save();
    currentDb.close();
  } catch {
    // Best-effort cleanup on quit / update install
  }
}

app.whenReady().then(async () => {
  logger.info(`userData: ${app.getPath('userData')}`);
  await setupDatabase();
  const db = getDatabase();

  const settingsRow = getAllSettings(db);
  const serialOptions = getSerialOptions(settingsRow as SettingsRow);
  const indicatorType = settingsRow?.indicatorType || 'd300';

  console.log(settingsRow);

  const serialManager = new SerialManager(
    indicatorType as IndicatorType,
    (reading) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('weight:update', reading);
      }
    },
    (status) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('serial:status', status);
      }
    },
    {
      tolerance: settingsRow?.stableTolerance ?? 0.5,
      durationMs: settingsRow?.stableDurationMs ?? 3000,
    },
  );

  registerIpcHandlers(serialManager);
  createMainWindow();
  serialManager.connect(serialOptions);

  startAutoUpdater({
    getMainWindow: () => mainWindow,
    prepareInstall: () => cleanupResources(serialManager),
  });

  startRegistryReporter({
    companyName: settingsRow?.companyName ?? '',
    companyAddress: settingsRow?.companyAddress ?? '',
    companyEmail: settingsRow?.companyEmail ?? '',
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });

  app.on('before-quit', () => {
    cleanupResources(serialManager);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
