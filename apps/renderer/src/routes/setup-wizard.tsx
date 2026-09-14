/* eslint-disable react-refresh/only-export-components */
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import type { BaudRate, DataBits, SerialPortInfo, StopBits } from '@weight/shared/types/index';
import { ArrowLeft, ArrowRight, Check, KeyRound, Settings2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, useWatch, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { CompanyDetailsStep } from '@/components/setup/company-details-step';
import { HardwareStep } from '@/components/setup/hardware-step';
import { PreferencesStep } from '@/components/setup/preferences-step';
import { ReviewStep } from '@/components/setup/review-step';
import { SecurityStep } from '@/components/setup/security-step';
import { SoftwareUnlockStep } from '@/components/setup/software-unlock-step';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { cn, formValueToSerialPort, getTicketPrefix, serialPortToFormValue } from '@/lib/utils';

export const Route = createFileRoute('/setup-wizard')({
  component: RouteComponent,
});

// ======================================================
// SCHEMA
// ======================================================

export const companyDetailsSchema = z.object({
  name: z.string().min(1, 'Company name is required').trim(),
  email: z.string().email('Invalid email address').trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?[0-9]*$/, 'Phone number can only contain + and numbers')
    .optional()
    .or(z.literal('')),
});

export type CompanyDetails = z.infer<typeof companyDetailsSchema>;

export const hardwareSchema = z.object({
  port: z
    .string({ message: 'Field is required' })
    .regex(/^\d+$/, 'Port should only contain numbers'),
  baudRate: z.string().min(1, 'Baud rate is required'),
  parity: z.enum(['none', 'even', 'odd', 'mark', 'space']),
  flowControl: z.enum(['none', 'xon/xoff', 'hardware']),
  stopBits: z.union([z.literal(1), z.literal(2)], {
    message: 'Stop bits must be 1 or 2',
  }),
  dataBits: z.union([z.literal(5), z.literal(6), z.literal(7), z.literal(8)], {
    message: 'Data bits must be 5, 6, 7, or 8',
  }),
  autoOpen: z.boolean(),
  indicator: z.string().min(1, 'Indicator is required'),
  stableTolerance: z
    .number({ message: 'Tolerance is required' })
    .min(0, 'Tolerance cannot be negative')
    .max(100, 'Tolerance is too large'),
  stableDurationMs: z
    .number({ message: 'Duration is required' })
    .int('Duration must be a whole number')
    .min(100, 'Duration must be at least 100 ms')
    .max(60_000, 'Duration must be at most 60 seconds'),
});

export type Hardware = z.infer<typeof hardwareSchema>;

export const preferencesSchema = z.object({
  defaultUnit: z.literal('kg'),
  theme: z.enum(['light', 'dark', 'system']),
  ticketPrefix: z
    .string()
    .min(1, 'Ticket prefix is required')
    .max(3, 'You cannot go beyond 3 letters'),
  ticketFooter: z.string().trim().min(1, 'Ticket footer is required'),
});

export type Preferences = z.infer<typeof preferencesSchema>;

const licenseJsonSchema = z
  .string()
  .min(1, 'License is required')
  .superRefine((value, ctx) => {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      for (const key of ['machineId', 'issuedAt', 'expiresAt', 'signature'] as const) {
        if (typeof parsed[key] !== 'string' || parsed[key].length === 0) {
          ctx.addIssue({
            code: 'custom',
            message: `License must include a non-empty "${key}" field`,
          });
        }
      }
    } catch {
      ctx.addIssue({ code: 'custom', message: 'License must be valid JSON' });
    }
  });

export const softwareUnlockSchema = z.object({
  licenseJson: licenseJsonSchema,
  activated: z.boolean().refine((value) => value === true, {
    message: 'Activate the license to continue',
  }),
  expiresAt: z.string(),
});

export type SoftwareUnlock = z.infer<typeof softwareUnlockSchema>;

export const securitySchema = z
  .object({
    mode: z.enum(['none', 'required']),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.mode !== 'required') return;
    if (value.password.length < 6) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Password must be at least 6 characters',
      });
    }
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

export type Security = z.infer<typeof securitySchema>;

