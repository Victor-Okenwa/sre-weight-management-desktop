import { cn } from '@/lib/utils';

/** Weighbridge mark: a truck on a weigh deck. Uses currentColor. */
export function WmsLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <rect x="9.25" y="4.75" width="10.5" height="6.5" rx="1.1" />
      <path d="M4 12.2V8.2h3.1L9.25 12.2" />
      <circle cx="6.2" cy="13.35" r="1.15" />
      <circle cx="12.6" cy="13.35" r="1.15" />
      <circle cx="17.4" cy="13.35" r="1.15" />
      <path d="M3 16h18" />
      <path d="M5.2 16v3.4M18.8 16v3.4" />
      <path d="M3.8 19.4h16.4" />
    </svg>
  );
}
