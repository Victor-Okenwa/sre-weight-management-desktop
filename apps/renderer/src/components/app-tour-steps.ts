export const tourSteps = [
  {
    id: 'nav',
    target: '[data-tour="nav"]',
    route: '/',
    side: 'right',
    align: 'start',
    title: 'This is your station',
    body: 'Use the left menu to move around. Dashboard shows live weight, Record Weight captures a ticket, History stores past work, and Settings is where you change the scale, tickets, and company details.',
  },
  {
    id: 'live-reading',
    target: '[data-tour="live-reading"]',
    route: '/',
    side: 'bottom',
    align: 'start',
    title: 'Watch the scale here',
    body: 'This is the live weight from the indicator. Red means the scale is not connected, yellow means it is connecting or the reading is not stable yet, and green means you have a stable reading you can capture.',
  },
  {
    id: 'connection',
    target: '[data-tour="connection"]',
    route: '/',
    side: 'bottom',
    align: 'start',
    title: 'Check the scale link',
    body: 'These are the COM port settings this station is using. If the live reading is blank, open Configure to pick the correct port and baud rate.',
  },
  {
    id: 'serial-status',
    target: '[data-tour="serial-status"]',
    route: '/',
    side: 'bottom',
    align: 'end',
    title: 'Connection status stays on every page',
    body: 'The top bar shows the current COM port and whether the indicator is connected. If the signal turns red, use Reconnect, or go to Settings and change the port.',
  },
  {
    id: 'record-weight',
    target: '[data-tour="record-weight"]',
    route: '/record-weight',
    side: 'bottom',
    align: 'start',
    title: 'Capture a weigh ticket',
    body: 'Choose Single to record only tare, or Double for tare and gross. For a double weigh you pick the vehicle, capture tare, then capture gross. Save prints the ticket if auto-print is on.',
  },
  {
    id: 'history-tabs',
    target: '[data-tour="history-tabs"]',
    route: '/history',
    side: 'bottom',
    align: 'start',
    title: 'Find past work here',
    body: 'Records are your weigh tickets. Vehicles and Materials are the lists you pick from when recording a weigh. You can search, edit, and print from these tables.',
  },
  {
    id: 'settings-tabs',
    target: '[data-tour="settings-tabs"]',
    route: '/settings',
    search: { tab: 'serial' },
    side: 'bottom',
    align: 'start',
    title: 'Change station setup later',
    body: 'Everything from first-time setup lives here: serial port, appearance, ticket printing, company details on tickets, and the app password. About is where you check for software updates.',
  },
  {
    id: 'serial-port',
    target: '[data-tour="serial-port"]',
    route: '/settings',
    search: { tab: 'serial' },
    side: 'bottom',
    align: 'start',
    title: 'Pick the scale COM port',
    body: 'Type the COM number, or click the port icon to list devices on this PC. Choose the one named Prolific — that is usually the USB adapter for the weighing indicator.',
  },
  {
    id: 'help',
    target: '[data-tour="help"]',
    route: '/',
    side: 'right',
    align: 'start',
    title: 'Need this again?',
    body: 'Take a Tour replays this walkthrough any time. Contact shows WhatsApp and call numbers if you find a bug, need to renew a license, or have a problem with this workstation.',
  },
] as const;

export type TourStepId = (typeof tourSteps)[number]['id'];
export type TourStepRoute = (typeof tourSteps)[number]['route'];

export const tourCollisionPadding: {
  top: number;
  right: number;
  bottom: number;
  left: number;
} = {
  top: 16,
  right: 16,
  bottom: 120,
  left: 16,
};