export const formSchema = z.object({
  softwareUnlock: softwareUnlockSchema,
  security: securitySchema,
  companyDetails: companyDetailsSchema,
  hardware: hardwareSchema,
  preferences: preferencesSchema,
});

type FormSchemaType = z.infer<typeof formSchema>;

// ======================================================
// STEPS
// ======================================================

const steps = [
  {
    value: 'softwareUnlock',
    title: 'Unlock',
    description: 'Activate this PC',
    fields: ['softwareUnlock.licenseJson', 'softwareUnlock.activated'] as const,
  },
  {
    value: 'security',
    title: 'Security',
    description: 'App password',
    fields: ['security.mode', 'security.password', 'security.confirmPassword'] as const,
  },
  {
    value: 'companyDetails',
    title: 'Company',
    description: 'Station identity',
    fields: [
      'companyDetails.name',
      'companyDetails.address',
      'companyDetails.phone',
      'companyDetails.email',
    ] as const,
  },
  {
    value: 'hardware',
    title: 'Hardware',
    description: 'Scale link',
    fields: [
      'hardware.port',
      'hardware.baudRate',
      'hardware.parity',
      'hardware.flowControl',
      'hardware.stopBits',
      'hardware.dataBits',
      'hardware.autoOpen',
      'hardware.indicator',
      'hardware.stableTolerance',
      'hardware.stableDurationMs',
    ] as const,
  },
  {
    value: 'preferences',
    title: 'Preferences',
    description: 'Units & tickets',
    fields: [
      'preferences.defaultUnit',
      'preferences.theme',
      'preferences.ticketPrefix',
      'preferences.ticketFooter',
    ] as const,
  },
  {
    value: 'overview',
    title: 'Review',
    description: 'Confirm & finish',
    fields: [] as const,
  },
] as const;

