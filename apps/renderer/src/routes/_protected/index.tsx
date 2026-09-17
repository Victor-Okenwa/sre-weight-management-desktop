/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router';
import { CableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WeightDisplay } from '@/components/weight-display';
import { glassSurfaceClassName } from '@/lib/glass-surface';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';

export const Route = createFileRoute('/_protected/')({
  component: RouteComponent,
});

const connectionFields = [
  { label: 'Serial Port', key: 'serialPort' },
  { label: 'Baud Rate', key: 'baudRate' },
  { label: 'Parity', key: 'parity' },
  { label: 'Data Bits', key: 'dataBits' },
  { label: 'Stop Bits', key: 'stopBits' },
  { label: 'Flow Control', key: 'flowControl' },
] as const;

function RouteComponent() {
  const { settings } = useSettingsStore();

  return (
    <article className="space-y-5 px-4 py-5">
      <section>
        <WeightDisplay />
      </section>

      <section>
        <div className={cn(glassSurfaceClassName, 'overflow-hidden')}>
          <div className="relative z-10 flex items-center justify-between gap-3 border-b border-border/50 bg-muted/60 px-4 py-3 shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--foreground)_8%,transparent)]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-heading/30 bg-heading/10 shadow-[0_0_20px_-8px] shadow-heading/30">
                <CableIcon className="size-5 text-heading" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Hardware
                </p>
                <h3 className="truncate font-semibold tracking-wide">Connection Settings</h3>
              </div>
            </div>

            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/settings" search={{ tab: 'serial' }}>
                Configure
              </Link>
            </Button>
          </div>

          <div className="relative z-10 divide-y divide-border/40 p-2">
            {connectionFields.map(({ label, key }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted/25"
              >
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </span>
                <span className="font-medium text-foreground tabular-nums">
                  {settings?.[key] ?? '--'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
