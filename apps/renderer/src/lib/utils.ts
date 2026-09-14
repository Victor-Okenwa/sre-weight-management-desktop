import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTicketPrefix(name: string): string {
  // Split the name into words (by whitespace)
  const words = name.trim().split(/\s+/);
  // Take up to the first 3 words, get their first letter, join and uppercase
  return words
    .slice(0, 3)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

/** Digit string shown in COM port inputs when nothing is stored yet. */
const DEFAULT_PORT_NUMBER = '3';

/**
 * Convert a stored serial port (`COM3`, `3`, or a number) into the digit string
 * the port number input expects. Always returns a string so `<input type="number">`
 * can display the saved value.
 */
export function serialPortToFormValue(
  serialPort: string | number | null | undefined,
  fallback: string = DEFAULT_PORT_NUMBER,
): string {
  if (serialPort == null || serialPort === '') return fallback;
  const match = /(\d+)/.exec(String(serialPort).trim());
  return match?.[1] ?? fallback;
}

/** Persist the form's digit string as a Windows COM port name. */
export function formValueToSerialPort(port: string | number | null | undefined): `COM${number}` {
  return `COM${serialPortToFormValue(port)}` as `COM${number}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '--';
  const date = new Date(iso.replace(' ', 'T'));
  if (isNaN(date.getTime())) return '--';
  const day = date.getDate();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
