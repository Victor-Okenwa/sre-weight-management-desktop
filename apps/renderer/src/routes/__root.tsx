import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { LicenseExpiryNudge } from '@/components/license-expiry-nudge';
import { RegistryTestPopover } from '@/components/registry-test-popover';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

export const Route = createRootRoute({
  component: () => {
    return (
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Outlet />
          <div className="fixed right-4 bottom-4 z-50 flex items-center gap-2">
            <RegistryTestPopover />
            <LicenseExpiryNudge />
          </div>
          <Toaster closeButton={true} duration={5000} position="top-center" richColors />
        </TooltipProvider>
      </ThemeProvider>
    );
  },
});
