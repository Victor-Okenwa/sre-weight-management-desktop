import { useMemo } from 'react';
import type { Vehicle } from '@weight/shared/types/index';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { VehicleCombobox } from '@/components/record-weight-shared/vehicle-combobox';
import { cn } from '@/lib/utils';

export function VehicleSelectionStep({
  tareSource,
  onTareSourceChange,
  vehicles,
  vehicleName,
  onVehicleChange,
}: {
  tareSource: string | undefined;
  onTareSourceChange: (val: 'existing' | 'new') => void;
  vehicles: Vehicle[];
  vehicleName: string;
  onVehicleChange: (val: string) => void;
}) {
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.name === vehicleName) ?? null,
    [vehicles, vehicleName],
  );

  return (
    <div className="space-y-6 py-4">
      <h3 className="text-lg font-semibold">Vehicle &amp; Tare Source</h3>

      <RadioGroup
        value={tareSource}
        onValueChange={onTareSourceChange}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Label
          className={cn(
            'flex cursor-pointer items-center gap-4 rounded-lg border-2 p-5 transition-all',
            tareSource === 'new' && 'border-heading/45 bg-heading/15 text-heading',
            tareSource !== 'new' && 'border-border hover:border-muted-foreground/30',
          )}
        >
          <RadioGroupItem value="new" className="sr-only" />
          <div>
            <p className="font-semibold">Record New Weight</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Capture a fresh tare reading</p>
          </div>
        </Label>

        <Label
          className={cn(
            'flex cursor-pointer items-center gap-4 rounded-lg border-2 p-5 transition-all',
            tareSource === 'existing' && 'border-heading/45 bg-heading/15 text-heading',
            tareSource !== 'existing' && 'border-border hover:border-muted-foreground/30',
          )}
        >
          <RadioGroupItem value="existing" className="sr-only" />
          <div>
            <p className="font-semibold">Use Existing Tare</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Select a vehicle with stored tare
            </p>
          </div>
        </Label>
      </RadioGroup>

      {tareSource === 'existing' && (
        <div className="space-y-3">
          <Label>Select Vehicle</Label>
          <VehicleCombobox
            vehicles={vehicles}
            value={vehicleName}
            onChange={onVehicleChange}
            allowNew={false}
          />
          {selectedVehicle?.tareWeight != null && (
            <p className="text-sm text-muted-foreground">
              Stored tare: <strong>{selectedVehicle.tareWeight}</strong>{' '}
              {selectedVehicle.tareUnit ?? 'kg'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
