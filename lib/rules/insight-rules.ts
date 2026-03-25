import type { FieldMetadata, VisualizationSuggestion, VizItemSlot } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const LOGISTICS_KEYWORDS = {
  shipment: ['shipment', 'order', 'consignment', 'parcel', 'load', 'volume', 'weight'],
  carrier: ['carrier', 'provider', '3pl', 'dhl', 'fedex', 'ups'],
  route: ['route', 'lane', 'origin', 'destination', 'hub', 'terminal'],
  warehouse: ['warehouse', 'facility', 'dock', 'fulfillment', 'dc', 'distribution center'],
  delivery: ['delivery', 'promised', 'delay', 'late', 'on-time', 'sla'],
  cost: ['cost', 'price', 'expense', 'freight', 'shipping cost', 'cost per shipment'],
  performance: ['performance', 'reliability', 'attainment', 'exception', 'throughput', 'utilization'],
  region: ['region', 'country', 'state', 'city', 'zone'],
  target: ['target', 'goal', 'benchmark', 'threshold', 'sla'],
  actual: ['actual', 'delivered', 'observed', 'reported'],
};

function fieldMatchesKeywords(field: FieldMetadata, keywords: string[]): boolean {
  const name = (field.name?.en || '').toLowerCase();
  const desc = (field.description?.en || '').toLowerCase();
  return keywords.some((kw) => name.includes(kw) || desc.includes(kw));
}

function getDatetimeFields(fields: FieldMetadata[]): FieldMetadata[] {
  return fields.filter((f) => f.type === 'datetime');
}

function getNumericFields(fields: FieldMetadata[]): FieldMetadata[] {
  return fields.filter((f) => f.type === 'numeric');
}

function getCategoricalFields(fields: FieldMetadata[]): FieldMetadata[] {
  return fields.filter((f) => f.type === 'hierarchy');
}

function makeSlot(name: string, field: FieldMetadata, datasetId: string): VizItemSlot {
  return {
    name,
    content: [{ columnId: field.id, datasetId }],
  };
}

