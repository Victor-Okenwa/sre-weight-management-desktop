import { Link } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatDaysRemaining } from '@/components/setup/license-expiry';
import { Button } from '@/components/ui/button';

/**
 * Fixed bottom-right CTA when the active license has ≤ 14 days remaining.
 * Replaces the old DB health debug control.
 */
export function LicenseExpiryNudge() {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!window.electronAPI?.getLicenseStatus) return;
      try {
        const status = await window.electronAPI.getLicenseStatus();
        if (cancelled) return;

        if (status.setupCompleted && status.isExpiringSoon && status.daysRemaining !== null) {
          setDaysRemaining(status.daysRemaining);
          setVisible(true);
          toast.warning(
            `License ${formatDaysRemaining(status.daysRemaining).toLowerCase()}. Renew before it expires.`,
            { duration: 8000 },
          );
        } else {
          setVisible(false);
        }
      } catch {
        // ignore
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        asChild
        className="bg-red-600 text-white shadow-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
      >
        <Link to="/renew-license">
          <AlertTriangle className="size-4" />
          Fix license · {formatDaysRemaining(daysRemaining)}
        </Link>
      </Button>
    </div>
  );
}
