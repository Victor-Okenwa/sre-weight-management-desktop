import { useFormContext, useWatch } from 'react-hook-form';
import { formValueToSerialPort } from '@/lib/utils';
import { formatLicenseExpiry } from './license-expiry';

type ReviewFormValues = {
  softwareUnlock: {
    activated: boolean;
    expiresAt: string;
  };
  security: {
    mode: 'none' | 'required';
  };
  companyDetails: {
    name: string;
    phone?: string;
    email?: string;
  };
  hardware: {
    port: string;
    baudRate: string;
    indicator: string;
    stableTolerance: number;
    stableDurationMs: number;
  };
  preferences: {
    defaultUnit: string;
    theme: string;
    ticketPrefix: string;
  };
};

export function ReviewStep() {
  const { control } = useFormContext<ReviewFormValues>();
  const values = useWatch({ control });

  const unlocked = Boolean(values.softwareUnlock?.activated);
  const expiresLabel = formatLicenseExpiry(values.softwareUnlock?.expiresAt);
  const port = values.hardware?.port;
  const securityLabel =
    values.security?.mode === 'required' ? 'Password protected' : 'Passwordless';

  return (
    <div className="space-y-6">
      <hgroup>
        <h2 className="text-2xl font-bold tracking-tight">Review</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Confirm everything looks right. You can change these later in Settings.
        </p>
      </hgroup>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border/70 bg-background/50 p-4">
          <h3 className="mb-3 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            License
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">{unlocked ? 'Unlocked' : 'Not activated'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Expires</dt>
              <dd className="font-medium text-right">{expiresLabel || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border/70 bg-background/50 p-4">
          <h3 className="mb-3 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Security
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Access</dt>
              <dd className="font-medium text-right">{securityLabel}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border/70 bg-background/50 p-4">
          <h3 className="mb-3 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Company
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium text-right">
                {values.companyDetails?.name?.trim() || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium text-right">
                {values.companyDetails?.phone?.trim() || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium text-right break-all">
                {values.companyDetails?.email?.trim() || '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border/70 bg-background/50 p-4">
          <h3 className="mb-3 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Hardware
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Port</dt>
              <dd className="font-medium font-mono">{port ? formValueToSerialPort(port) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Baud</dt>
              <dd className="font-medium">{values.hardware?.baudRate || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Indicator</dt>
              <dd className="font-medium capitalize">{values.hardware?.indicator || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Stable tolerance</dt>
              <dd className="font-medium">
                {values.hardware?.stableTolerance != null
                  ? `${values.hardware.stableTolerance} kg`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Stability duration</dt>
              <dd className="font-medium">
                {values.hardware?.stableDurationMs != null
                  ? `${values.hardware.stableDurationMs} ms`
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border/70 bg-background/50 p-4 md:col-span-2">
          <h3 className="mb-3 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Preferences
          </h3>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Unit</dt>
              <dd className="font-medium">{values.preferences?.defaultUnit}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Theme</dt>
              <dd className="font-medium capitalize">{values.preferences?.theme}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Ticket prefix</dt>
              <dd className="font-medium font-mono">{values.preferences?.ticketPrefix}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
