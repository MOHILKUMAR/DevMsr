/**
 * Hairline grids (gap-px over a bg-line container) show an empty grey cell
 * when the item count does not fill the last row. These classes stretch the
 * last item across the remaining columns instead.
 */

/** For grids that are 2 columns from `sm` up. */
export const FILL_LAST_2 = 'sm:[&:last-child:nth-child(odd)]:col-span-2';

/** For grids that are 2 columns at `sm` and 3 columns at `lg`. */
export const FILL_LAST_2_3 =
  'sm:[&:last-child:nth-child(odd)]:col-span-2 lg:[&:last-child:nth-child(odd)]:col-span-1 lg:[&:last-child:nth-child(3n+1)]:col-span-3 lg:[&:last-child:nth-child(3n+2)]:col-span-2';
