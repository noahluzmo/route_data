import { NextResponse } from 'next/server';
import { DEFAULT_DATASET_ID } from '@/lib/luzmo/defaults';
import { KPI_COLUMN_IDS as COL } from '@/lib/domain/kpi-columns';

const LUZMO_API_HOST = process.env.LUZMO_API_HOST || 'https://api.luzmo.com';
const DATASET_ID = process.env.LUZMO_DATASET_ID || DEFAULT_DATASET_ID;
const API_KEY = process.env.LUZMO_API_KEY || '';
const API_TOKEN = process.env.LUZMO_API_TOKEN || '';

function m(colId: string, agg: string) {
  return { column_id: colId, dataset_id: DATASET_ID, aggregation: { type: agg } };
}

async function queryLuzmo(queries: unknown[]) {
  const res = await fetch(`${LUZMO_API_HOST}/0.1.0/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: API_KEY,
      token: API_TOKEN,
      version: '0.1.0',
      action: 'get',
      find: { queries },
    }),
  });
  if (!res.ok) throw new Error(`Luzmo query failed: ${res.status}`);
  return res.json();
}

function unwrap(val: unknown): string | number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'id' in val) {
    return (val as { id: string }).id;
  }
  return null;
}

export async function GET() {
  try {
    const result = await queryLuzmo([
      // Query 0: overall averages for KPI cards
      {
        dimensions: [],
        measures: [
          m(COL.onTimeDeliveryPct, 'average'),
          m(COL.avgDeliveryDelay, 'average'),
          m(COL.costPerShipment, 'average'),
          m(COL.carrierReliability, 'average'),
          m(COL.exceptionRate, 'average'),
          m(COL.dockUtilization, 'average'),
          m(COL.throughput, 'average'),
          m(COL.slaAttainment, 'average'),
        ],
      },
      // Query 1: latest 200 rows sorted by date desc (for trend deltas)
      {
        dimensions: [
          { column_id: COL.date, dataset_id: DATASET_ID },
        ],
        measures: [
          m(COL.onTimeDeliveryPct, 'sum'),
          m(COL.avgDeliveryDelay, 'sum'),
          m(COL.costPerShipment, 'sum'),
        ],
        order: [{ column_id: COL.date, dataset_id: DATASET_ID, order: 'desc' }],
        limit: { by: 200, offset: 0 },
      },
      // Query 2: row count
      {
        dimensions: [],
        measures: [m(COL.onTimeDeliveryPct, 'count')],
      },
    ]);

    const allData = Array.isArray(result) ? result : [result];
    const q0 = allData[0]?.data?.[0] ?? allData[0]?.data?.[0]?.data?.[0] ?? [];
    const q1Rows = allData[1]?.data ?? [];
    const q2 = allData[2]?.data?.[0] ?? [];

    const avg = {
      onTimeDeliveryPct: (unwrap(q0[0]) as number) ?? 0,
      avgDeliveryDelay: (unwrap(q0[1]) as number) ?? 0,
      costPerShipment: (unwrap(q0[2]) as number) ?? 0,
      carrierReliability: (unwrap(q0[3]) as number) ?? 0,
      exceptionRate: (unwrap(q0[4]) as number) ?? 0,
      dockUtilization: (unwrap(q0[5]) as number) ?? 0,
      throughput: (unwrap(q0[6]) as number) ?? 0,
      slaAttainment: (unwrap(q0[7]) as number) ?? 0,
    };

    const totalRows = unwrap(q2[0]) as number ?? 0;

    // Split the time series into recent half and older half for comparison
    const recentHalf = q1Rows.slice(0, Math.floor(q1Rows.length / 2));
    const olderHalf = q1Rows.slice(Math.floor(q1Rows.length / 2));

    function avgOfCol(rows: unknown[][], colIdx: number): number {
      if (rows.length === 0) return 0;
      const sum = rows.reduce((acc: number, row: unknown[]) => acc + ((unwrap(row[colIdx]) as number) ?? 0), 0);
      return sum / rows.length;
    }

    const recentOnTime = avgOfCol(recentHalf, 1);
    const olderOnTime = avgOfCol(olderHalf, 1);
    const deliveryTrend = olderOnTime > 0 ? ((recentOnTime - olderOnTime) / olderOnTime) * 100 : 0;

    const recentDelay = avgOfCol(recentHalf, 2);
    const olderDelay = avgOfCol(olderHalf, 2);
    const delayTrend = olderDelay > 0 ? ((recentDelay - olderDelay) / olderDelay) * 100 : 0;

    const recentCost = avgOfCol(recentHalf, 3);
    const olderCost = avgOfCol(olderHalf, 3);
    const costTrend = olderCost > 0 ? ((recentCost - olderCost) / olderCost) * 100 : 0;

    return NextResponse.json({
      kpis: {
        onTimeDeliveryPct: avg.onTimeDeliveryPct,
        avgDeliveryDelay: avg.avgDeliveryDelay,
        costPerShipment: avg.costPerShipment,
        carrierReliability: avg.carrierReliability,
        deliveryTrend: Math.round(deliveryTrend),
        delayTrend: Math.round(delayTrend),
        costTrend: Math.round(costTrend),
      },
      targets: [
        {
          name: 'SLA Attainment',
          metric: 'On-time deliveries against SLA target',
          current: Math.round(avg.slaAttainment * 10) / 10,
          target: 95,
          unit: '%',
          year: 2027,
          progress: Math.max(0, Math.min(100, Math.round((avg.slaAttainment / 95) * 100))),
        },
        {
          name: 'Carrier Reliability Score',
          metric: 'Carrier reliability benchmark',
          current: Math.round(avg.carrierReliability * 10) / 10,
          target: 90,
          unit: '%',
          year: 2027,
          progress: Math.min(100, Math.round((avg.carrierReliability / 90) * 100)),
        },
        {
          name: 'Average Delivery Delay',
          metric: 'Delay threshold against promise date',
          current: Math.round(avg.avgDeliveryDelay * 10) / 10,
          target: 2,
          unit: 'hr',
          year: 2027,
          progress: Math.max(0, Math.min(100, Math.round((2 / (avg.avgDeliveryDelay || 1)) * 100))),
        },
        {
          name: 'Dock Utilization',
          metric: 'Average dock utilization rate',
          current: Math.round(avg.dockUtilization * 10) / 10,
          target: 85,
          unit: '%',
          year: 2027,
          progress: Math.min(100, Math.round((avg.dockUtilization / 85) * 100)),
        },
        {
          name: 'Warehouse Throughput',
          metric: 'Processed shipment volume',
          current: Math.round(avg.throughput * 10) / 10,
          target: 1200,
          unit: 'shipments/day',
          year: 2027,
          progress: Math.min(100, Math.round((avg.throughput / 1200) * 100)),
        },
      ],
      dataset: {
        name: 'Logistics Dataset',
        id: DATASET_ID,
        totalRows,
        columns: Object.keys(COL).length,
      },
    });
  } catch (err) {
    console.error('Platform data API error:', err);
    const message = err instanceof Error ? err.message : 'Failed to load platform data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
