import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { tourCollisionPadding, tourSteps } from '@/components/app-tour-steps';
import {
  Tour,
  TourArrow,
  TourClose,
  TourDescription,
  TourFooter,
  TourHeader,
  TourNext,
  TourPortal,
  TourPrev,
  TourSkip,
  TourSpotlight,
  TourSpotlightRing,
  TourStep,
  TourStepCounter,
  TourTitle,
} from '@/components/ui/tour';
import { useSidebar } from '@/components/ui/sidebar';
import { logger } from '@/lib/logger';

type AppTourContextValue = {
  open: boolean;
  startTour: () => void;
};

const AppTourContext = createContext<AppTourContextValue | null>(null);

export function useAppTour() {
  const context = useContext(AppTourContext);
  if (!context) {
    throw new Error('useAppTour must be used within AppTour');
  }
  return context;
}

async function persistTourCompleted() {
  if (!window.electronAPI?.completeTour) return;
  try {
    await window.electronAPI.completeTour();
  } catch (error) {
    logger('error', (error as Error).message);
  }
}

export function AppTour({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const searchTab = useRouterState({
    select: (state) => {
      const search = state.location.search as { tab?: string } | undefined;
      return search?.tab;
    },
  });
  const { setOpen: setSidebarOpen, setOpenMobile } = useSidebar();

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(0);
  const [session, setSession] = useState(0);
  const [targetEpoch, setTargetEpoch] = useState(0);
  const startTourRef = useRef<() => void>(() => {});

  const currentStep = tourSteps[value];

  const startTour = useCallback(() => {
    setValue(0);
    setSession((session) => session + 1);
    setOpen(true);
    setSidebarOpen(true);
    setOpenMobile(true);
    void navigate({ to: '/' });
  }, [navigate, setOpenMobile, setSidebarOpen]);

  startTourRef.current = startTour;

  useEffect(() => {
    let cancelled = false;

    async function maybeAutoStart() {
      if (!window.electronAPI?.isTourCompleted) return;
      try {
        const completed = await window.electronAPI.isTourCompleted();
        if (!cancelled && !completed) {
          startTourRef.current();
        }
      } catch (error) {
        logger('error', (error as Error).message);
      }
    }

    void maybeAutoStart();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open || !currentStep) return;

    if (currentStep.route === '/settings') {
      const tab = 'search' in currentStep && currentStep.search ? currentStep.search.tab : 'serial';
      if (pathname !== '/settings' || searchTab !== tab) {
        void navigate({ to: '/settings', search: { tab } });
      }
      return;
    }

    if (pathname !== currentStep.route) {
      void navigate({ to: currentStep.route });
    }
  }, [currentStep, navigate, open, pathname, searchTab]);

  useEffect(() => {
    if (!open || !currentStep) return;
    if (currentStep.id === 'nav' || currentStep.id === 'help') {
      setSidebarOpen(true);
      setOpenMobile(true);
    }
  }, [currentStep, open, setOpenMobile, setSidebarOpen]);

  useEffect(() => {
    if (!open || !currentStep) return;
    if (pathname !== currentStep.route) return;
    if ('search' in currentStep && currentStep.search && searchTab !== currentStep.search.tab) {
      return;
    }

    let cancelled = false;
    let intervalId: number | undefined;

    function revealWhenTargetExists() {
      if (cancelled) return false;
      if (!document.querySelector(currentStep.target)) return false;
      setTargetEpoch((epoch) => epoch + 1);
      return true;
    }

    if (revealWhenTargetExists()) return;

    intervalId = window.setInterval(() => {
      if (revealWhenTargetExists() && intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    }, 50);

    return () => {
      cancelled = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [currentStep, open, pathname, searchTab]);

  const contextValue = useMemo(
    () => ({
      open,
      startTour,
    }),
    [open, startTour],
  );

  return (
    <AppTourContext.Provider value={contextValue}>
      <Tour
        key={session}
        className="contents"
        data-tour-epoch={targetEpoch}
        open={open}
        defaultValue={0}
        dismissible={false}
        scrollOffset={{ top: 96, bottom: 96 }}
        onOpenChange={setOpen}
        onValueChange={setValue}
        onComplete={() => {
          void persistTourCompleted();
        }}
        onSkip={() => {
          void persistTourCompleted();
        }}
      >
        {children}

        <TourPortal>
          <TourSpotlight />
          <TourSpotlightRing />
          {tourSteps.map((step) => (
            <TourStep
              key={step.id}
              target={step.target}
              side={step.side}
              align={step.align}
              sticky="always"
              collisionPadding={tourCollisionPadding}
              hideWhenDetached
              className="z-60 max-h-[calc(100vh-2rem)] overflow-y-auto"
            >
              <TourHeader className="pr-8">
                <TourTitle>{step.title}</TourTitle>
                <TourClose />
              </TourHeader>
              <TourDescription>{step.body}</TourDescription>
              <TourFooter className="items-center sm:justify-between">
                <TourStepCounter />
                <div className="flex flex-wrap justify-end gap-2">
                  <TourSkip />
                  <TourPrev />
                  <TourNext />
                </div>
              </TourFooter>
              <TourArrow />
            </TourStep>
          ))}
        </TourPortal>
      </Tour>
    </AppTourContext.Provider>
  );
}
