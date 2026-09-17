/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import type { SettingsRow } from '@weight/shared/types/index';
import {
  HistoryIcon,
  LayoutDashboard,
  Loader2,
  RefreshCcwIcon,
  Settings2,
  SignalHighIcon,
  SignalLowIcon,
  SignalMediumIcon,
  Weight,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { AppFooter } from '@/components/app-footer';
import { AppTour, useAppTour } from '@/components/app-tour';
import { HelpSidebarSection } from '@/components/help-sidebar-section';
import { WmsLogo } from '@/components/wms-logo';
import { NotFound } from '@/components/not-found';
import { type Theme, useTheme } from '@/components/providers/theme-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SoftwareUpdateBanner } from '@/components/software-update-banner';
import { useAppUpdates } from '@/hooks/use-app-updates';
import { useWeightUpdates } from '@/hooks/use-weight-updates';
import { glassSurfaceClassName } from '@/lib/glass-surface';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';
import { useWeightStore } from '@/store/weightStore';

const sidebarRoutes = [
  {
    icon: LayoutDashboard,
    link: '/',
    label: 'Dashboard',
  },
  {
    icon: Weight,
    link: '/record-weight',
    label: 'Record Weight',
  },
  {
    icon: HistoryIcon,
    link: '/history',
    label: 'History',
  },
  {
    icon: Settings2,
    link: '/settings',
    label: 'Settings',
  },
] as const;

function isRouteActive(link: string, currentPath: string) {
  if (link === '/') {
    return currentPath === '/' || currentPath === '/_protected/';
  }

  return currentPath === link || currentPath.startsWith(`${link}/`);
}

function useIsNavigating() {
  return useRouterState({
    select: (state) =>
      state.isLoading ||
      state.isTransitioning ||
      state.matches.some((match) => match.status === 'pending'),
  });
}

export const Route = createFileRoute('/_protected')({
  component: RouteComponent,
  beforeLoad: async () => {
    // If running in browser (not electron), skip setup check
    if (typeof window === 'undefined' || !window.electronAPI?.isSetupCompleted) {
      return;
    }

    const [setupCompleted, licenseStatus, authStatus] = await Promise.all([
      window.electronAPI.isSetupCompleted(),
      window.electronAPI.getLicenseStatus(),
      window.electronAPI.getAuthStatus(),
    ]);

    // Need wizard when setup unfinished, or when unlock is no longer valid
    // (expired license / different motherboard after hardware change).
    if (!setupCompleted || !licenseStatus.activated) {
      window.electronAPI.log(
        'info',
        !setupCompleted
          ? 'Setup not completed — opening setup wizard'
          : 'License not active — opening setup wizard for unlock',
      );

      throw redirect({
        to: '/setup-wizard',
      });
    }

    if (authStatus.passwordMode === 'required' && !authStatus.sessionUnlocked) {
      window.electronAPI.log('info', 'Password required — opening app lock');
      throw redirect({
        to: '/app-lock',
      });
    }
  },
  notFoundComponent: () => {
    return <NotFound />;
  },
});

function RouteComponent() {
  useWeightUpdates(); // start listening to weight/serial updates
  useAppUpdates(); // start listening to software updates

  const { loadSettings, settings } = useSettingsStore();
  const { setTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function fetchSettings() {
      await loadSettings();
      if (cancelled) return;

      const nextTheme = useSettingsStore.getState().settings?.theme as Theme | undefined;
      if (nextTheme) setTheme(nextTheme);
    }

    void fetchSettings();
    return () => {
      cancelled = true;
    };
  }, [loadSettings, setTheme]);

  return (
    <SidebarProvider>
      <AppTour>
        <AppSidebar settings={settings} />

        <div className="min-w-0 w-full flex-1">
          <main className="min-w-0">
            <TopBar />
            <SoftwareUpdateBanner />
            <RouteContent />
          </main>
          <AppFooter />
        </div>
      </AppTour>
    </SidebarProvider>
  );
}

