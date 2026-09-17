import { Scale, Weight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export function WeighingTypeStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: 'single' | 'double') => void;
}) {
  return (
    <div className="space-y-6 py-4">
      <h3 className="text-lg font-semibold">Select Weighing Type</h3>

      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Label
          className={cn(
            'flex cursor-pointer flex-col items-center gap-4 rounded-lg border-2 p-8 transition-all',
            value === 'single' && 'border-heading/45 bg-heading/15 text-heading',
            value !== 'single' && 'border-border hover:border-muted-foreground/30',
          )}
        >
          <RadioGroupItem value="single" className="sr-only" />
          <Weight className={cn('size-10', value === 'single' ? 'text-heading' : 'text-muted-foreground')} />
          <div className="text-center">
            <p className="text-base font-semibold">Single Weighing</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Record only the tare weight of the vehicle
            </p>
          </div>
        </Label>

        <Label
          className={cn(
            'flex cursor-pointer flex-col items-center gap-4 rounded-lg border-2 p-8 transition-all',
            value === 'double' && 'border-heading/45 bg-heading/15 text-heading',
            value !== 'double' && 'border-border hover:border-muted-foreground/30',
          )}
        >
          <RadioGroupItem value="double" className="sr-only" />
          <Scale className={cn('size-10', value === 'double' ? 'text-heading' : 'text-muted-foreground')} />
          <div className="text-center">
            <p className="text-base font-semibold">Double Weighing</p>
            <p className="mt-1 text-sm text-muted-foreground">Full gross / tare / net workflow</p>
          </div>
        </Label>
      </RadioGroup>
    </div>
  );
}
