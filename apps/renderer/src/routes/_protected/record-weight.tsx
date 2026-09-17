/* eslint-disable react-refresh/only-export-components */
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { Material, Record as WeightRecord, Vehicle } from '@weight/shared/types/index';
import { Check, ChevronLeft, ChevronRight, Save, Scale } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PrinterDialog, type PrinterSelection } from '@/components/printer-dialog';
import { GrossWeightStep } from '@/components/record-weight-shared/new-record/gross-weight-step';
import { TareWeightStep } from '@/components/record-weight-shared/new-record/tare-weight-step';
import { VehicleSelectionStep } from '@/components/record-weight-shared/new-record/vehicle-selection-step';
import { WeighingTypeStep } from '@/components/record-weight-shared/new-record/weighing-type-step';
import { newWeightSchema } from '@/components/record-weight-shared/schema';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { savePrintDefaults, tryAutoPrintRecord } from '@/lib/print-record';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';
import { useWeightStore } from '@/store/weightStore';

export const Route = createFileRoute('/_protected/record-weight')({
  component: RouteComponent,
});

interface StepDef {
  id: string;
  label: string;
  showFor: 'both' | 'double';
}

const allSteps: StepDef[] = [
  { id: 'type', label: 'Weighing Type', showFor: 'both' },
  { id: 'vehicle', label: 'Vehicle', showFor: 'double' },
  { id: 'tare', label: 'Tare Weight', showFor: 'both' },
  { id: 'gross', label: 'Gross Weight', showFor: 'double' },
];

