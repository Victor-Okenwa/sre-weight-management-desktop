import { useNavigate } from '@tanstack/react-router';
import type { ColumnFiltersState } from '@tanstack/react-table';
import type { PaginatedResult, Record as WeightRecord } from '@weight/shared/types/index';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTableDateFilter } from '@/components/data-table/data-table-date-filter';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { RecordViewDialog } from '@/components/history/records/record-view-dialog';
import { createRecordsColumns } from '@/components/history/records/records-table-columns';
import { DeleteConfirmDialog } from '@/components/history/shared/delete-confirm-dialog';
import { HistoryDataTable } from '@/components/history/shared/history-data-table';
import {
  getDateRangeFilter,
  getStringListFilter,
} from '@/components/history/shared/server-filter-utils';
import { PrinterDialog, type PrinterSelection } from '@/components/printer-dialog';
import { useServerDataTable } from '@/hooks/use-server-data-table';
import { logger } from '@/lib/logger';
import { savePrintDefaults } from '@/lib/print-record';
import { useSettingsStore } from '@/store/settingsStore';

function fetchRecords(
  page: number,
  pageSize: number,
  search: string,
  columnFilters: ColumnFiltersState,
): Promise<PaginatedResult<WeightRecord>> {
  const operationTypes = getStringListFilter(columnFilters, 'operationType');
  const statusValues = getStringListFilter(columnFilters, 'status');
  const { startDate, endDate } = getDateRangeFilter(columnFilters, 'createdAt');

  return window.electronAPI.getRecordsPaginated(page, pageSize, {
    ...(search ? { search } : {}),
    ...(operationTypes ? { operationType: operationTypes as ('single' | 'double')[] } : {}),
    ...(statusValues ? { status: statusValues as ('pending' | 'completed')[] } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  });
}

function deleteRecords(ids: number[]): Promise<number> {
  return window.electronAPI.deleteRecords(ids);
}

export function RecordsTable() {
  'use no memo';
  const navigate = useNavigate();
  const { settings, loadSettings } = useSettingsStore();
  const [viewItem, setViewItem] = useState<WeightRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<WeightRecord | null>(null);
  const [printItem, setPrintItem] = useState<WeightRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const columns = useMemo(
    () =>
      createRecordsColumns({
        onView: setViewItem,
        onEdit: (record) => {
          void navigate({ to: '/edit-weight', search: { ticketId: record.ticketId } });
        },
        onPrint: setPrintItem,
        onDelete: setDeleteItem,
      }),
    [navigate],
  );

  const { table, isLoading, isInitialLoading, setSearch, refetch } =
    useServerDataTable<WeightRecord>({
      columns,
      fetchPage: fetchRecords,
      onError: (error) => {
        logger('error', `Failed to load records: ${String(error)}`);
        toast.error('Failed to load records');
      },
    });

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await window.electronAPI.deleteRecord(deleteItem.id);
      toast.success('Record deleted');
      setDeleteItem(null);
      void refetch();
    } catch {
      toast.error('Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteItem, refetch]);

  const typeColumn = table.getColumn('operationType');
  const statusColumn = table.getColumn('status');
  const createdColumn = table.getColumn('createdAt');

  return (
    <>
      <HistoryDataTable
        table={table}
        isLoading={isLoading}
        isInitialLoading={isInitialLoading}
        columnCount={columns.length}
        entityName="record"
        searchPlaceholder="Search ticket, operator, vehicle, supplier, customer..."
        onSearch={setSearch}
        onDelete={deleteRecords}
        onDeleted={refetch}
        onRefresh={refetch}
      >
        {typeColumn && (
          <DataTableFacetedFilter
            column={typeColumn}
            title="Type"
            multiple
            options={[
              { label: 'Single', value: 'single' },
              { label: 'Double', value: 'double' },
            ]}
          />
        )}
        {statusColumn && (
          <DataTableFacetedFilter
            column={statusColumn}
            title="Status"
            multiple
            options={[
              { label: 'Pending', value: 'pending' },
              { label: 'Completed', value: 'completed' },
            ]}
          />
        )}
        {createdColumn && <DataTableDateFilter column={createdColumn} title="Created" multiple />}
      </HistoryDataTable>

      <RecordViewDialog
        record={viewItem}
        open={viewItem != null}
        onOpenChange={(open) => !open && setViewItem(null)}
        onPrint={(record) => {
          setViewItem(null);
          setPrintItem(record);
        }}
      />

      <PrinterDialog
        open={printItem != null}
        onOpenChange={(open) => !open && setPrintItem(null)}
        mode="print"
        record={printItem}
        defaultPrinterName={settings?.printPrinterName ?? ''}
        defaultPaperSize={settings?.printPaperSize ?? '80mm'}
        defaultCopies={settings?.printCopies ?? 1}
        allowSaveDefault
        onConfirm={async (selection: PrinterSelection) => {
          if (selection.saveAsDefault) {
            await savePrintDefaults(selection);
            await loadSettings();
          }
        }}
      />

      <DeleteConfirmDialog
        open={deleteItem != null}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Delete record?"
        description="This record will be permanently deleted."
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </>
  );
}
