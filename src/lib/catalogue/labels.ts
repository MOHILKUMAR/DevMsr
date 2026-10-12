import type { ProductStatus, ServiceStatus } from '../../types/catalogue';

export type StatusTone = 'success' | 'info' | 'warning' | 'neutral';

export const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; tone: StatusTone; explanation: string }> = {
  available: { label: 'Available', tone: 'success', explanation: 'Implemented and ready to offer.' },
  demo: { label: 'Demo', tone: 'info', explanation: 'A working demo exists; production deployment is scoped per client.' },
  in_development: {
    label: 'In development',
    tone: 'warning',
    explanation: 'Being built. Parts may work today; it is not yet a finished product.',
  },
  concept: {
    label: 'Concept',
    tone: 'neutral',
    explanation: 'A planned product. Available today as a custom build, not as a packaged product.',
  },
};

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  offered: 'Offered',
  on_request: 'Scoped on request',
};
