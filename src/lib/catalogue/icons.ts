/** Icon names that DynamicIcon.astro can render. Used to validate admin input. */
export const ICON_NAMES = [
  'stethoscope',
  'bed-double',
  'utensils',
  'store',
  'plane',
  'graduation-cap',
  'layout-template',
  'shopping-bag',
  'blocks',
  'layout-dashboard',
  'receipt',
  'contact',
  'workflow',
  'message-square',
  'phone-call',
  'plug',
  'server-cog',
  'building',
] as const;
export type IconName = (typeof ICON_NAMES)[number];