function RouteContent() {
  const isNavigating = useIsNavigating();
  const { open: tourOpen } = useAppTour();
  const showOverlay = isNavigating && !tourOpen;

  return (
    <div className="relative min-w-0">
      {showOverlay && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-40 h-0.5 overflow-hidden bg-muted"
          >
            <div className="h-full w-1/3 animate-pulse bg-primary shadow-[0_0_12px_2px] shadow-primary/50" />
          </div>
          <div
            aria-live="polite"
            className="absolute inset-0 z-30 flex items-start justify-center bg-background/35 pt-24 backdrop-blur-[1px]"
          >
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/85 px-4 py-3 shadow-lg backdrop-blur-md">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading page...</span>
            </div>
          </div>
        </>
      )}
      <div
        className={cn(
          'min-w-0 transition-opacity duration-200',
          showOverlay && 'pointer-events-none opacity-60',
        )}
      >
        <Outlet />
      </div>
    </div>
  );
}

function AppSidebar({ settings }: { settings: SettingsRow | null }) {
  const currentPath = useRouterState({ select: (state) => state.location.pathname });
  const isNavigating = useIsNavigating();
  const companyInitial = settings?.companyName?.trim()?.[0]?.toUpperCase() ?? '?';

  return (
    <Sidebar className="border-r border-sidebar-border/60">
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/45 bg-sky-400/15 shadow-[0_0_20px_-8px] shadow-sky-400/50">
            <WmsLogo className="size-6 text-sky-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-wide text-heading">WMWS</p>
            <p className="text-xs leading-snug text-muted-foreground whitespace-normal">
              Weight Management Work Station
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup data-tour="nav">
          <SidebarGroupLabel className="px-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {sidebarRoutes.map(({ icon: Icon, link, label }) => {
                const isActive = isRouteActive(link, currentPath);
                const isLoading = isNavigating && isActive;

                return (
                  <SidebarMenuItem key={link}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      size="lg"
                      className={cn(
                        'rounded-lg border border-transparent transition-all duration-200',
                        'hover:bg-black/10! dark:hover:bg-white/10!',
                        isActive &&
                        'border-sky-400/45 bg-sky-400/15 text-sky-400 shadow-[0_0_20px_-10px] shadow-sky-400/40 data-active:bg-sky-400/15 data-active:text-sky-400 hover:bg-sky-400/20 hover:text-sky-400',
                      )}
                    >
                      <Link to={link}>
                        <Icon className="size-4" />
                        <span>{label}</span>
                        {isLoading && (
                          <Loader2 className="ml-auto size-4 shrink-0 animate-spin opacity-80" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <HelpSidebarSection />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-2">
        <AlertDialog>
          <AlertDialogTrigger
            className={cn(
              'flex w-full max-w-full items-center gap-3 rounded-xl border border-sidebar-border/60',
              'bg-sidebar-accent/40 p-2.5 text-left transition-colors',
              'hover:border-heading/25 hover:bg-sidebar-accent/70',
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-heading/30 bg-heading/10 text-sm font-bold capitalize text-heading shadow-[0_0_16px_-8px] shadow-heading/50">
              {companyInitial}
            </span>

            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="block truncate text-sm font-medium capitalize">
                {settings?.companyName?.trim() || 'Company'}
              </span>
              <p className="truncate text-xs text-heading/80">
                {settings?.companyEmail?.trim() || 'View company details'}
              </p>
            </div>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogCancel className="absolute top-3 right-3">
                <X />
              </AlertDialogCancel>
              <AlertDialogTitle>Company Details</AlertDialogTitle>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div>
                <span className="mb-1 block text-sm font-semibold">Name</span>
                <span className="capitalize">
                  {settings?.companyName?.trim() ? (
                    settings.companyName
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </span>
              </div>
              <hr />
              <div>
                <span className="mb-1 block text-sm font-semibold">Email</span>
                <span>
                  {settings?.companyEmail?.trim() ? (
                    settings.companyEmail
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </span>
              </div>
              <hr />
              <div>
                <span className="mb-1 block text-sm font-semibold">Phone</span>
                <span>
                  {settings?.companyPhone?.trim() ? (
                    settings.companyPhone
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </span>
              </div>
              <hr />
              <div>
                <span className="mb-1 block text-sm font-semibold">Address</span>
                <span>
                  {settings?.companyAddress?.trim() ? (
                    settings.companyAddress
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </span>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogAction asChild>
                <Link to="/settings" search={{ tab: 'company' }}>
                  Update Information
                </Link>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarFooter>
    </Sidebar>
  );
}

function TopBar() {
  const { serialStatus, latestReading } = useWeightStore();
  const { settings } = useSettingsStore();

  const signalRed =
    serialStatus === 'disconnected' ||
    serialStatus === 'error' ||
    serialStatus === 'idle' ||
    !latestReading;

  const signalYellow = serialStatus === 'connecting' || serialStatus === 'reconnecting';
  const signalLoading = serialStatus === 'reconnecting' || serialStatus === 'connecting';

  async function handleReconnect() {
    try {
      window.electronAPI.reconnectPort();
    } catch (error) {
      toast.error((error as Error).message);
      logger('error', (error as Error).message);
    }
  }

  const SignalIcon = signalRed ? SignalLowIcon : signalYellow ? SignalMediumIcon : SignalHighIcon;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 px-3 py-3">
      <nav
        className={cn(glassSurfaceClassName, 'flex items-center justify-between gap-3 px-3 py-2.5')}
      >
        <section className="relative z-10 flex items-center gap-3">
          <SidebarTrigger />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">
              System
            </p>
            <p className="truncate text-sm font-semibold tracking-wide text-heading">Weight Management</p>
          </div>
        </section>

        <section
          data-tour="serial-status"
          className="relative z-10 flex flex-wrap items-center justify-end gap-2"
        >
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/30 px-2.5 py-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-lg border transition-colors',
                    signalRed &&
                    'border-destructive/30 bg-destructive/10 shadow-[0_0_12px_-6px] shadow-destructive/50',
                    signalYellow &&
                    'border-yellow-500/30 bg-yellow-500/10 shadow-[0_0_12px_-6px] shadow-yellow-500/40',
                    !signalRed &&
                    !signalYellow &&
                    'border-green-500/30 bg-green-500/10 shadow-[0_0_12px_-6px] shadow-green-500/40',
                  )}
                >
                  <SignalIcon
                    className={cn(
                      'size-4',
                      signalRed && 'text-red-700 dark:text-red-400',
                      signalYellow && 'text-yellow-700 dark:text-yellow-400',
                      !signalRed && !signalYellow && 'text-green-700 dark:text-green-400',
                    )}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <span>
                  {signalRed
                    ? 'Connection lost or unstable. Please check the device connection or go to settings and change the COM port.'
                    : signalYellow
                      ? 'Connecting to the device. Please wait...'
                      : 'Connected and receiving stable readings.'}
                </span>
              </TooltipContent>
            </Tooltip>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                Port
              </p>
              <p className="truncate text-sm font-medium">{settings?.serialPort ?? '--'}</p>
            </div>
          </div>

          <Badge
            variant={signalRed ? 'destructive' : 'outline'}
            className={cn(
              'h-7 rounded-lg px-2.5 capitalize',
              !signalRed &&
              'border-primary/20 bg-primary/10 text-primary shadow-[0_0_16px_-8px] shadow-primary/40',
            )}
          >
            {signalLoading && <Loader2 className="animate-spin" />}
            {serialStatus}
          </Badge>

          {signalRed && (
            <Button
              size="sm"
              className="h-7 shadow-[0_0_16px_-8px] shadow-primary/40"
              onClick={handleReconnect}
            >
              <RefreshCcwIcon className={cn("size-4", signalLoading && 'animate-spin')} /> {signalLoading ? 'Reconnecting...' : 'Reconnect'}
            </Button>
          )}
        </section>
      </nav>
    </header>
  );
}
