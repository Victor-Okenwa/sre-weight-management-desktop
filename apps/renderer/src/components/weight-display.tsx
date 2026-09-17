import { HardDriveIcon } from 'lucide-react';
import { glassSurfaceClassName } from '@/lib/glass-surface';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';
import { useWeightStore } from '@/store/weightStore';
import { Spinner } from './ui/spinner';

const ledGlowStyle = {
  textShadow: `
    0 0 8px #ff1744,
    0 0 20px #ff1744,
    0 0 36px #ff1744,
    0 0 60px #ff1744,
    0 0 4px #fff1,
    0 0 1px #fff4
  `,
};

const panelSectionClassName =
  'relative z-10 border-border/50 bg-muted/60 px-3 backdrop-blur-sm shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--foreground)_8%,transparent)]';

export function WeightDisplay() {
  const { latestReading, serialStatus } = useWeightStore();
  const { settings } = useSettingsStore();

  const retrying = serialStatus === 'connecting' || serialStatus === 'reconnecting';

  const trafficRed =
    serialStatus === 'disconnected' ||
    serialStatus === 'error' ||
    serialStatus === 'idle' ||
    serialStatus === 'reconnecting';

  const trafficYellow =
    serialStatus === 'connecting' || serialStatus === 'reconnecting' || !latestReading?.isStable;

  const trafficGreen = serialStatus === 'connected' && latestReading?.isStable;

  return (
    <div
      className={cn(
        glassSurfaceClassName,
        'overflow-hidden shadow-[0_10px_40px_-12px_rgba(0,0,0,0.45),0_4px_12px_-4px_rgba(0,0,0,0.25)]',
      )}
    >
      <header
        data-tour="live-reading"
        className={cn(panelSectionClassName, 'flex items-center justify-between border-b py-2.5')}
      >
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Live Reading
        </p>

        <div className="flex items-center gap-2">
          {retrying && <Spinner className="size-4 text-primary" />}

          <div className="flex h-6 w-17 flex-row items-center justify-between rounded-full border border-border/70 bg-background/50 p-1 shadow-[0_2px_6px_rgba(0,0,0,0.18),inset_0_1px_2px_rgba(0,0,0,0.35)]">
            <span
              className={cn(
                'block size-4 rounded-full transition-all duration-200',
                trafficRed
                  ? 'bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.55),inset_0_-2px_4px_rgba(0,0,0,0.35)]'
                  : 'bg-red-800/40 opacity-60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]',
              )}
            />
            <span
              className={cn(
                'block size-4 rounded-full transition-all duration-200',
                trafficYellow
                  ? 'bg-yellow-300 shadow-[0_0_10px_2px_rgba(253,224,71,0.55),inset_0_-2px_4px_rgba(0,0,0,0.35)]'
                  : 'bg-yellow-700/40 opacity-60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]',
              )}
            />
            <span
              className={cn(
                'block size-4 rounded-full transition-all duration-200',
                trafficGreen
                  ? 'bg-green-500 shadow-[0_0_10px_2px_rgba(34,197,94,0.55),inset_0_-2px_4px_rgba(0,0,0,0.35)]'
                  : 'bg-green-800/40 opacity-60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]',
              )}
            />
          </div>
        </div>
      </header>

      <div className="relative bg-muted/25 px-3 py-3 shadow-[inset_0_6px_18px_rgba(0,0,0,0.22)]">
        <div
          className={cn(
            'relative min-h-52 overflow-hidden rounded-lg border border-black/50 bg-black px-3 py-5',
            'shadow-[inset_0_6px_28px_rgba(0,0,0,0.92),inset_0_-1px_0_rgba(255,255,255,0.06),0_3px_8px_rgba(0,0,0,0.35)]',
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-lg bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.35)_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[100%_3px] opacity-25"
          />

          <div
            aria-hidden
            className="font-classic absolute inset-0 flex select-none items-center justify-end px-3 text-[4rem] text-red-800/25 tabular-nums"
          >
            888888
          </div>

          <div className="relative flex items-center justify-end">
            <div
              className="font-classic text-[4rem] text-red-600 tabular-nums"
              style={ledGlowStyle}
            >
              {latestReading?.weight ?? <span className="opacity-30">------</span>}
            </div>
          </div>
        </div>
      </div>

      <footer
        className={cn(
          panelSectionClassName,
          'flex items-center justify-between border-t py-2.5 text-sm',
        )}
      >
        <section className="flex min-w-0 items-center gap-2">
          <HardDriveIcon className="size-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Indicator
            </p>
            <p className="truncate font-medium uppercase text-foreground">
              {settings?.indicatorType ?? '--'}
            </p>
          </div>
        </section>

        <section className="text-right">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Unit</p>
          <p className="font-medium text-foreground">{settings?.weightUnit ?? '--'}</p>
        </section>
      </footer>
    </div>
  );
}