function RouteComponent() {
  const [stepIndex, setStepIndex] = useState(0);
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const router = useRouter();
  const currentStep = steps[stepIndex];

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema) as Resolver<FormSchemaType>,
    defaultValues: {
      softwareUnlock: {
        licenseJson: '',
        activated: false,
        expiresAt: '',
      },
      security: {
        mode: 'none',
        password: '',
        confirmPassword: '',
      },
      companyDetails: {
        name: '',
        address: '',
        phone: '',
        email: '',
      },
      hardware: {
        port: '3',
        baudRate: '2400',
        parity: 'none',
        flowControl: 'none',
        stopBits: 1,
        dataBits: 8,
        autoOpen: false,
        indicator: '',
        stableTolerance: 0.5,
        stableDurationMs: 3000,
      },
      preferences: {
        defaultUnit: 'kg',
        theme: 'light',
        ticketPrefix: 'SRE',
        ticketFooter: 'thank you for your custom',
      },
    },
  });

  const unlockActivated = useWatch({
    control: form.control,
    name: 'softwareUnlock.activated',
  });
  const unlockExpiresAt = useWatch({
    control: form.control,
    name: 'softwareUnlock.expiresAt',
  });

  useEffect(() => {
    async function fetchPorts() {
      const listed = await window.electronAPI.listSerialPorts();
      setPorts(listed);
    }

    void fetchPorts();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateWizard() {
      if (!window.electronAPI) {
        setHydrated(true);
        return;
      }

      try {
        const [settings, licenseStatus] = await Promise.all([
          window.electronAPI.getAllSettings(),
          window.electronAPI.getLicenseStatus(),
        ]);

        if (cancelled) return;

        if (licenseStatus.setupCompleted && licenseStatus.activated) {
          await router.navigate({ to: '/' });
          return;
        }

        const defaultUnit = 'kg' as const;
        const theme =
          settings?.theme === 'light' || settings?.theme === 'dark' || settings?.theme === 'system'
            ? settings.theme
            : 'light';
        const parity = settings?.parity;
        const flowControl = settings?.flowControl;
        const passwordMode = licenseStatus.passwordMode;

        form.reset({
          softwareUnlock: {
            licenseJson: licenseStatus.licenseJson ?? '',
            activated: licenseStatus.activated,
            expiresAt: licenseStatus.expiresAt ?? '',
          },
          security: {
            mode: passwordMode === 'required' ? 'required' : 'none',
            password: '',
            confirmPassword: '',
          },
          companyDetails: {
            name: settings?.companyName ?? '',
            address: settings?.companyAddress ?? '',
            phone: settings?.companyPhone ?? '',
            email: settings?.companyEmail ?? '',
          },
          hardware: {
            port: serialPortToFormValue(settings?.serialPort),
            baudRate: String(settings?.baudRate ?? 2400),
            parity:
              parity === 'none' ||
              parity === 'even' ||
              parity === 'odd' ||
              parity === 'mark' ||
              parity === 'space'
                ? parity
                : 'none',
            flowControl:
              flowControl === 'none' || flowControl === 'xon/xoff' || flowControl === 'hardware'
                ? flowControl
                : 'none',
            stopBits: settings?.stopBits === 2 ? 2 : 1,
            dataBits: ([5, 6, 7, 8] as const).includes(settings?.dataBits as 5 | 6 | 7 | 8)
              ? (settings?.dataBits as 5 | 6 | 7 | 8)
              : 8,
            autoOpen: settings?.autoOpen ?? false,
            indicator: settings?.indicatorType ?? '',
            stableTolerance: settings?.stableTolerance ?? 0.5,
            stableDurationMs: settings?.stableDurationMs ?? 3000,
          },
          preferences: {
            defaultUnit,
            theme,
            ticketPrefix: settings?.ticketPrefix || 'SRE',
            ticketFooter: settings?.ticketFooter || 'thank you for your custom',
          },
        });

        if (licenseStatus.activated && passwordMode) {
          // Unlock + security already done — resume at Company
          setStepIndex(2);
        } else if (licenseStatus.activated) {
          // Unlock done — land on Security
          setStepIndex(1);
        }
      } catch (error) {
        logger('error', (error as Error).message);
        toast.error('Could not load saved station details');
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void hydrateWizard();
    return () => {
      cancelled = true;
    };
  }, [form, router]);

  async function persistSecurityChoice(): Promise<boolean> {
    const security = form.getValues('security');
    try {
      if (security.mode === 'none') {
        const result = await window.electronAPI.setPasswordless();
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        return true;
      }

      const result = await window.electronAPI.setPassword(security.password);
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      return true;
    } catch (error) {
      logger('error', (error as Error).message);
      toast.error('Could not save security settings');
      return false;
    }
  }

  async function handleNext() {
    const isValid = await form.trigger(currentStep.fields);

    if (!isValid) {
      if (currentStep.value === 'softwareUnlock') {
        toast.info('Activate a valid license before continuing');
      } else if (currentStep.value === 'security') {
        toast.info('Choose passwordless or set a password to continue');
      } else {
        toast.info('Please complete all required fields');
      }
      return;
    }

    if (currentStep.value === 'security') {
      const saved = await persistSecurityChoice();
      if (!saved) return;
    }

    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
    }
  }

  function handlePrev() {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  }

  async function onSubmit(data: FormSchemaType) {
    try {
      const existing = await window.electronAPI.getAllSettings();
      const prefix = data.preferences.ticketPrefix || getTicketPrefix(data.companyDetails.name);

      await window.electronAPI.updateSettings({
        companyName: data.companyDetails.name.toLowerCase(),
        companyAddress: data.companyDetails.address ?? '',
        companyPhone: data.companyDetails.phone ?? '',
        companyEmail: data.companyDetails.email ?? '',
        companyLogoPath: existing?.companyLogoPath ?? '',
        ticketPrefix: prefix,
        ticketFooter: data.preferences.ticketFooter ?? 'Thank you for your custom',
        nextTicketNumber: existing?.nextTicketNumber ?? 1,
        serialPort: formValueToSerialPort(data.hardware.port),
        baudRate: Number(data.hardware.baudRate) as unknown as BaudRate,
        dataBits: data.hardware.dataBits as unknown as DataBits,
        parity: data.hardware.parity,
        stopBits: data.hardware.stopBits as unknown as StopBits,
        flowControl: data.hardware.flowControl,
        autoOpen: data.hardware.autoOpen,
        indicatorType: data.hardware.indicator,
        weightUnit: data.preferences.defaultUnit,
        stableTolerance: data.hardware.stableTolerance,
        stableDurationMs: data.hardware.stableDurationMs,
        theme: data.preferences.theme,
      });

      await window.electronAPI.completeSetup({});

      toast.success('Setup completed successfully');
      router.navigate({ to: '/' });
    } catch (error) {
      logger('error', (error as Error).message);
      toast.error('An error occurred while completing setup.');
    }
  }

  if (!hydrated) {
    return (
      <article className="flex min-h-[50vh] items-center justify-center px-4 py-10">
        <p className="text-muted-foreground text-sm">Loading station setup…</p>
      </article>
    );
  }

  return (
    <article className="px-4 py-10 md:py-12">
      <Card className="bg-background mx-auto max-w-6xl overflow-hidden border-border/70 shadow-sm">
        <div className="flex items-start gap-4 border-b border-border/60 px-6 py-6">
          <Badge className="size-12 shrink-0 rounded-md [&>svg]:size-7!">
            {currentStep.value === 'softwareUnlock' ? <KeyRound /> : <Settings2Icon />}
          </Badge>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-sky-600 dark:text-sky-400">
              First-time setup
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
              Configure your station
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Unlock this PC, choose security, then set company details, scale hardware, and ticket
              preferences.
            </p>
          </div>
        </div>

        <div className="px-4 pt-8 md:px-6">
          <div className="flex items-start justify-between gap-1 overflow-x-auto pb-1">
            {steps.map((step, index) => {
              const isCompleted = index < stepIndex;
              const isActive = index === stepIndex;

              return (
                <div key={step.value} className="flex min-w-0 flex-1 items-start">
                  <button
                    type="button"
                    onClick={() => {
                      if (index <= stepIndex) {
                        setStepIndex(index);
                      }
                    }}
                    className="group flex min-w-18 flex-col items-center text-center sm:min-w-0"
                  >
                    <div
                      className={cn(
                        'flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all md:size-10',
                        isCompleted && 'border-emerald-500 bg-emerald-500 text-white',
                        isActive &&
                          !isCompleted &&
                          'border-primary bg-primary text-primary-foreground',
                        !isCompleted &&
                          !isActive &&
                          'border-border bg-background text-muted-foreground',
                      )}
                    >
                      {isCompleted ? <Check className="size-4" /> : index + 1}
                    </div>

                    <div className="mt-2 px-0.5">
                      <p
                        className={cn(
                          'text-[11px] font-medium sm:text-xs md:text-sm',
                          isActive && 'text-primary',
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="text-muted-foreground mt-0.5 hidden text-[10px] leading-tight sm:block md:text-xs">
                        {step.description}
                      </p>
                    </div>
                  </button>

                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'mx-1 mt-4 h-px min-w-3 flex-1 md:mx-2',
                        index < stepIndex ? 'bg-emerald-500/70' : 'bg-border',
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 bg-accent/15 px-6 py-6">
            {currentStep.value !== 'softwareUnlock' && currentStep.value !== 'overview' && (
              <div className="mb-6 text-muted-foreground text-sm">
                <span className="text-destructive">*</span> Indicates required field
              </div>
            )}

            {currentStep.value === 'softwareUnlock' && (
              <SoftwareUnlockStep
                activated={Boolean(unlockActivated)}
                expiresAt={unlockExpiresAt ?? ''}
              />
            )}
            {currentStep.value === 'security' && <SecurityStep />}
            {currentStep.value === 'companyDetails' && <CompanyDetailsStep />}
            {currentStep.value === 'hardware' && <HardwareStep ports={ports} />}
            {currentStep.value === 'preferences' && <PreferencesStep />}
            {currentStep.value === 'overview' && <ReviewStep />}

            <div className="mt-12 flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                Step {stepIndex + 1} of {steps.length}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={stepIndex === 0}
                >
                  <ArrowLeft />
                  Previous
                </Button>

                {stepIndex < steps.length - 1 && (
                  <Button type="button" onClick={() => void handleNext()}>
                    Next
                    <ArrowRight />
                  </Button>
                )}

                {stepIndex === steps.length - 1 && <Button type="submit">Complete</Button>}
              </div>
            </div>
          </form>
        </FormProvider>
      </Card>
    </article>
  );
}
