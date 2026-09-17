/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { Building2, Cable, Info, Printer, Settings2, Shield, SlidersHorizontal } from 'lucide-react';
import { z } from 'zod';
import { AboutTab } from '@/components/about-tab';
import { CompanyDetailsTab } from '@/components/company-details-tab';
import { PreferencesTab } from '@/components/preferences-tab';
import { PrintSettingsTab } from '@/components/print-settings-tab';
import { SecurityTab } from '@/components/security-tab';
import { SerialConfigurationsTab } from '@/components/serial-configurations-tab';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { glassSurfaceClassName } from '@/lib/glass-surface';
import { cn } from '@/lib/utils';

const settingsTabs = ['serial', 'preferences', 'print', 'company', 'security', 'about'] as const;

const settingsSearchSchema = z.object({
  tab: z.enum(settingsTabs).default('serial'),
});

export type SettingsTab = z.infer<typeof settingsSearchSchema>['tab'];

export const Route = createFileRoute('/_protected/settings')({
  validateSearch: settingsSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 overflow-x-hidden p-6">
      <div className="flex w-fit items-center gap-3" data-tour="settings-tabs">
        <div className="flex size-12 items-center justify-center rounded-xl border border-heading/30 bg-heading/10 shadow-[0_0_20px_-8px] shadow-heading/30">
          <Settings2 className="size-6 text-heading" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure serial connection, preferences, printing, company details, security, and
            updates
          </p>
        </div>
      </div>

      <Separator />

      <div className={cn(glassSurfaceClassName, 'p-4')}>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            navigate({
              search: { tab: value as SettingsTab },
            });
          }}
          className="relative z-10 flex w-full min-w-0 flex-col"
        >
          <TabsList>
            <TabsTrigger value="serial">
              <Cable className="size-4" />
              Serial
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <SlidersHorizontal className="size-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="print">
              <Printer className="size-4" />
              Print
            </TabsTrigger>
            <TabsTrigger value="company">
              <Building2 className="size-4" />
              Company Details
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="size-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="about">
              <Info className="size-4" />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="serial" className="min-w-0">
            <SerialConfigurationsTab />
          </TabsContent>

          <TabsContent value="preferences" className="min-w-0">
            <PreferencesTab />
          </TabsContent>

          <TabsContent value="print" className="min-w-0">
            <PrintSettingsTab />
          </TabsContent>

          <TabsContent value="company" className="min-w-0">
            <CompanyDetailsTab />
          </TabsContent>

          <TabsContent value="security" className="min-w-0">
            <SecurityTab />
          </TabsContent>

          <TabsContent value="about" className="min-w-0">
            <AboutTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