function RouteComponent() {
  const navigate = useNavigate();
  const { settings } = useSettingsStore();
  const { latestReading } = useWeightStore();

  const [stepIndex, setStepIndex] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [capturedTareWeight, setCapturedTareWeight] = useState<number | null>(null);
  const [capturedGrossWeight, setCapturedGrossWeight] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [printRecord, setPrintRecord] = useState<WeightRecord | null>(null);

  const form = useForm({
    resolver: zodResolver(newWeightSchema),
    defaultValues: {
      operationType: 'double' as const,
      tareSource: 'new' as const,
      vehicleName: '',
      materialName: '',
      operator: '',
      supplierName: '',
      customerName: '',
      remark: '',
    },
  });

  const operationType = form.watch('operationType');
  const vehicleName = form.watch('vehicleName');
  const materialName = form.watch('materialName');
  const tareSource = form.watch('tareSource');

  const vehicleAllowNew = !(operationType === 'double' && tareSource === 'existing');

  const visibleSteps = useMemo(
    () => allSteps.filter((s) => operationType === 'double' || s.showFor === 'both'),
    [operationType],
  );

  useEffect(() => {
    if (stepIndex >= visibleSteps.length) {
      setStepIndex(Math.max(0, visibleSteps.length - 1));
    }
  }, [visibleSteps.length, stepIndex]);

  const currentStep = visibleSteps[stepIndex];
  const weightUnit = settings?.weightUnit ?? 'kg';

  const ticketId = settings
    ? `${settings.ticketPrefix}-${String(settings.nextTicketNumber).padStart(4, '0')}`
    : '---';

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.name === vehicleName) ?? null,
    [vehicles, vehicleName],
  );

  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      try {
        const [vehiclesData, materialsData] = await Promise.all([
          window.electronAPI.getAllVehicles(),
          window.electronAPI.getAllMaterials(),
        ]);
        setVehicles(vehiclesData);
        setMaterials(materialsData);
      } catch {
        toast.error('Failed to load vehicles and materials');
      } finally {
        setIsLoadingData(false);
      }
    }

    form.reset();
    setStepIndex(0);
    setCapturedTareWeight(null);
    setCapturedGrossWeight(null);
    loadData();
  }, [form]);

  const canCapture = latestReading?.isStable === true && latestReading?.weight != null;

  const handleCaptureTare = useCallback(() => {
    if (canCapture && latestReading) {
      setCapturedTareWeight(latestReading.weight);
    }
  }, [canCapture, latestReading]);

  const handleCaptureGross = useCallback(() => {
    if (canCapture && latestReading) {
      setCapturedGrossWeight(latestReading.weight);
    }
  }, [canCapture, latestReading]);

  const handleRecaptureTare = useCallback(() => setCapturedTareWeight(null), []);
  const handleRecaptureGross = useCallback(() => setCapturedGrossWeight(null), []);

  const netWeight = useMemo(() => {
    if (capturedGrossWeight == null) return null;
    const tare = capturedTareWeight ?? selectedVehicle?.tareWeight ?? 0;
    return capturedGrossWeight - tare;
  }, [capturedGrossWeight, capturedTareWeight, selectedVehicle]);

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    switch (currentStep?.id) {
      case 'type': {
        if (!operationType) {
          toast.error('Please select a weighing type');
          return false;
        }
        return true;
      }
      case 'vehicle': {
        const tareValue = form.getValues('tareSource');
        if (tareValue === 'existing' && !form.getValues('vehicleName')) {
          toast.error('Please select a vehicle with existing tare');
          return false;
        }
        return true;
      }
      case 'tare': {
        const valid = await form.trigger('vehicleName');
        if (!valid) return false;
        const needsCapture =
          operationType === 'single' ||
          (operationType === 'double' && form.getValues('tareSource') === 'new');
        if (needsCapture && !capturedTareWeight) {
          toast.error('Please capture the tare weight before continuing');
          return false;
        }
        return true;
      }
      case 'gross': {
        const valid = await form.trigger('vehicleName');
        if (!valid) return false;
        if (!capturedGrossWeight) {
          toast.error('Please capture the gross weight');
          return false;
        }
        return true;
      }
      default:
        return true;
    }
  }, [currentStep, operationType, capturedTareWeight, capturedGrossWeight, form]);

  const handleNext = async () => {
    if (!(await validateCurrentStep())) return;
    if (stepIndex < visibleSteps.length - 1) {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  };

  const buildSubmitPayload = useCallback(
    (status: 'pending' | 'completed') => {
      const values = form.getValues();
      const payload: Record<string, unknown> = {
        operationType: values.operationType,
        vehicleName: values.vehicleName || undefined,
        materialName: values.materialName || undefined,
        operator: values.operator || undefined,
        supplierName: values.supplierName || undefined,
        customerName: values.customerName || undefined,
        remark: values.remark || undefined,
        status,
      };

      if (values.operationType === 'single' || values.operationType === 'double') {
        if (capturedTareWeight != null) {
          payload.tareWeight = capturedTareWeight;
          payload.vehicleTareWeight = capturedTareWeight;
          payload.vehicleTareUnit = weightUnit;
        } else if (selectedVehicle?.tareWeight != null) {
          payload.vehicleTareWeight = selectedVehicle.tareWeight;
          payload.vehicleTareUnit = selectedVehicle.tareUnit ?? weightUnit;
        }
      }

      if (values.operationType === 'double') {
        if (capturedGrossWeight != null) {
          payload.grossWeight = capturedGrossWeight;
        }
        if (netWeight != null) {
          payload.netWeight = netWeight;
        }
      }

      return payload;
    },
    [capturedTareWeight, capturedGrossWeight, selectedVehicle, weightUnit, netWeight, form],
  );

  const handleSaveExit = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const needsCapture =
      operationType === 'single' || (operationType === 'double' && tareSource === 'new');
    const useExisting = operationType === 'double' && tareSource === 'existing';

    if (needsCapture && !capturedTareWeight) {
      toast.error('Capture the tare weight before saving');
      return;
    }

    if (useExisting && !selectedVehicle?.tareWeight) {
      toast.error('Selected vehicle has no stored tare weight');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildSubmitPayload('pending');
      await window.electronAPI.createRecord(payload);
      toast.success('Record saved');
      navigate({ to: '/' });
    } catch {
      toast.error('Failed to save record');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    form,
    buildSubmitPayload,
    navigate,
    operationType,
    tareSource,
    capturedTareWeight,
    selectedVehicle,
  ]);

  const handleComplete = useCallback(async () => {
    if (!(await validateCurrentStep())) return;

    setIsSubmitting(true);
    try {
      const payload = buildSubmitPayload('completed');
      const created = await window.electronAPI.createRecord(payload);
      toast.success('Record saved');

      const autoPrinted = await tryAutoPrintRecord(created, settings);
      if (autoPrinted) {
        navigate({ to: '/' });
        return;
      }

      setPrintRecord(created);
    } catch {
      toast.error('Failed to save record');
    } finally {
      setIsSubmitting(false);
    }
  }, [validateCurrentStep, buildSubmitPayload, navigate, settings]);

  async function handlePrintConfirm(selection: PrinterSelection) {
    if (selection.saveAsDefault) {
      await savePrintDefaults(selection);
    }
    navigate({ to: '/' });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 min-h-screen">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-lg bg-heading/10">
          <Scale className="size-6 text-heading" />
        </div>
        <div>
          <h2 className="text-xl font-bold">New Weight Record</h2>
          <p className="text-sm text-muted-foreground">Ticket: {ticketId}</p>
        </div>
      </div>

      <Separator />

      {visibleSteps.length > 1 && (
        <div className="flex items-center gap-0 px-2">
          {visibleSteps.map((step, index) => {
            const isCompleted = index < stepIndex;
            const isActive = index === stepIndex;

            return (
              <div key={step.id} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (index <= stepIndex) setStepIndex(index);
                  }}
                  disabled={index > stepIndex}
                  className="group flex flex-col items-center text-center"
                >
                  <div
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                      isCompleted && 'border-green-500 bg-green-500 text-white',
                      isActive && 'border-primary bg-primary text-white',
                      !isCompleted &&
                        !isActive &&
                        'border-muted-foreground/30 text-muted-foreground',
                    )}
                  >
                    {isCompleted ? <Check className="size-4" /> : index + 1}
                  </div>
                  <span
                    className={cn(
                      'mt-1.5 text-xs font-medium',
                      isActive && 'text-primary',
                      !isActive && 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                </button>
                {index < visibleSteps.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-px flex-1',
                      index < stepIndex && 'bg-primary',
                      index >= stepIndex && 'bg-border',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <Separator />

      {isLoadingData ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="size-8" />
        </div>
      ) : (
        <div
          key={currentStep?.id ?? 'empty'}
          className="animate-in fade-in slide-in-from-right-4 duration-200"
        >
          {currentStep?.id === 'type' && (
            <WeighingTypeStep
              value={operationType}
              onChange={(val) => form.setValue('operationType', val)}
            />
          )}

          {currentStep?.id === 'vehicle' && (
            <VehicleSelectionStep
              tareSource={form.watch('tareSource')}
              onTareSourceChange={(val) => form.setValue('tareSource', val)}
              vehicles={vehicles}
              vehicleName={vehicleName}
              onVehicleChange={(val) => form.setValue('vehicleName', val)}
            />
          )}

          {currentStep?.id === 'tare' && (
            <TareWeightStep
              ticketId={ticketId}
              control={form.control}
              vehicles={vehicles}
              materials={materials}
              operationType={operationType}
              tareSource={form.watch('tareSource')}
              capturedTareWeight={capturedTareWeight}
              onCaptureTare={handleCaptureTare}
              onRecaptureTare={handleRecaptureTare}
              canCapture={canCapture}
              selectedVehicle={selectedVehicle}
              weightUnit={weightUnit}
              vehicleValue={vehicleName}
              onVehicleChange={(val) => form.setValue('vehicleName', val)}
              materialValue={String(materialName)}
              onMaterialChange={(val) => form.setValue('materialName', val)}
              vehicleAllowNew={vehicleAllowNew}
            />
          )}

          {currentStep?.id === 'gross' && (
            <GrossWeightStep
              ticketId={ticketId}
              control={form.control}
              vehicles={vehicles}
              materials={materials}
              capturedTareWeight={capturedTareWeight}
              capturedGrossWeight={capturedGrossWeight}
              onCaptureGross={handleCaptureGross}
              onRecaptureGross={handleRecaptureGross}
              canCapture={canCapture}
              selectedVehicle={selectedVehicle}
              weightUnit={weightUnit}
              netWeight={netWeight}
              vehicleValue={vehicleName}
              onVehicleChange={(val) => form.setValue('vehicleName', val)}
              materialValue={String(materialName)}
              onMaterialChange={(val) => form.setValue('materialName', val)}
              vehicleAllowNew={vehicleAllowNew}
            />
          )}

          {(!currentStep || currentStep.id === '') && (
            <div className="py-8 text-center text-muted-foreground">No step content available</div>
          )}
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Step {stepIndex + 1} of {visibleSteps.length}
        </div>

        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <Button type="button" variant="outline" onClick={handlePrev} disabled={isSubmitting}>
              <ChevronLeft className="size-4" />
              Previous
            </Button>
          )}

          {(currentStep?.id === 'tare' || currentStep?.id === 'gross') && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveExit}
              disabled={isSubmitting}
            >
              <Save className="size-4" />
              Save & Exit
            </Button>
          )}

          {stepIndex < visibleSteps.length - 1 ? (
            <Button type="button" onClick={handleNext} disabled={isSubmitting}>
              Continue
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleComplete} disabled={isSubmitting}>
              {isSubmitting && <Spinner className="size-4" />}
              Complete
            </Button>
          )}
        </div>
      </div>

      <PrinterDialog
        open={printRecord != null}
        onOpenChange={(open) => {
          if (!open) {
            setPrintRecord(null);
            navigate({ to: '/' });
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
