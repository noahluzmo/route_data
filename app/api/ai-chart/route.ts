import { NextResponse } from 'next/server';
import Luzmo from '@luzmo/nodejs-sdk';
import { normalizeLuzmoNodeSdkHost } from '@/lib/luzmo/endpoints';
import { generateFlexSuggestions, type DatasetColumn } from '@/lib/luzmo/chart-suggestions';
import { enrichSlotsWithFieldLabels } from '@/lib/luzmo/enrich-slot-labels';
import { DEFAULT_DATASET_ID } from '@/lib/luzmo/defaults';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface LuzmoColumn {
  id: string;
  name: Record<string, string>;
  type: string;
  subtype: string | null;
  lowestLevel?: number;
  highestLevel?: number;
  hierarchy_enabled?: boolean;
}

interface GeneratedChartResponse {
  generatedChart?: {
    type?: string;
    title?: Record<string, string> | string;
    options?: Record<string, unknown>;
    slots?: unknown[];
  };
}

function labelFromTitle(title: string | Record<string, string> | undefined): string {
  if (!title) return 'AI Generated Chart';
  if (typeof title === 'string') return title;
  return title.en || Object.values(title)[0] || 'AI Generated Chart';
}

function toDatasetColumn(c: LuzmoColumn): DatasetColumn {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    subtype: c.subtype ?? undefined,
    lowestLevel: c.lowestLevel,
    highestLevel: c.highestLevel,
    hierarchy_enabled: c.hierarchy_enabled,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.LUZMO_API_KEY;
  const apiToken = process.env.LUZMO_API_TOKEN;
  if (!apiKey || !apiToken) {
    return NextResponse.json({ error: 'Luzmo API credentials not configured' }, { status: 500 });
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const datasetIdRaw =
    (typeof body.dataset_id === 'string' && body.dataset_id.trim()) ||
    (typeof body.datasetId === 'string' && body.datasetId.trim()) ||
    process.env.LUZMO_DATASET_ID ||
    DEFAULT_DATASET_ID;
  const datasetId = datasetIdRaw.trim();

  if (!datasetId || !UUID_RE.test(datasetId)) {
    return NextResponse.json({ error: 'Valid dataset_id (UUID) is required' }, { status: 400 });
  }

  const selectedIds = Array.isArray(body.selected_column_ids)
    ? (body.selected_column_ids as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  const question = typeof body.question === 'string' ? body.question.trim() : '';

  try {
    const client = new Luzmo({
      api_key: apiKey,
      api_token: apiToken,
      host: normalizeLuzmoNodeSdkHost(process.env.LUZMO_API_HOST),
    });

    const dsResponse = await client.get('securable', {
      where: { id: datasetId },
      attributes: ['id', 'name'],
      include: [
        {
          model: 'Column',
          attributes: [
            'id',
            'name',
            'type',
            'subtype',
            'lowestLevel',
            'highestLevel',
            'hierarchy_enabled',
          ],
        },
      ],
    });

    const rows = (dsResponse as { rows?: Array<{ columns?: LuzmoColumn[] }> }).rows;
    const dataset = rows?.[0];
    const allCols = dataset?.columns ?? [];
    if (allCols.length === 0) {
      return NextResponse.json({ error: 'Dataset has no columns' }, { status: 404 });
    }

    if (question) {
      const aiResponse = (await client.create('aichart', {
        type: 'generate-chart',
        dataset_id: datasetId,
        question,
      })) as GeneratedChartResponse;

      const generated = aiResponse.generatedChart;
      if (!generated?.type || !Array.isArray(generated.slots)) {
        return NextResponse.json({ error: 'AI chart generation returned an invalid response' }, { status: 502 });
      }

      const columnFields = allCols.map((c) => ({ id: c.id, name: c.name }));

      return NextResponse.json({
        aiChart: {
          title: labelFromTitle(generated.title),
          chartType: generated.type,
          slots: enrichSlotsWithFieldLabels(generated.slots, columnFields),
          options: (generated.options ?? {}) as Record<string, unknown>,
        },
      });
    }

    const idSet = new Set(selectedIds);
    const selectedCols: DatasetColumn[] = (
      selectedIds.length > 0 ? allCols.filter((c) => idSet.has(c.id)) : allCols
    ).map(toDatasetColumn);

    const charts = generateFlexSuggestions(selectedCols, datasetId);

    return NextResponse.json({ charts });
  } catch (err: unknown) {
    console.error('ai-chart route:', err);
    const msg =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Failed to build chart suggestions';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