export function generateInsightSuggestions(
  fields: FieldMetadata[],
  datasetId: string
): VisualizationSuggestion[] {
  const suggestions: VisualizationSuggestion[] = [];
  const dateFields = getDatetimeFields(fields);
  const numericFields = getNumericFields(fields);
  const categoricalFields = getCategoricalFields(fields);

  const deliveryMeasures = numericFields.filter((f) => fieldMatchesKeywords(f, LOGISTICS_KEYWORDS.delivery));
  const costMeasures = numericFields.filter((f) => fieldMatchesKeywords(f, LOGISTICS_KEYWORDS.cost));
  const performanceMeasures = numericFields.filter((f) => fieldMatchesKeywords(f, LOGISTICS_KEYWORDS.performance));
  const shipmentMeasures = numericFields.filter((f) => fieldMatchesKeywords(f, LOGISTICS_KEYWORDS.shipment));

  const carrierFields = categoricalFields.filter((f) => fieldMatchesKeywords(f, LOGISTICS_KEYWORDS.carrier));
  const routeFields = categoricalFields.filter((f) => fieldMatchesKeywords(f, LOGISTICS_KEYWORDS.route));
  const warehouseFields = categoricalFields.filter((f) => fieldMatchesKeywords(f, LOGISTICS_KEYWORDS.warehouse));
  const regionFields = categoricalFields.filter((f) => fieldMatchesKeywords(f, LOGISTICS_KEYWORDS.region));
  const modeFields = categoricalFields.filter((f) => (f.name?.en || '').toLowerCase().includes('mode'));

  // 1) Date + delivery measure -> On-Time Delivery Trend / Delivery Delay Trend
  if (dateFields[0] && (deliveryMeasures[0] || numericFields[0])) {
    const measure = deliveryMeasures[0] || numericFields[0];
    const hasDelay =
      (measure.name?.en || '').toLowerCase().includes('delay') ||
      (measure.name?.en || '').toLowerCase().includes('late');
    suggestions.push({
      id: uuidv4(),
      title: hasDelay ? 'Delivery Delay Trend' : 'On-Time Delivery Trend',
      chartType: 'line-chart',
      description: `Track ${measure.name?.en || 'delivery performance'} over time to catch service changes early.`,
      slots: [makeSlot('measure', measure, datasetId), makeSlot('x-axis', dateFields[0], datasetId)],
      options: { display: { title: true, legend: true } },
      category: 'trend',
      icon: '📈',
    });
  }

  // 2) Route-focused ranking
  if (routeFields[0] && (deliveryMeasures[0] || costMeasures[0] || numericFields[0])) {
    const measure = deliveryMeasures[0] || costMeasures[0] || numericFields[0];
    const delayPreferred = fieldMatchesKeywords(measure, LOGISTICS_KEYWORDS.delivery);
    suggestions.push({
      id: uuidv4(),
      title: delayPreferred ? 'Top Delayed Routes' : 'Route Cost Comparison',
      chartType: 'bar-chart',
      description: 'Rank routes to prioritize lane-level corrective actions.',
      slots: [makeSlot('measure', measure, datasetId), makeSlot('y-axis', routeFields[0], datasetId)],
      options: { display: { title: true, legend: false } },
      category: 'ranking',
      icon: '🛣️',
    });
  }

  // 3) Carrier ranking
  if (carrierFields[0] && (performanceMeasures[0] || deliveryMeasures[0] || numericFields[0])) {
    const measure = performanceMeasures[0] || deliveryMeasures[0] || numericFields[0];
    suggestions.push({
      id: uuidv4(),
      title: 'Carrier Performance Ranking',
      chartType: 'bar-chart',
      description: 'Compare carriers by reliability, delay, or exception metrics.',
      slots: [makeSlot('measure', measure, datasetId), makeSlot('y-axis', carrierFields[0], datasetId)],
      options: { display: { title: true, legend: false } },
      category: 'ranking',
      icon: '🚚',
    });
  }

  // 4) Target vs actual -> SLA variance
  const targetFields = numericFields.filter((f) => fieldMatchesKeywords(f, LOGISTICS_KEYWORDS.target));
  const actualFields = numericFields.filter((f) => fieldMatchesKeywords(f, LOGISTICS_KEYWORDS.actual));
  if (targetFields[0] && actualFields[0] && (carrierFields[0] || dateFields[0])) {
    suggestions.push({
      id: uuidv4(),
      title: 'SLA Target vs Actual',
      chartType: 'line-chart',
      description: 'Compare SLA targets and observed results over time or by carrier.',
      slots: [
        {
          name: 'measure',
          content: [
            { columnId: actualFields[0].id, datasetId },
            { columnId: targetFields[0].id, datasetId },
          ],
        },
        makeSlot('x-axis', dateFields[0] || carrierFields[0], datasetId),
      ],
      options: { display: { title: true, legend: true } },
      category: 'comparison',
      icon: '🎯',
    });
  }

  // 5) Warehouse bottleneck comparison
  if (warehouseFields[0] && (performanceMeasures[0] || shipmentMeasures[0] || numericFields[0])) {
    const measure = performanceMeasures[0] || shipmentMeasures[0] || numericFields[0];
    suggestions.push({
      id: uuidv4(),
      title: 'Warehouse Throughput Comparison',
      chartType: 'bar-chart',
      description: 'Compare warehouse throughput, utilization, or exception rates.',
      slots: [makeSlot('measure', measure, datasetId), makeSlot('y-axis', warehouseFields[0], datasetId)],
      options: { display: { title: true, legend: false } },
      category: 'comparison',
      icon: '🏭',
    });
  }

  // 6) KPI cards
  for (const field of [deliveryMeasures[0], costMeasures[0], performanceMeasures[0]].filter(Boolean) as FieldMetadata[]) {
    const name = (field.name?.en || 'Metric').toLowerCase();
    let title = `${field.name?.en || 'Metric'} KPI`;
    if (name.includes('on-time')) title = 'On-Time Delivery %';
    if (name.includes('delay')) title = 'Average Delivery Delay';
    if (name.includes('cost')) title = 'Cost per Shipment';
    if (name.includes('exception')) title = 'Exception Rate';
    if (name.includes('throughput')) title = 'Warehouse Throughput';
    if (name.includes('dock')) title = 'Dock Utilization';
    if (name.includes('reliability')) title = 'Carrier Reliability Score';
    suggestions.push({
      id: uuidv4(),
      title,
      chartType: 'evolution-number',
      description: `Key logistics KPI for ${(field.name?.en || 'operations').toLowerCase()}.`,
      slots: [makeSlot('measure', field, datasetId)],
      options: { display: { title: true } },
      category: 'kpi',
      icon: '📌',
    });
  }

  // 7) Regional cost/volume or late deliveries
  if (regionFields[0] && (costMeasures[0] || shipmentMeasures[0] || deliveryMeasures[0] || numericFields[0])) {
    const measure = costMeasures[0] || shipmentMeasures[0] || deliveryMeasures[0] || numericFields[0];
    const isDelay = fieldMatchesKeywords(measure, LOGISTICS_KEYWORDS.delivery);
    suggestions.push({
      id: uuidv4(),
      title: isDelay ? 'Late Deliveries by Region' : 'Cost per Shipment by Region',
      chartType: 'bar-chart',
      description: 'Compare regional performance to identify hotspots and outliers.',
      slots: [makeSlot('measure', measure, datasetId), makeSlot('y-axis', regionFields[0], datasetId)],
      options: { display: { title: true, legend: false } },
      category: 'comparison',
      icon: '🌍',
    });
  }

  // 8) Distribution by mode / lane
  if ((modeFields[0] || routeFields[0] || carrierFields[0]) && (shipmentMeasures[0] || numericFields[0])) {
    const category = modeFields[0] || routeFields[0] || carrierFields[0];
    const measure = shipmentMeasures[0] || numericFields[0];
    suggestions.push({
      id: uuidv4(),
      title: modeFields[0] ? 'Transport Mode Performance' : 'Shipment Volume by Lane',
      chartType: 'donut-chart',
      description: 'View proportional contribution by mode, lane, or carrier.',
      slots: [makeSlot('measure', measure, datasetId), makeSlot('legend', category, datasetId)],
      options: { display: { title: true, legend: true } },
      category: 'distribution',
      icon: '🍩',
    });
  }

  // Ensure minimum suggestions even with limited field metadata.
  if (suggestions.length === 0 && numericFields.length > 0) {
    suggestions.push({
      id: uuidv4(),
      title: `${numericFields[0].name?.en || 'Metric'} Summary`,
      chartType: 'evolution-number',
      description: 'A summary KPI card for your selected logistics metric.',
      slots: [makeSlot('measure', numericFields[0], datasetId)],
      options: { display: { title: true } },
      category: 'kpi',
      icon: '📌',
    });
  }

  return suggestions;
}
