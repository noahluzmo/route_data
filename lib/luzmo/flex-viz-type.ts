/**
 * Luzmo Flex registers `donut-chart`; catalog "Pie chart" is item `pie-chart` with
 * `type: donut-chart` and `options.mode: 'pie'`. Passing `pie-chart` as the viz type fails with
 * "Custom chart with type pie-chart not found".
 *
 * @see @luzmo/dashboard-contents-types item-catalog (pie-chart → donut-chart)
 */
export function toFlexVizItemType(storedType: string): string {
  return storedType === 'pie-chart' ? 'donut-chart' : storedType;
}

/** Merge donut/pie display mode when we still store UI type as `pie-chart` on canvas items. */
export function mergeFlexOptionsForStoredType(
  storedType: string,
  options: Record<string, unknown>
): Record<string, unknown> {
  if (storedType !== 'pie-chart' && storedType !== 'donut-chart') return options;
  const next = { ...options };
  if (storedType === 'pie-chart' && next.mode === undefined) {
    next.mode = 'pie';
  }
  return next;
}
