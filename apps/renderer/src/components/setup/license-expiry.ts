/** Parse a license JSON string and return its expiresAt field when valid. */
export function parseLicenseExpiresAt(licenseJson: string): string | null {
  try {
    const parsed = JSON.parse(licenseJson) as Record<string, unknown>;
    if (typeof parsed.expiresAt === 'string' && parsed.expiresAt.trim().length > 0) {
      return parsed.expiresAt.trim();
    }
  } catch {
    // ignore invalid JSON while the user is still typing / pasting
  }
  return null;
}

const time24h: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  hourCycle: 'h23',
};

/** Human-readable license expiry, e.g. "Saturday, 18 July 2026, 14:30". */
export function formatLicenseExpiry(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...time24h,
  });
}

/** Compact date-time for footers, e.g. "18 Jul 2026 14:30". */
export function formatLicenseDateShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...time24h,
  });
}

export function formatDaysRemaining(days: number | null | undefined): string {
  if (days === null || days === undefined) return '—';
  if (days < 0) return 'Expired';
  if (days === 0) return 'Expires today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}
