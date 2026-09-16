import type { Record as WeightRecord } from '@weight/shared/types/index';
import { Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { DialogScrollBody } from '@/components/history/shared/dialog-scroll-body';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/format';

function formatWeight(value: number | null): string {
  return value == null ? '--' : value.toLocaleString();
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-2 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

interface RecordViewDialogProps {
  record: WeightRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint?: (record: WeightRecord) => void;
}

export function RecordViewDialog({
  record,
  open,
  onOpenChange,
  onPrint,
}: RecordViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Record Details</DialogTitle>
          <DialogDescription>Full details for ticket {record.ticketId}</DialogDescription>
        </DialogHeader>
        <DialogScrollBody>
          <div className="divide-y">
            <DetailRow label="Ticket" value={record.ticketId} />
            <DetailRow
              label="Type"
              value={
                <Badge variant="secondary" className="capitalize">
                  {record.operationType}
                </Badge>
              }
            />
            <DetailRow
              label="Status"
              value={
                <Badge
                  variant={record.status === 'completed' ? 'default' : 'outline'}
                  className="capitalize"
                >
                  {record.status}
                </Badge>
              }
            />
            <DetailRow label="Vehicle" value={record.vehicleName ?? '--'} />
            <DetailRow label="Material" value={record.materialName ?? '--'} />
            <DetailRow label="Gross" value={formatWeight(record.grossWeight)} />
            <DetailRow label="Tare" value={formatWeight(record.tareWeight)} />
            <DetailRow label="Net" value={formatWeight(record.netWeight)} />
            <DetailRow label="Operator" value={record.operator ?? '--'} />
            <DetailRow label="Supplier" value={record.supplierName ?? '--'} />
            <DetailRow label="Customer" value={record.customerName ?? '--'} />
            <DetailRow label="Remark" value={record.remark ?? '--'} />
            <DetailRow label="Created" value={formatDate(record.createdAt)} />
            <DetailRow label="Updated" value={formatDate(record.updatedAt)} />
          </div>
        </DialogScrollBody>
        {record.status === 'completed' && onPrint && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onPrint(record)}>
              <Printer className="size-4" />
              Print ticket
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
