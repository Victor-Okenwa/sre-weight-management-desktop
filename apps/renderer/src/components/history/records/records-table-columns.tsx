import type { ColumnDef } from '@tanstack/react-table';
import type { Record as WeightRecord } from '@weight/shared/types/index';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableRowActions } from '@/components/history/shared/data-table-row-actions';
import { dateRangeFilterFn, facetedFilterFn } from '@/components/history/shared/filter-fns';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDate } from '@/lib/format';

function formatWeight(value: number | null): string {
  return value == null ? '--' : value.toLocaleString();
}

export interface RecordsColumnActions {
  onView: (record: WeightRecord) => void;
  onEdit: (record: WeightRecord) => void;
  onPrint: (record: WeightRecord) => void;
  onDelete: (record: WeightRecord) => void;
}

export function createRecordsColumns(actions: RecordsColumnActions): ColumnDef<WeightRecord>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      accessorKey: 'ticketId',
      header: ({ column }) => <DataTableColumnHeader column={column} label="Ticket" />,
      meta: { label: 'Ticket' },
    },
    {
      accessorKey: 'operationType',
      header: ({ column }) => <DataTableColumnHeader column={column} label="Type" />,
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize">
          {row.original.operationType}
        </Badge>
      ),
      enableColumnFilter: true,
      filterFn: facetedFilterFn,
      meta: {
        label: 'Type',
        variant: 'multiSelect',
        options: [
          { label: 'Single', value: 'single' },
          { label: 'Double', value: 'double' },
        ],
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'completed' ? 'sky' : 'outline'}
          className="capitalize"
        >
          {row.original.status}
        </Badge>
      ),
      enableColumnFilter: true,
      filterFn: facetedFilterFn,
      meta: {
        label: 'Status',
        variant: 'multiSelect',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'Completed', value: 'completed' },
        ],
      },
    },
    {
      accessorKey: 'vehicleName',
      header: ({ column }) => <DataTableColumnHeader column={column} label="Vehicle" />,
      cell: ({ row }) => row.original.vehicleName ?? '--',
      meta: { label: 'Vehicle' },
    },
    {
      accessorKey: 'materialName',
      header: ({ column }) => <DataTableColumnHeader column={column} label="Material" />,
      cell: ({ row }) => row.original.materialName ?? '--',
      meta: { label: 'Material' },
    },
    {
      accessorKey: 'grossWeight',
      header: ({ column }) => <DataTableColumnHeader column={column} label="Gross" />,
      cell: ({ row }) => formatWeight(row.original.grossWeight),
      meta: { label: 'Gross' },
    },
    {
      accessorKey: 'tareWeight',
      header: ({ column }) => <DataTableColumnHeader column={column} label="Tare" />,
      cell: ({ row }) => formatWeight(row.original.tareWeight),
      meta: { label: 'Tare' },
    },
    {
      accessorKey: 'netWeight',
      header: ({ column }) => <DataTableColumnHeader column={column} label="Net" />,
      cell: ({ row }) => formatWeight(row.original.netWeight),
      meta: { label: 'Net' },
    },
    {
      accessorKey: 'operator',
      header: ({ column }) => <DataTableColumnHeader column={column} label="Operator" />,
      cell: ({ row }) => row.original.operator ?? '--',
      meta: { label: 'Operator' },
    },
    {
      accessorKey: 'supplierName',
      header: ({ column }) => <DataTableColumnHeader column={column} label="Supplier" />,
      cell: ({ row }) => row.original.supplierName ?? '--',
      meta: { label: 'Supplier' },
    },
    {
      accessorKey: 'customerName',
      header: ({ column }) => <DataTableColumnHeader column={column} label="Customer" />,
      cell: ({ row }) => row.original.customerName ?? '--',
      meta: { label: 'Customer' },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} label="Created" />,
      cell: ({ row }) => formatDate(row.original.createdAt),
      enableColumnFilter: true,
      filterFn: dateRangeFilterFn,
      meta: { label: 'Created', variant: 'dateRange' },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <DataTableRowActions
          onView={() => actions.onView(row.original)}
          onEdit={() => actions.onEdit(row.original)}
          onPrint={() => actions.onPrint(row.original)}
          onDelete={() => actions.onDelete(row.original)}
          showEdit={row.original.status === 'pending'}
          showPrint={row.original.status === 'completed'}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 100,
    },
  ];
}
