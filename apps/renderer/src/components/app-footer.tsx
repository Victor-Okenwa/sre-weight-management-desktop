import { Link } from '@tanstack/react-router';
import type { LicenseStatus } from '@weight/shared/types/index';
import { useEffect, useState } from 'react';
import { formatDaysRemaining, formatLicenseDateShort } from '@/components/setup/license-expiry';
import { cn } from '@/lib/utils';
import { availableUpdateVersion, useUpdateStore } from '@/store/updateStore';

export function AppFooter() {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const version = useUpdateStore((s) => s.currentVersion);
  const updateStatus = useUpdateStore((s) => s.status);
  const availableVersion = availableUpdateVersion(updateStatus);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!window.electronAPI?.getLicenseStatus) return;
      try {
        const next = await window.electronAPI.getLicenseStatus();
        if (!cancelled) setStatus(next);
      } catch {
        // Footer stays usable without license details
      }
    }
    async function loadVersion() {
      if (!window.electronAPI?.getAppVersion) return;
      try {
        const next = await window.electronAPI.getAppVersion();
        if (!cancelled) useUpdateStore.getState().setCurrentVersion(next);
      } catch {
        // Optional version display
      }
    }
    void load();
    void loadVersion();
    return () => {
      cancelled = true;
    };
  }, []);

  const expiresShort = formatLicenseDateShort(status?.expiresAt);
  const daysLabel = formatDaysRemaining(status?.daysRemaining);

  return (
    <footer className="border-t bg-muted/20 px-3 py-1.5 h-40">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] leading-tight text-muted-foreground">
        <p className="min-w-0 truncate">
          <span className="text-foreground/80">Solution Road</span>
          {version ? (
            <span className="ml-2 inline-flex items-center rounded-md border border-border bg-background/70 px-2 py-0.5 font-mono text-foreground/80">
              v{version}
            </span>
          ) : null}
          {status?.machineId ? (
            <>
              <span className="mx-1.5 text-border">|</span>
              <span className="font-mono text-foreground/70">{status.machineId}</span>
            </>
          ) : null}
          {expiresShort ? (
            <>
              <span className="mx-1.5 text-border">|</span>
              Exp. {expiresShort}
            </>
          ) : null}
          {status?.activated ? (
            <span
              className={cn(
                'ml-1',
                status.isExpiringSoon
                  ? 'font-medium text-red-700 dark:text-red-400'
                  : 'text-muted-foreground/80',
              )}
            >
              · {daysLabel}
            </span>
          ) : null}
        </p>

        <nav className="flex shrink-0 items-center gap-3">
          <Link
            to="/software-update"
            className={cn(
              'transition-colors hover:underline',
              availableVersion
                ? 'font-medium text-amber-800 dark:text-amber-300'
                : 'text-foreground/70 hover:text-foreground',
            )}
          >
            {availableVersion ? `Update v${availableVersion}` : 'Software Update'}
          </Link>
          <Link
            to="/license"
            className="text-foreground/70 transition-colors hover:text-foreground hover:underline"
          >
            License
          </Link>
          <Link
            to="/renew-license"
            className={cn(
              'transition-colors hover:underline',
              status?.isExpiringSoon
                ? 'font-medium text-red-700 dark:text-red-400'
                : 'text-foreground/70 hover:text-foreground',
            )}
          >
            Renew
          </Link>
        </nav>
      </div>
    </footer>
  );
}
