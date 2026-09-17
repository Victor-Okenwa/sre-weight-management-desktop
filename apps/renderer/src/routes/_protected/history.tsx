/* eslint-disable react-refresh/only-export-components */

import { createFileRoute } from '@tanstack/react-router';
import { HistoryIcon } from 'lucide-react';
import { useState } from 'react';
import { MaterialsTable } from '@/components/history/materials/materials-table';
import { RecordsTable } from '@/components/history/records/records-table';
import { VehiclesTable } from '@/components/history/vehicles/vehicles-table';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';

export const Route = createFileRoute('/_protected/history')({
  component: RouteComponent,
});

type HistoryTab = 'records' | 'vehicles' | 'materials';

function RouteComponent() {
  const [tab, setTab] = useState<HistoryTab>('records');

  return (
    <TooltipProvider>
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 overflow-x-hidden p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-lg bg-heading/10">
            <HistoryIcon className="size-6 text-heading" />
          </div>
          <div>
            <h2 className="text-xl font-bold">History</h2>
            <p className="text-sm text-muted-foreground">
              View and manage records, vehicles, and materials
            </p>
          </div>
        </div>

        <Separator />

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as HistoryTab)}
          className="flex min-w-0 w-full flex-col"
        >
          <TabsList>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
          </TabsList>
          <TabsContent value="records" className="min-w-0">
            {tab === 'records' ? <RecordsTable /> : null}
          </TabsContent>
          <TabsContent value="vehicles" className="min-w-0">
            {tab === 'vehicles' ? <VehiclesTable /> : null}
          </TabsContent>
          <TabsContent value="materials" className="min-w-0">
            {tab === 'materials' ? <MaterialsTable /> : null}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
