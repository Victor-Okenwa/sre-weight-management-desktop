import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import type { Material, Vehicle } from '@weight/shared/types/index';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { VehicleCombobox } from './vehicle-combobox';
import { MaterialCombobox } from './material-combobox';
import type { NewWeightForm } from './schema';

export function FormFields({
  ticketId,
  control,
  vehicles,
  materials,
  vehicleValue,
  onVehicleChange,
  materialValue,
  onMaterialChange,
  disabled = false,
  vehicleAllowNew = true,
}: {
  ticketId: string;
  control: Control<NewWeightForm>;
  vehicles: Vehicle[];
  materials: Material[];
  vehicleValue: string;
  onVehicleChange: (val: string) => void;
  materialValue: string;
  onMaterialChange: (val: string) => void;
  disabled?: boolean;
  vehicleAllowNew?: boolean;
}) {
  return (
    <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Controller
        name="operator"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="weight-operator">Operator</FieldLabel>
            <Input
              {...field}
              id="weight-operator"
              placeholder="Operator name (optional)"
              disabled={disabled}
            />
          </Field>
        )}
      />
      <Field>
        <FieldLabel htmlFor="weight-ticket">Ticket ID</FieldLabel>
        <Input id="weight-ticket" value={ticketId} disabled />
      </Field>
      <Controller
        name="vehicleName"
        control={control}
        render={({ fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>
              Vehicle Number
              <span className="text-destructive">*</span>
            </FieldLabel>
            <VehicleCombobox
              vehicles={vehicles}
              value={vehicleValue}
              onChange={onVehicleChange}
              disabled={disabled}
              allowNew={vehicleAllowNew}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Field>
        <FieldLabel>Material</FieldLabel>
        <MaterialCombobox
          materials={materials}
          value={materialValue}
          onChange={onMaterialChange}
          disabled={disabled}
        />
      </Field>
      <Controller
        name="supplierName"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="weight-supplier">Supplier</FieldLabel>
            <Input
              {...field}
              id="weight-supplier"
              placeholder="Supplier name (optional)"
              disabled={disabled}
            />
          </Field>
        )}
      />
      <Controller
        name="customerName"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="weight-customer">Customer</FieldLabel>
            <Input
              {...field}
              id="weight-customer"
              placeholder="Customer name (optional)"
              disabled={disabled}
            />
          </Field>
        )}
      />
      <Controller
        name="remark"
        control={control}
        render={({ field }) => (
          <Field className="md:col-span-2">
            <FieldLabel htmlFor="weight-remark">Remark</FieldLabel>
            <Textarea
              {...field}
              id="weight-remark"
              placeholder="Additional notes (optional)"
              className="min-h-20"
              disabled={disabled}
            />
          </Field>
        )}
      />
    </FieldGroup>
  );
}
