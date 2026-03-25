import { NextResponse } from 'next/server';
import Luzmo from '@luzmo/nodejs-sdk';
import { normalizeLuzmoNodeSdkHost } from '@/lib/luzmo/endpoints';
import { DEFAULT_DATASET_ID } from '@/lib/luzmo/defaults';

const getClient = () => {
  const apiKey = process.env.LUZMO_API_KEY;
  const apiToken = process.env.LUZMO_API_TOKEN;
  if (!apiKey || !apiToken) throw new Error('Luzmo API credentials not configured');
  return new Luzmo({
    api_key: apiKey,
    api_token: apiToken,
    host: normalizeLuzmoNodeSdkHost(process.env.LUZMO_API_HOST),
  });
};

interface LuzmoColumn {
  id: string;
  name: Record<string, string>;
  type: string;
  subtype: string | null;
  lowestLevel?: number;
  highestLevel?: number;
  hierarchy_enabled?: boolean;
}

export async function GET() {
  try {
    const datasetId = process.env.LUZMO_DATASET_ID || DEFAULT_DATASET_ID;
    if (!datasetId) {
      return NextResponse.json({ error: 'No dataset ID configured' }, { status: 500 });
    }

    const client = getClient();

    const dsResponse = await client.get('securable', {
      where: { id: datasetId },
      attributes: ['id', 'name'],
      include: [{
        model: 'Column',
        attributes: ['id', 'name', 'type', 'subtype', 'lowestLevel', 'highestLevel', 'hierarchy_enabled'],
      }],
    });

    const dataset = (dsResponse as { rows: Array<{ id: string; name: Record<string, string>; columns: LuzmoColumn[] }> }).rows[0];
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // Get row count via data API
    const apiHost = normalizeLuzmoNodeSdkHost(process.env.LUZMO_API_HOST);
    const countRes = await fetch(`${apiHost}/0.1.0/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: process.env.LUZMO_API_KEY,
        token: process.env.LUZMO_API_TOKEN,
        version: '0.1.0',
        action: 'get',
        find: {
          queries: [{
            dimensions: [],
            measures: [{
              column_id: dataset.columns[0]?.id,
              dataset_id: datasetId,
              aggregation: { type: 'count' },
            }],
          }],
        },
      }),
    });

    let totalRows = 0;
    if (countRes.ok) {
      const countJson = await countRes.json();
      totalRows = countJson.data?.[0]?.[0] ?? 0;
    }

    return NextResponse.json({
      id: dataset.id,
      name: dataset.name.en || Object.values(dataset.name)[0] || 'Unnamed Dataset',
      totalRows,
      columns: dataset.columns.map((c: LuzmoColumn) => ({
        id: c.id,
        name: c.name.en || Object.values(c.name)[0] || 'Unnamed',
        type: c.type,
        subtype: c.subtype,
        lowestLevel: c.lowestLevel,
        highestLevel: c.highestLevel,
        hierarchy_enabled: c.hierarchy_enabled,
      })),
    });
  } catch (err) {
    console.error('Dataset info API error:', err);
    const message = err instanceof Error ? err.message : 'Failed to load dataset info';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
