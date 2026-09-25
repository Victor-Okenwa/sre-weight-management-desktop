import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { LicenseExpiryNudge } from '@/components/license-expiry-nudge';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

export const Route = createRootRoute({
  component: () => {
    return (
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Outlet />
          <LicenseExpiryNudge />
          <Toaster closeButton={true} duration={5000} position="top-center" richColors />
        </TooltipProvider>
      </ThemeProvider>
    );
  },
});
