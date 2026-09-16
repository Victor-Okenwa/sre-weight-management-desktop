/* eslint-disable react-refresh/only-export-components */

import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import type { Material, Record as WeightRecord, Vehicle } from '@weight/shared/types/index';
import { Check, ChevronLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { PrinterDialog, type PrinterSelection } from '@/components/printer-dialog';
import { FormFields } from '@/components/record-weight-shared/form-fields';
import { newWeightSchema } from '@/components/record-weight-shared/schema';
import { WeightCaptureArea } from '@/components/record-weight-shared/weight-capture-area';
import { WeightSummaryCards } from '@/components/record-weight-shared/weight-summary-cards';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { savePrintDefaults, tryAutoPrintRecord } from '@/lib/print-record';
import { useSettingsStore } from '@/store/settingsStore';
import { useWeightStore } from '@/store/weightStore';

const editWeightSearchSchema = z.object({
  ticketId: z.string().min(1),
});

export const Route = createFileRoute('/_protected/edit-weight')({
  validateSearch: editWeightSearchSchema,
  component: EditWeightPage,
});

function EditWeightPage() {
  const router = useRouter();
  const { ticketId } = Route.useSearch();
  const { settings } = useSettingsStore();
  const { latestReading } = useWeightStore();
  const weightUnit = settings?.weightUnit ?? 'kg';

  const [record, setRecord] = useState<WeightRecord | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [capturedGrossWeight, setCapturedGrossWeight] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printRecord, setPrintRecord] = useState<WeightRecord | null>(null);

  const form = useForm({
    resolver: zodResolver(newWeightSchema),
    defaultValues: {
      operationType: 'double' as const,
      vehicleName: '',
      materialName: '',
      operator: '',
      supplierName: '',
      customerName: '',
      remark: '',
    },
  });

  const vehicleName = form.watch('vehicleName');
  const materialName = form.watch('materialName');

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.name === vehicleName) ?? null,
    [vehicles, vehicleName],
  );

  const tareWeight = useMemo(() => {
    if (!record) return null;
    return record.tareWeight ?? selectedVehicle?.tareWeight ?? null;
  }, [record, selectedVehicle]);

  const canCapture = latestReading?.isStable === true && latestReading?.weight != null;

  const netWeight = useMemo(() => {
    if (capturedGrossWeight == null || tareWeight == null) return null;
    return capturedGrossWeight - tareWeight;
  }, [capturedGrossWeight, tareWeight]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [found, vehiclesData, materialsData] = await Promise.all([
          window.electronAPI.getRecordByTicketId(ticketId),
          window.electronAPI.getAllVehicles(),
          window.electronAPI.getAllMaterials(),
        ]);

        if (cancelled) return;

        if (!found) {
          setLoadError(`No record found for ticket ${ticketId}.`);
          setRecord(null);
          return;
        }

        if (found.status !== 'pending') {
          setLoadError(`Ticket ${ticketId} is not pending and cannot be edited.`);
          setRecord(null);
          return;
        }

        setRecord(found);
        setVehicles(vehiclesData);
        setMaterials(materialsData);
        setCapturedGrossWeight(found.grossWeight);
        form.reset({
          operationType: found.operationType,
          vehicleName: found.vehicleName ?? '',
          materialName: found.materialName ?? '',
          operator: found.operator ?? '',
          supplierName: found.supplierName ?? '',
          customerName: found.customerName ?? '',
          remark: found.remark ?? '',
        });
      } catch {
        if (!cancelled) {
          setLoadError('Failed to load record.');
          setRecord(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [ticketId, form]);

  const handleCaptureGross = useCallback(() => {
    if (canCapture && latestReading) {
      setCapturedGrossWeight(latestReading.weight);
    }
  }, [canCapture, latestReading]);

  const handleRecaptureGross = useCallback(() => setCapturedGrossWeight(null), []);

  const handleComplete = form.handleSubmit(async (values) => {
    if (!record) return;
    if (capturedGrossWeight == null) {
      toast.error('Please capture the gross weight');
      return;
    }
    if (tareWeight == null) {
      toast.error('Cannot compute net weight: tare is missing');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await window.electronAPI.updateRecord(record.id, {
        operator: values.operator || null,
        vehicleName: values.vehicleName,
        materialName: values.materialName || null,
        supplierName: values.supplierName || null,
        customerName: values.customerName || null,
        remark: values.remark || null,
        grossWeight: capturedGrossWeight,
        netWeight: capturedGrossWeight - tareWeight,
        status: 'completed',
      });
      if (!updated) {
        toast.error('Failed to update record');
        return;
      }
      toast.success('Weight record completed');

      const autoPrinted = await tryAutoPrintRecord(updated, settings);
      if (autoPrinted) {
        router.history.back();
        return;
      }

      setPrintRecord(updated);
    } catch {
      toast.error('Failed to update record');
    } finally {
      setIsSubmitting(false);
    }
  });

  async function handlePrintConfirm(selection: PrinterSelection) {
    if (selection.saveAsDefault) {
      await savePrintDefaults(selection);
    }
    router.history.back();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (loadError || !record) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-2xl space-y-6 p-6">
        <Button type="button" variant="ghost" size="sm" onClick={() => router.history.back()}>
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <p className="text-sm text-destructive">{loadError ?? 'Record not found.'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-6 p-6">
      <Button type="button" variant="ghost" size="sm" onClick={() => router.history.back()}>
        <ChevronLeft className="size-4" />
        Back
      </Button>

      <div>
        <h2 className="text-xl font-bold">Edit Weight</h2>
        <p className="text-sm text-muted-foreground">
          Ticket {record.ticketId}
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <span className="capitalize">{record.operationType}</span> weighing
        </p>
      </div>

      <Separator />

      <WeightSummaryCards
        tareWeight={tareWeight}
        grossWeight={capturedGrossWeight}
        netWeight={netWeight}
        weightUnit={weightUnit}
      />

      <Separator />

      <FormFields
        ticketId={record.ticketId}
        control={form.control}
        vehicles={vehicles}
        materials={materials}
        vehicleValue={vehicleName ?? ''}
        onVehicleChange={(val) => form.setValue('vehicleName', val, { shouldValidate: true })}
        materialValue={materialName ?? ''}
        onMaterialChange={(val) => form.setValue('materialName', val)}
      />

      <Separator />

      <WeightCaptureArea
        label="Gross Weight"
        capturedWeight={capturedGrossWeight}
        onCapture={handleCaptureGross}
        onRecapture={handleRecaptureGross}
        canCapture={canCapture}
        weightUnit={weightUnit}
      />

      {tareWeight == null && (
        <p className="text-sm text-destructive">
          Tare weight is missing. Select a vehicle with a stored tare, or ensure the record has a
          tare before completing.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.history.back()}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleComplete}
          disabled={isSubmitting || capturedGrossWeight == null || tareWeight == null}
        >
          {isSubmitting ? (
            <Spinner className="size-4" />
          ) : (
            <>
              <Check className="size-4" />
              Complete
            </>
          )}
        </Button>
      </div>

      <PrinterDialog
        open={printRecord != null}
        onOpenChange={(open) => {
          if (!open) {
            setPrintRecord(null);
            router.history.back();
          }
        }}
        mode="print"
        record={printRecord}
        defaultPrinterName={settings?.printPrinterName ?? ''}
        defaultPaperSize={settings?.printPaperSize ?? '80mm'}
        defaultCopies={settings?.printCopies ?? 1}
        allowSaveDefault
        onConfirm={handlePrintConfirm}
      />
    </div>
  );
}
