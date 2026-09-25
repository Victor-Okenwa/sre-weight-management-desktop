import type { HealthResult } from '@weight/database/repositories/health';
import type {
  CreateRecordInput,
  RecordFilters,
  UpdateRecordInput,
} from '@weight/database/repositories/record';
import type {
  ActivateLicenseResult,
  AuthStatus,
  LicenseStatus,
  Material,
  PaginatedResult,
  PasswordActionResult,
  PrinterInfo,
  PrintPreviewInput,
  PrintPreviewResult,
  PrintTicketInput,
  PrintTicketResult,
  Record as RecordType,
  SerialPortInfo,
  SettingsRow,
  Vehicle,
  WeightReading,
} from '@weight/shared/types/index';
import { contextBridge, ipcRenderer } from 'electron';

type UpdateStatusEvent =
  | { type: 'checking-connectivity' }
  | { type: 'offline' }
  | { type: 'checking-store' }
  | { type: 'store-unreachable' }
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available'; version: string }
  | { type: 'progress'; percent: number; transferred: number; total: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string };

contextBridge.exposeInMainWorld('electronAPI', {
  listSerialPorts: (): Promise<SerialPortInfo[]> => ipcRenderer.invoke('serial:list-ports'),
  reconnectPort: () => ipcRenderer.invoke('serial:reconnect'),

  isSetupCompleted: (): Promise<boolean> => ipcRenderer.invoke('app:is-setup-completed'),
  completeSetup: (settings: Record<string, string>): Promise<boolean> =>
    ipcRenderer.invoke('app:complete-setup', settings),
  isTourCompleted: (): Promise<boolean> => ipcRenderer.invoke('app:is-tour-completed'),
  completeTour: (): Promise<boolean> => ipcRenderer.invoke('app:complete-tour'),

  getMachineId: (): Promise<string> => ipcRenderer.invoke('license:get-machine-id'),
  activateLicense: (licenseJson: string): Promise<ActivateLicenseResult> =>
    ipcRenderer.invoke('license:activate', licenseJson),
  getLicenseStatus: (): Promise<LicenseStatus> => ipcRenderer.invoke('license:get-status'),

  getAuthStatus: (): Promise<AuthStatus> => ipcRenderer.invoke('auth:get-status'),
  setPasswordless: (): Promise<PasswordActionResult> => ipcRenderer.invoke('auth:set-passwordless'),
  setPassword: (password: string): Promise<PasswordActionResult> =>
    ipcRenderer.invoke('auth:set-password', password),
  verifyPassword: (password: string): Promise<PasswordActionResult> =>
    ipcRenderer.invoke('auth:verify-password', password),
  changePassword: (payload: { current: string; next: string }): Promise<PasswordActionResult> =>
    ipcRenderer.invoke('auth:change-password', payload),
  clearPassword: (current: string): Promise<PasswordActionResult> =>
    ipcRenderer.invoke('auth:clear-password', current),
  forgotPasswordReset: (): Promise<PasswordActionResult> =>
    ipcRenderer.invoke('auth:forgot-password-reset'),

  onWeightUpdate: (callback: (reading: WeightReading) => void) => {
    const handler = (_event: any, reading: WeightReading) => callback(reading);
    ipcRenderer.on('weight:update', handler);
    return () => ipcRenderer.removeListener('weight:update', handler);
  },

  onSerialStatus: (callback: (status: string) => void) => {
    const handler = (_event: any, status: string) => callback(status);
    ipcRenderer.on('serial:status', handler);
    return () => ipcRenderer.removeListener('serial:status', handler);
  },
  getSerialStatus: (): Promise<string> => ipcRenderer.invoke('serial:get-status'),
  log: (level: string, message: string) => {
    ipcRenderer.send('log', { level, message });
  },
  // Later you can add more methods:
  // getSettings, setSettings, etc.
  getAllSettings: (): Promise<SettingsRow | null> => ipcRenderer.invoke('settings:get-all'),
  updateSettings: (data: Record<string, never>): Promise<boolean> =>
    ipcRenderer.invoke('settings:update', data),

  // Materials
  getAllMaterials: (): Promise<Material[]> => ipcRenderer.invoke('materials:get-all'),
  getMaterialsPaginated: (
    page: number,
    pageSize: number,
    filters?: { search?: string; startDate?: string; endDate?: string },
  ): Promise<PaginatedResult<Material>> =>
    ipcRenderer.invoke('materials:get-paginated', page, pageSize, filters),
  updateMaterial: (id: number, data: { name?: string }): Promise<Material | null> =>
    ipcRenderer.invoke('materials:update', id, data),
  deleteMaterial: (id: number): Promise<void> => ipcRenderer.invoke('materials:delete', id),
  deleteMaterials: (ids: number[]): Promise<number> =>
    ipcRenderer.invoke('materials:delete-many', ids),

  // Health
  checkDatabaseHealth: (): Promise<HealthResult> => ipcRenderer.invoke('db:health-check'),

  // Vehicles
  getAllVehicles: (): Promise<Vehicle[]> => ipcRenderer.invoke('vehicles:get-all'),
  getVehiclesPaginated: (
    page: number,
    pageSize: number,
    filters?: { search?: string; startDate?: string; endDate?: string },
  ): Promise<PaginatedResult<Vehicle>> =>
    ipcRenderer.invoke('vehicles:get-paginated', page, pageSize, filters),
  updateVehicle: (
    id: number,
    data: { name?: string; tareWeight?: number | null; tareUnit?: string | null },
  ): Promise<Vehicle | null> => ipcRenderer.invoke('vehicles:update', id, data),
  deleteVehicle: (id: number): Promise<void> => ipcRenderer.invoke('vehicles:delete', id),
  deleteVehicles: (ids: number[]): Promise<number> =>
    ipcRenderer.invoke('vehicles:delete-many', ids),

  // Records
  createRecord: (data: CreateRecordInput): Promise<RecordType> =>
    ipcRenderer.invoke('records:create', data),
  updateRecord: (id: number, data: UpdateRecordInput): Promise<RecordType | null> =>
    ipcRenderer.invoke('records:update', id, data),
  getRecordById: (id: number): Promise<RecordType | null> =>
    ipcRenderer.invoke('records:get-by-id', id),
  getRecordByTicketId: (ticketId: string): Promise<RecordType | null> =>
    ipcRenderer.invoke('records:get-by-ticket-id', ticketId),
  getRecordsPaginated: (
    page: number,
    pageSize: number,
    filters?: RecordFilters,
  ): Promise<PaginatedResult<RecordType>> =>
    ipcRenderer.invoke('records:get-paginated', page, pageSize, filters),
  deleteRecord: (id: number): Promise<RecordType | null> =>
    ipcRenderer.invoke('records:delete', id),
  deleteRecords: (ids: number[]): Promise<number> => ipcRenderer.invoke('records:delete-many', ids),

  // Printing
  listPrinters: (): Promise<{ printers: PrinterInfo[] }> => ipcRenderer.invoke('printers:list'),
  previewTicket: (input: PrintPreviewInput): Promise<PrintPreviewResult> =>
    ipcRenderer.invoke('print:preview', input),
  printTicket: (input: PrintTicketInput): Promise<PrintTicketResult> =>
    ipcRenderer.invoke('print:ticket', input),

  getRegistryHealth: (): Promise<{
    ok: boolean;
    status?: number;
    body?: unknown;
    error?: string;
  }> => ipcRenderer.invoke('registry:health'),
  getDeviceDetails: (): Promise<{
    machineId: string;
    companyName: string;
    companyAddress: string;
    companyEmail: string;
    version: string;
    previousVersion: string | null;
    event: string;
    downloadedAt: string | null;
    updatedAt: string | null;
    reportedAt: string;
  }> => ipcRenderer.invoke('registry:device-details'),

  // Updates
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('update:get-version'),
  checkForUpdates: (): Promise<unknown> => ipcRenderer.invoke('update:check'),
  downloadUpdate: (): Promise<unknown> => ipcRenderer.invoke('update:download'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (callback: (event: UpdateStatusEvent) => void) => {
    const handler = (_event: unknown, payload: UpdateStatusEvent) => callback(payload);
    ipcRenderer.on('update:status', handler);
    return () => ipcRenderer.removeListener('update:status', handler);
  },
});
