import { zodResolver } from '@hookform/resolvers/zod';
import { BAUD_RATES, FLOW_CONTROL_OPTIONS, PARITY_FLAGS } from '@weight/shared/constants/index';
import type { BaudRate, DataBits, SerialPortInfo, SettingsRow } from '@weight/shared/types/index';
import { EthernetPortIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { FieldInfoTooltip, FieldLabelWithInfo, SerialConfigHint } from '@/components/serial-config-help';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldContent, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { logger } from '@/lib/logger';
import { formValueToSerialPort, serialPortToFormValue } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';
import { type Hardware, hardwareSchema } from '../routes/setup-wizard';

function hardwareDefaultsFromSettings(settings: SettingsRow | null): Hardware {
  return {
    port: serialPortToFormValue(settings?.serialPort),
    flowControl: settings?.flowControl || 'none',
    stopBits: (settings?.stopBits === 2 ? 2 : 1) as Hardware['stopBits'],
    baudRate: String(settings?.baudRate ?? 2400),
    parity: settings?.parity || 'none',
    dataBits: ([5, 6, 7, 8].includes(Number(settings?.dataBits))
      ? Number(settings?.dataBits)
      : 8) as Hardware['dataBits'],
    autoOpen: settings?.autoOpen ?? false,
    indicator: settings?.indicatorType?.toLowerCase() || '',
    stableTolerance: settings?.stableTolerance ?? 0.5,
    stableDurationMs: settings?.stableDurationMs ?? 3000,
  };
}

export function SerialConfigurationsTab() {
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const { settings } = useSettingsStore();
  const form = useForm<Hardware>({
    resolver: zodResolver(hardwareSchema) as Resolver<Hardware>,
    defaultValues: hardwareDefaultsFromSettings(settings),
  });

  useEffect(() => {
    if (!settings) return;
    form.reset(hardwareDefaultsFromSettings(settings));
  }, [form, settings]);

  useEffect(() => {
    async function fetchPorts() {
      const listed = await window.electronAPI.listSerialPorts();
      setPorts(listed);
    }

    void fetchPorts();
  }, []);

  async function onSubmit(data: Hardware) {
    try {
      await window.electronAPI.updateSettings({
        serialPort: formValueToSerialPort(data.port),
        baudRate: Number(data.baudRate) as unknown as BaudRate,
        parity: data.parity,
        flowControl: data.flowControl,
        stopBits: data.stopBits,
        dataBits: data.dataBits as DataBits,
        autoOpen: data.autoOpen,
        indicatorType: data.indicator,
        stableTolerance: data.stableTolerance,
        stableDurationMs: data.stableDurationMs,
      });

      toast.success('Updates are successful');
      location.reload();
    } catch (error) {
      toast.error((error as Error).message || 'Something went wrong');
      logger('error', (error as Error).message || 'Failed to update serial config');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Serial and Device Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 items-start gap-x-4 gap-y-5 md:grid-cols-2">
            <SerialConfigHint />

            <Controller
              name="port"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabelWithInfo
                    htmlFor="port"
                    info={
                      <>
                        <strong>How to locate Device Manager:</strong>
                        <ol>
                          <li>
                            Press <kbd>Windows</kbd> + <kbd>X</kbd> on your keyboard.
                          </li>
                          <li>
                            Select <span className="font-semibold">Device Manager</span> from the
                            menu.
                          </li>
                          <li>
                            In Device Manager, expand{' '}
                            <span className="font-semibold">
                              &quot;Ports (COM &amp; LPT)&quot;
                            </span>
                            .
                          </li>
                          <li>
                            Find your device and note the{' '}
                            <span className="font-semibold">COM#</span>.
                          </li>
                          <li>
                            Enter that number above (e.g. <span className="font-mono">3</span> for{' '}
                            <span className="font-mono">COM3</span>), or leave as 3 if unsure.
                          </li>
                        </ol>
                      </>
                    }
                  >
                    Port
                  </FieldLabelWithInfo>
                  <InputGroup className="min-h-12!">
                    <InputGroupInput
                      {...field}
                      value={field.value == null || field.value === '' ? '' : String(field.value)}
                      onChange={(e) => field.onChange(e.target.value)}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      id="port"
                      placeholder="3"
                    />
                    <InputGroupAddon>COM</InputGroupAddon>
                    <Popover>
                      <PopoverTrigger asChild>
                        <InputGroupButton type="button">
                          <EthernetPortIcon />
                        </InputGroupButton>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-4">
                        <h4 className="mb-2 text-md font-semibold">Available Ports</h4>
                        {ports && ports.length > 0 ? (
                          <ul className="grid gap-2">
                            {ports.map((port, idx) => (
                              <Button
                                type="button"
                                variant={
                                  serialPortToFormValue(port.path, '') === String(field.value ?? '')
                                    ? 'secondary'
                                    : 'outline'
                                }
                                key={port.path ?? idx}
                                className={`flex cursor-pointer justify-between gap-1 rounded-lg border p-2 text-left transition ${
                                  serialPortToFormValue(port.path, '') === String(field.value ?? '')
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border'
                                }`}
                                onClick={() => {
                                  form.setValue('port', serialPortToFormValue(port.path), {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }}
                              >
                                <span className="font-mono text-sm font-medium">{port.path}</span>
                                {port.manufacturer && (
                                  <span className="text-xs text-muted-foreground">
                                    {port.manufacturer}
                                  </span>
                                )}
                              </Button>
                            ))}
                          </ul>
                        ) : (
                          <span className="block p-2 text-sm text-muted-foreground">
                            No serial ports found.
                          </span>
                        )}
                      </PopoverContent>
                    </Popover>
                  </InputGroup>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="baudRate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field orientation="responsive" data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <FieldLabelWithInfo
                      htmlFor="baudRate"
                      info={
                        <span>
                          Set Baud Rate to <strong>2400</strong> if you are unsure.
                        </span>
                      }
                    >
                      Baud Rate
                    </FieldLabelWithInfo>
                  </FieldContent>
                  <Select
                    name={field.name}
                    value={String(field.value ?? '')}
                    onValueChange={(val) => field.onChange(String(val))}
                  >
                    <SelectTrigger
                      id="baudRate"
                      className="min-h-12"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent position="item-aligned">
                      {BAUD_RATES.map((rate) => (
                        <SelectItem key={rate} value={String(rate)}>
                          {rate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="parity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabelWithInfo
                    htmlFor="parity"
                    info={
                      <span>
                        Parity is a form of error checking used in serial communication to detect
                        accidental changes to raw data. For most modern weighing devices,{' '}
                        <strong>none</strong> is recommended unless your device specifically
                        requires even, odd, mark, or space parity. Selecting <strong>none</strong>{' '}
                        ensures simpler and more compatible communication.
                      </span>
                    }
                  >
                    Parity
                  </FieldLabelWithInfo>
                  <Select
                    name={field.name}
                    value={field.value}
                    defaultValue={settings?.parity}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="parity"
                      className="min-h-12 w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARITY_FLAGS.map((flag) => (
                        <SelectItem key={flag} value={flag}>
                          {flag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="flowControl"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabelWithInfo
                    htmlFor="flowControl"
                    info={
                      <span>
                        Flow control manages how data is sent between your station and the weighing
                        device to prevent data loss or overflow. In most cases, especially for
                        standard weighing devices, <strong>none</strong> is recommended. Use other
                        options only if your device documentation requires them.
                      </span>
                    }
                  >
                    Flow Control
                  </FieldLabelWithInfo>
                  <Select
                    name={field.name}
                    value={field.value}
                    defaultValue={settings?.flowControl}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="flowControl"
                      className="min-h-12 w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {FLOW_CONTROL_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="stopBits"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabelWithInfo
                    htmlFor="stopBits"
                    info={
                      <span>
                        Stop bits define the end of a byte in serial communication. For most
                        devices, <strong>1</strong> stop bit is standard and recommended. Only
                        choose <strong>2</strong> stop bits if your hardware documentation
                        specifically requires it.
                      </span>
                    }
                  >
                    Stop Bits
                  </FieldLabelWithInfo>
                  <Select
                    name={field.name}
                    value={String(field.value)}
                    onValueChange={(val) => field.onChange(Number(val))}
                    defaultValue={String(settings?.stopBits)}
                  >
                    <SelectTrigger
                      id="stopBits"
                      className="min-h-12 w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2].map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="dataBits"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabelWithInfo
                    htmlFor="dataBits"
                    info={
                      <span>
                        Set the number of data bits per character. Common values are 7 or 8, but
                        check your device specifications for the correct setting. We recommend{' '}
                        <strong>8</strong> as most indicators are compatible with it.
                      </span>
                    }
                  >
                    Data Bits
                  </FieldLabelWithInfo>
                  <Select
                    name={field.name}
                    value={String(field.value)}
                    onValueChange={(val) => field.onChange(Number(val))}
                    defaultValue={String(settings?.dataBits)}
                  >
                    <SelectTrigger
                      id="dataBits"
                      className="min-h-12 w-full"
                      aria-invalid={fieldState?.invalid}
                    >
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 6, 7, 8].map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="autoOpen"
              control={form.control}
              defaultValue={settings?.autoOpen}
              render={({ field }) => (
                <Field>
                  <div className="inline-flex items-center gap-2">
                    <label htmlFor="autoOpen" className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border"
                        id="autoOpen"
                      />
                      <span>Auto Open Connection</span>
                    </label>
                    <FieldInfoTooltip
                      info={
                        <span>
                          Automatically open and connect to the device when the application starts.
                          We recommend leaving this unchecked unless you want the connection to be
                          established on startup.
                        </span>
                      }
                    />
                  </div>
                </Field>
              )}
            />

            <Controller
              name="indicator"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabelWithInfo
                    htmlFor="indicator"
                    info={
                      <span>
                        Choose the type of indicator your hardware uses. We recommend selecting{' '}
                        <strong>D300</strong> unless you have been provided a different option.
                      </span>
                    }
                  >
                    Indicator
                  </FieldLabelWithInfo>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    defaultValue={settings?.indicatorType.toLowerCase()}
                  >
                    <SelectTrigger
                      id="indicator"
                      className="min-h-12"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select indicator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="d300">D300</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="stableTolerance"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabelWithInfo
                    htmlFor="stableTolerance"
                    info={
                      <span>
                        How much the live weight may vary (in kg) and still count as settled.
                        Default is <strong>0.5</strong>.
                      </span>
                    }
                  >
                    Stable Tolerance (kg)
                  </FieldLabelWithInfo>
                  <Input
                    {...field}
                    id="stableTolerance"
                    type="number"
                    step="0.1"
                    min={0}
                    className="min-h-12"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="stableDurationMs"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabelWithInfo
                    htmlFor="stableDurationMs"
                    info={
                      <span>
                        How long the weight must stay within tolerance before capture is allowed.
                        Default is <strong>3000</strong> ms (3 seconds).
                      </span>
                    }
                  >
                    Stability Duration (ms)
                  </FieldLabelWithInfo>
                  <Input
                    {...field}
                    id="stableDurationMs"
                    type="number"
                    step="100"
                    min={100}
                    className="min-h-12"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    aria-invalid={fieldState.invalid}
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
                'Update Configurations'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
