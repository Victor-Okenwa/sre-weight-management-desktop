import { cva, type VariantProps } from 'class-variance-authority';
import { Tabs as TabsPrimitive } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/utils';

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn('group/tabs flex gap-4 data-horizontal:flex-col', className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  [
    'group/tabs-list relative isolate inline-flex w-fit items-center justify-center rounded-xl p-1',
    'text-muted-foreground',
    'group-data-horizontal/tabs:h-10 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col',
    'data-[variant=line]:rounded-none data-[variant=line]:bg-transparent data-[variant=line]:p-0',
    // Futuristic glass panel highlight
    'before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:z-10 before:h-px',
    'before:bg-gradient-to-r before:from-transparent before:via-heading/25 before:to-transparent',
    'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:opacity-50',
    'after:bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklch,var(--heading)_8%,transparent),transparent_70%)]',
  ],
  {
    variants: {
      variant: {
        default: [
          'border border-border/60 bg-card/40 shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--foreground)_6%,transparent)]',
          'backdrop-blur-md',
        ],
        line: [
          'gap-1 border-b border-border/40 bg-transparent shadow-none',
          'before:hidden after:hidden',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        [
          'relative z-10 inline-flex h-[calc(100%-2px)] flex-1 items-center justify-center gap-1.5',
          'rounded-lg border border-transparent px-3 py-1.5',
          'text-sm font-medium tracking-wide whitespace-nowrap',
          'text-muted-foreground/80 transition-all duration-300 ease-out',
          'group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start',
          'hover:bg-foreground/5 hover:text-foreground',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring',
          'disabled:pointer-events-none disabled:opacity-50',
          'has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
          '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
          // Active glow pill (default variant)
          'group-data-[variant=default]/tabs-list:data-[state=active]:border-heading/20',
          'group-data-[variant=default]/tabs-list:data-[state=active]:bg-heading/10',
          'group-data-[variant=default]/tabs-list:data-[state=active]:text-heading',
          'group-data-[variant=default]/tabs-list:data-[state=active]:shadow-[0_0_24px_-10px] group-data-[variant=default]/tabs-list:data-[state=active]:shadow-heading/50',
          // Line variant
          'group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:bg-transparent',
          'group-data-[variant=line]/tabs-list:px-4 group-data-[variant=line]/tabs-list:pb-3 group-data-[variant=line]/tabs-list:shadow-none',
          'group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:text-heading',
          // Active indicator bar
          'after:absolute after:opacity-0 after:transition-all after:duration-300 after:ease-out',
          'group-data-horizontal/tabs:after:inset-x-3 group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-px',
          'group-data-vertical/tabs:after:inset-y-2 group-data-vertical/tabs:after:-right-0.5 group-data-vertical/tabs:after:w-px',
          'group-data-[variant=default]/tabs-list:data-[state=active]:after:opacity-100',
          'group-data-[variant=default]/tabs-list:data-[state=active]:after:bg-heading',
          'group-data-[variant=default]/tabs-list:data-[state=active]:after:shadow-[0_0_10px_2px] group-data-[variant=default]/tabs-list:data-[state=active]:after:shadow-heading/40',
          'group-data-[variant=line]/tabs-list:after:bottom-[-1px] group-data-[variant=line]/tabs-list:after:inset-x-0',
          'group-data-[variant=line]/tabs-list:after:h-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100',
          'group-data-[variant=line]/tabs-list:data-[state=active]:after:bg-heading',
          'group-data-[variant=line]/tabs-list:data-[state=active]:after:shadow-[0_0_12px_2px] group-data-[variant=line]/tabs-list:data-[state=active]:after:shadow-heading/50',
        ],
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'flex-1 text-sm outline-none',
        'data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2 data-[state=active]:duration-300',
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
