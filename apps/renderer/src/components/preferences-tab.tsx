import { zodResolver } from '@hookform/resolvers/zod';
import { appearanceOptions } from '@weight/shared/constants/index';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import z from 'zod';
import { FieldLabelWithInfo } from '@/components/serial-config-help';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';
import { type Theme, useTheme } from './providers/theme-provider';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Field, FieldError } from './ui/field';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Spinner } from './ui/spinner';

const preferencesSchema = z.object({
  defaultUnit: z.literal('kg'),
  ticketPrefix: z
    .string()
    .min(1, 'Ticket prefix is required')
    .max(3, 'You cannot go beyond 3 letters'),
  ticketFooter: z.string().trim().min(1, 'Ticket footer is required'),
});

type Preferences = z.infer<typeof preferencesSchema>;

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

export function PreferencesTab() {
  const { settings } = useSettingsStore();
  const { setTheme } = useTheme();
  const [isThemeLoading, setIsThemeLoading] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<Theme | null>(null);

  const form = useForm<Preferences>({
    resolver: zodResolver(preferencesSchema) as Resolver<Preferences>,
    defaultValues: {
      defaultUnit: 'kg',
      ticketPrefix: settings?.ticketPrefix ?? 'SRE',
      ticketFooter: settings?.ticketFooter ?? 'Thank you for your custom.',
    },
  });

  async function handleThemeChange(theme: Theme) {
    setIsThemeLoading(true);
    setPendingTheme(theme);

    try {
      await window.electronAPI.updateSettings({
        theme,
      });

      toast.success('Theme updated');
      setTheme(theme);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to update theme');
    } finally {
      setIsThemeLoading(false);
      setPendingTheme(null);
    }
  }

  async function onSubmit(data: Preferences) {
    try {
      await window.electronAPI.updateSettings({
        weightUnit: data.defaultUnit,
        ticketPrefix: data.ticketPrefix,
        ticketFooter: data.ticketFooter,
      });

      toast.success('Preferences updated');
      location.reload();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to update preferences');
    }
  }

  return (
    <article className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how the application looks on this station.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {appearanceOptions.map((theme) => {
              const Icon = themeIcons[theme.value as keyof typeof themeIcons] ?? Monitor;
              const isActive = settings?.theme === theme.value.toLowerCase();
              const isPending = isThemeLoading && pendingTheme === theme.value;

              return (
                <Button
                  key={theme.value}
                  type="button"
                  disabled={isThemeLoading}
                  onClick={() => handleThemeChange(theme.value)}
                  variant="outline"
                  className={cn(
                    'h-auto flex-col items-start justify-start gap-2 px-4 py-4 text-left whitespace-normal',
                    isActive &&
                      'border-heading/45 bg-heading/15 text-heading ring-1 ring-heading/40 hover:bg-heading/20 hover:text-heading',
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    {isPending ? (
                      <Spinner className="size-4" />
                    ) : (
                      <Icon className="size-4 shrink-0" />
                    )}
                    <strong className="text-sm">{theme.label}</strong>
                  </div>
                  <p
                    className={cn(
                      'text-xs font-normal leading-relaxed',
                      isActive ? 'text-heading/80' : 'text-muted-foreground',
                    )}
                  >
                    {theme.description}
                  </p>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets & Units</CardTitle>
          <CardDescription>Defaults used when recording and printing tickets.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 items-start gap-x-4 gap-y-5 md:grid-cols-2">
              <Controller
                name="defaultUnit"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabelWithInfo
                      htmlFor="defaultUnit"
                      info={
                        <span>
                          Choose the default unit for weight measurements. Only{' '}
                          <strong>kg</strong> is supported for now.
                        </span>
                      }
                    >
                      Default Unit
                    </FieldLabelWithInfo>
                    <Select
                      name={field.name}
                      value={field.value}
                      defaultValue="kg"
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="defaultUnit"
                        className="min-h-12"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="ticketPrefix"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabelWithInfo
                      htmlFor="ticketPrefix"
                      info={
                        <span>
                          Short prefix used for ticket numbers, e.g. <strong>SRE</strong> becomes
                          SRE-0001. Maximum 3 characters.
                        </span>
                      }
                    >
                      Ticket Prefix
                    </FieldLabelWithInfo>
                    <Input
                      {...field}
                      id="ticketPrefix"
                      className="min-h-12 uppercase"
                      placeholder="SRE"
                      maxLength={3}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="ticketFooter"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field className="md:col-span-2" data-invalid={fieldState.invalid}>
                    <FieldLabelWithInfo
                      htmlFor="ticketFooter"
                      info={
                        <span>
                          Message printed at the bottom of each ticket. Keep it short and clear for
                          customers.
                        </span>
                      }
                    >
                      Ticket Footer
                    </FieldLabelWithInfo>
                    <Input
                      {...field}
                      id="ticketFooter"
                      className="min-h-12"
                      placeholder="Thank you for your custom"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="flex justify-end border-t border-border/60 pt-5">
              <Button
                type="submit"
                size="lg"
                disabled={form.formState.isSubmitting}
                className="min-w-44"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Spinner /> Updating...
                  </>
                ) : (
                  'Update Preferences'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </article>
  );
}
