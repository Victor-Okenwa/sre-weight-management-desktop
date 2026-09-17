import { Check, Copy, MessageCircle, Phone, Route } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useAppTour } from '@/components/app-tour';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const WHATSAPP_NUMBER = '+2347084618070';
const CALL_NUMBER = '+2349036645619';

const helpButtonClassName = cn(
  'rounded-lg border border-transparent transition-all duration-200 cursor-pointer hover:bg-black/10! dark:hover:bg-white/10!',
);

function CopyContactButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => void handleCopy()}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

export function HelpSidebarSection() {
  const { startTour } = useAppTour();

  return (
    <SidebarGroup data-tour="help">
      <SidebarGroupLabel className="px-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">
        Help
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              size="lg"
              className={cn(helpButtonClassName)}
              onClick={startTour}
            >
              <Route className="size-4" />
              <span>Take a Tour</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Dialog>
              <DialogTrigger asChild>
                <SidebarMenuButton type="button" size="lg" className={helpButtonClassName}>
                  <Phone className="size-4" />
                  <span>Contact</span>
                </SidebarMenuButton>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Contact support</DialogTitle>
                  <DialogDescription>
                    If you find a bug, want to renew your license, or have issues with this
                    workstation, reach Solution Road Tech Support:
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-heading/30 bg-heading/10">
                      <MessageCircle className="size-4 text-heading" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        WhatsApp
                      </p>
                      <p className="font-mono text-sm font-medium">{WHATSAPP_NUMBER}</p>
                    </div>
                    <CopyContactButton value={WHATSAPP_NUMBER} label="WhatsApp number" />
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-heading/30 bg-heading/10">
                      <Phone className="size-4 text-heading" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Call
                      </p>
                      <p className="font-mono text-sm font-medium">{CALL_NUMBER}</p>
                    </div>
                    <CopyContactButton value={CALL_NUMBER} label="Phone number" />
                  </div>
                </div>

                <DialogFooter showCloseButton />
              </DialogContent>
            </Dialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
