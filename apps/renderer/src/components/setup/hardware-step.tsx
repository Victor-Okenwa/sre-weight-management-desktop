import { BAUD_RATES, FLOW_CONTROL_OPTIONS, PARITY_FLAGS } from '@weight/shared/constants/index';
import type { SerialPortInfo } from '@weight/shared/types/index';
import { EthernetPortIcon } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  FieldInfoTooltip,
  FieldLabelWithInfo,
  SerialConfigHint,
} from '@/components/serial-config-help';
import { Button } from '@/components/ui/button';
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
import { serialPortToFormValue } from '@/lib/utils';
import { RequiredLabel, requiredFields } from './required-label';

type HardwareFields = {
  hardware: {
    port: string;
    baudRate: string;
    parity: 'none' | 'even' | 'odd' | 'mark' | 'space';
    flowControl: 'none' | 'xon/xoff' | 'hardware';
    stopBits: number;
    dataBits: number;
    autoOpen: boolean;
    indicator: string;
    stableTolerance: number;
    stableDurationMs: number;
  };
};

type HardwareStepProps = {
  ports: SerialPortInfo[];
};

function label(path: keyof typeof requiredFields, text: string) {
  return requiredFields[path] ? <RequiredLabel>{text}</RequiredLabel> : text;
}

export function HardwareStep({ ports }: HardwareStepProps) {
  const { control, setValue } = useFormContext<HardwareFields>();

  function selectPort(path: string | undefined) {
    setValue('hardware.port', serialPortToFormValue(path), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-x-4 gap-y-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <hgroup>
          <h2 className="text-2xl font-bold tracking-tight">Hardware setup</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect the weighing indicator so live weight can be captured at this station.
          </p>
        </hgroup>
      </div>

      <SerialConfigHint />

      <Controller
        name="hardware.port"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabelWithInfo
              htmlFor="hardware-port"
              info={
                <>
                  <strong>How to locate Device Manager:</strong>
                  <ol>
                    <li>
                      Press <kbd>Windows</kbd> + <kbd>X</kbd> on your keyboard.
                    </li>
                    <li>
                      Select <span className="font-semibold">Device Manager</span> from the menu.
                    </li>
                    <li>
                      In Device Manager, expand{' '}
                      <span className="font-semibold">&quot;Ports (COM &amp; LPT)&quot;</span>.
                    </li>
                    <li>
                      Find your device and note the <span className="font-semibold">COM#</span>.
                    </li>
                    <li>
                      Enter that number above (e.g. <span className="font-mono">3</span> for{' '}
                      <span className="font-mono">COM3</span>), or leave as 3 if unsure.
                    </li>
                  </ol>
                </>
              }
            >
              {label('hardware.port', 'Port')}
            </FieldLabelWithInfo>
            <InputGroup className="min-h-12!">
              <InputGroupInput
                {...field}
                value={field.value == null || field.value === '' ? '' : String(field.value)}
                onChange={(e) => field.onChange(e.target.value)}
                type="number"
                inputMode="numeric"
                min={1}
                id="hardware-port"
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
                          onClick={() => selectPort(port.path)}
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
        name="hardware.baudRate"
        control={control}
        render={({ field, fieldState }) => (
          <Field orientation="responsive" data-invalid={fieldState.invalid}>
            <FieldContent>
              <FieldLabelWithInfo
                htmlFor="hardware-baudRate"
                info={
                  <span>
                    Set Baud Rate to <strong>2400</strong> if you are unsure.
                  </span>
                }
              >
                {label('hardware.baudRate', 'Baud Rate')}
              </FieldLabelWithInfo>
            </FieldContent>
            <Select
              name={field.name}
              value={field.value}
              defaultValue="2400"
              onValueChange={field.onChange}
            >
              <SelectTrigger
                id="hardware-baudRate"
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
        name="hardware.parity"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabelWithInfo
              htmlFor="hardware-parity"
              info={
                <span>
                  Parity is a form of error checking used in serial communication to detect
                  accidental changes to raw data. For most modern weighing devices,{' '}
                  <strong>none</strong> is recommended unless your device specifically requires
                  even, odd, mark, or space parity. Selecting <strong>none</strong> ensures simpler
                  and more compatible communication.
                </span>
              }
            >
              {label('hardware.parity', 'Parity')}
            </FieldLabelWithInfo>
            <Select
              name={field.name}
              value={field.value}
              defaultValue="none"
              onValueChange={field.onChange}
            >
              <SelectTrigger
                id="hardware-parity"
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
        name="hardware.flowControl"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabelWithInfo
              htmlFor="hardware-flowControl"
              info={
                <span>
                  Flow control manages how data is sent between your station and the weighing device
                  to prevent data loss or overflow. In most cases, especially for standard weighing
                  devices, <strong>none</strong> is recommended. Use other options only if your
                  device documentation requires them.
                </span>
              }
            >
              {label('hardware.flowControl', 'Flow Control')}
            </FieldLabelWithInfo>
            <Select
              name={field.name}
              value={field.value}
              defaultValue="none"
              onValueChange={field.onChange}
            >
              <SelectTrigger
                id="hardware-flowControl"
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
        name="hardware.stopBits"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabelWithInfo
              htmlFor="hardware-stopBits"
              info={
                <span>
                  Stop bits define the end of a byte in serial communication. For most devices,{' '}
                  <strong>1</strong> stop bit is standard and recommended. Only choose{' '}
                  <strong>2</strong> stop bits if your hardware documentation specifically requires
                  it.
                </span>
              }
            >
              {label('hardware.stopBits', 'Stop Bits')}
            </FieldLabelWithInfo>
            <Select
              name={field.name}
              value={String(field.value)}
              onValueChange={(val) => field.onChange(Number(val))}
              defaultValue="1"
            >
              <SelectTrigger
                id="hardware-stopBits"
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
        name="hardware.dataBits"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabelWithInfo
              htmlFor="hardware-dataBits"
              info={
                <span>
                  Set the number of data bits per character. Common values are 7 or 8, but check
                  your device specifications for the correct setting. We recommend <strong>8</strong>{' '}
                  as most indicators are compatible with it.
                </span>
              }
            >
              {label('hardware.dataBits', 'Data Bits')}
            </FieldLabelWithInfo>
            <Select
              name={field.name}
              value={String(field.value)}
              onValueChange={(val) => field.onChange(Number(val))}
              defaultValue="8"
            >
              <SelectTrigger
                id="hardware-dataBits"
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
        name="hardware.autoOpen"
        control={control}
        render={({ field }) => (
          <Field>
            <div className="inline-flex items-center gap-2">
              <label htmlFor="hardware-autoOpen" className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4 rounded border"
                  id="hardware-autoOpen"
                />
                <span>Auto Open Connection</span>
              </label>
              <FieldInfoTooltip
                info={
                  <span>
                    Automatically open and connect to the device when the application starts. We
                    recommend leaving this unchecked unless you want the connection to be
                    established on startup.
                  </span>
                }
              />
            </div>
          </Field>
        )}
      />

      <Controller
        name="hardware.indicator"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabelWithInfo
              htmlFor="hardware-indicator"
              info={
                <span>
                  Choose the type of indicator your hardware uses. We recommend selecting{' '}
                  <strong>D300</strong> unless you have been provided a different option.
                </span>
              }
            >
              {label('hardware.indicator', 'Indicator')}
            </FieldLabelWithInfo>
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              defaultValue="d300"
            >
              <SelectTrigger
                id="hardware-indicator"
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
        name="hardware.stableTolerance"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabelWithInfo
              htmlFor="hardware-stableTolerance"
              info={
                <span>
                  How much the live weight may vary (in kg) and still count as settled. Default is{' '}
                  <strong>0.5</strong>.
                </span>
              }
            >
              {label('hardware.stableTolerance', 'Stable Tolerance (kg)')}
            </FieldLabelWithInfo>
            <Input
              {...field}
              id="hardware-stableTolerance"
              type="number"
              step="0.1"
              min={0}
              className="min-h-12"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="hardware.stableDurationMs"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabelWithInfo
              htmlFor="hardware-stableDurationMs"
              info={
                <span>
                  How long the weight must stay within tolerance before capture is allowed. Default
                  is <strong>3000</strong> ms (3 seconds).
                </span>
              }
            >
              {label('hardware.stableDurationMs', 'Stability Duration (ms)')}
            </FieldLabelWithInfo>
            <Input
              {...field}
              id="hardware-stableDurationMs"
              type="number"
              step="100"
              min={100}
              className="min-h-12"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  );
}
