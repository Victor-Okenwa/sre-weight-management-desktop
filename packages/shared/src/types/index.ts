export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface WeightReading {
  weight: number;
  unit: string;
  raw: string;
  isStable: boolean;
}

export type SerialStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'idle'
  | 'reconnecting'
  | 'connecting';

export type COMPorts = `COM${number}`;
export type BaudRate =
  | 300
  | 600
  | 1200
  | 2400
  | 4800
  | 9600
  | 14400
  | 19200
  | 38400
  | 57600
  | 115200
  | 230400
  | 460800
  | 921600;
export type Parity = 'none' | 'even' | 'mark' | 'odd' | 'space';
export type StopBits = 1 | 2;
export type FlowControl = 'none' | 'xon/xoff' | 'hardware';
export type DataBits = 5 | 6 | 7 | 8;

export interface SerialOptions {
  port: COMPorts;
  baudRate: BaudRate;
  dataBits: DataBits;
  stopBits: StopBits;
  parity: Parity;
  flowControl: FlowControl;
  autoOpen: boolean;
}

export type PaperSizeGroup = 'A4' | '80mm' | '58mm';

export interface PrinterInfo {
  name: string;
  displayName: string;
  isDefault: boolean;
}

export interface PrintTicketInput {
  printerName: string;
  paperSize: PaperSizeGroup;
  copies: number;
  recordId: number;
}

export type PrintTicketResult = { ok: true } | { ok: false; error: string };

export interface PrintPreviewInput {
  recordId: number;
  paperSize: PaperSizeGroup;
}

export type PrintPreviewResult = { ok: true; html: string } | { ok: false; error: string };

export interface SettingsRow {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogoPath: string;
  ticketPrefix: string;
  ticketFooter: string;
  nextTicketNumber: number;
  serialPort: string;
  baudRate: BaudRate;
  dataBits: DataBits;
  flowControl: FlowControl;
  parity: Parity;
  stopBits: StopBits;
  autoOpen: boolean;
  indicatorType: string;
  weightUnit: string;
  stableTolerance: number;
  stableDurationMs: number;
  theme: string;
  printAuto: boolean;
  printPrinterName: string;
  printCopies: number;
  printPaperSize: PaperSizeGroup;
}

export type PasswordMode = 'none' | 'required';

export interface InstallationRow {
  id: number;
  setupCompleted: boolean;
  tourCompleted: boolean;
  machineId: string;
  licenseIssuedAt: string | null;
  licenseExpiresAt: string | null;
  licenseSignature: string | null;
  activatedAt: string | null;
  /** null = not chosen yet during setup */
  passwordMode: PasswordMode | null;
  passwordSalt: string | null;
  passwordHash: string | null;
}

export interface SerialPortInfo {
  path: string;
  manufacturer: string;
  serialNumber?: string;
  pnpId?: string;
  friendlyName?: string;
}

export interface Vehicle {
  id: number;
  name: string;
  tareWeight: number | null;
  tareUnit: string | null;
  createdAt: string;
}

export interface Material {
  id: number;
  name: string;
  createdAt: string;
}

export interface Record {
  id: number;
  ticketId: string;
  operator: string | null;
  operationType: 'single' | 'double';
  grossWeight: number | null;
  tareWeight: number | null;
  netWeight: number | null;
  status: 'pending' | 'completed';
  vehicleId: number | null;
  materialId: number | null;
  vehicleName: string | null;
  materialName: string | null;
  supplierName: string | null;
  customerName: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Offline license payload (matches WMS-licenser LICENSE_FORMAT). */
export interface LicensePayload {
  machineId: string;
  issuedAt: string;
  expiresAt: string;
  signature: string;
}

export type ActivateLicenseResult =
  | { ok: true; expiresAt: string; machineId: string }
  | { ok: false; error: string };

export interface LicenseStatus {
  /** True when a stored license matches this PC and is not expired. */
  activated: boolean;
  machineId: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  /** Whole days until expiry (ceil). Null when no expiry date. Negative if past. */
  daysRemaining: number | null;
  /** True when activated and 0–14 days remain. */
  isExpiringSoon: boolean;
  setupCompleted: boolean;
  /** Reconstructed license JSON for setup resume / display (not a DB column). */
  licenseJson: string | null;
  /** null = security step not completed yet */
  passwordMode: PasswordMode | null;
}

export interface AuthStatus {
  passwordMode: PasswordMode | null;
  /** True when mode was chosen (none or required). */
  passwordConfigured: boolean;
  /** In-memory for this process; always false on app start. */
  sessionUnlocked: boolean;
}

export type PasswordActionResult = { ok: true } | { ok: false; error: string };
