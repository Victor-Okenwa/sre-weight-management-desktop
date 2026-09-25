import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function RegistryTestPopover() {
  const [open, setOpen] = useState(false);

  async function showHealth() {
    setOpen(false);
    try {
      const details = await window.electronAPI.getRegistryHealth();
      console.log('[registry] health', details);
      if (details.ok) {
        toast.success('Registry health', { description: JSON.stringify(details) });
      } else {
        toast.error('Registry health', { description: JSON.stringify(details) });
      }
    } catch (error) {
      const details = { ok: false, error: (error as Error).message };
      console.log('[registry] health', details);
      toast.error('Registry health', { description: details.error });
    }
  }

  async function showDevice() {
    setOpen(false);
    try {
      const details = await window.electronAPI.getDeviceDetails();
      console.log('[registry] device', details);
      toast.message('Device details', { description: JSON.stringify(details) });
    } catch (error) {
      const details = { ok: false, error: (error as Error).message };
      console.log('[registry] device', details);
      toast.error('Device details', { description: details.error });
    }
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" size="sm">
            Registry
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-56 gap-2">
          <Button type="button" variant="outline" className="w-full justify-start" onClick={showHealth}>
            Get registry health
          </Button>
          <Button type="button" variant="outline" className="w-full justify-start" onClick={showDevice}>
            Get my device details
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
