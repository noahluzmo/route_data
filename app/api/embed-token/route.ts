import { NextResponse } from 'next/server';
import Luzmo from '@luzmo/nodejs-sdk';
import { normalizeLuzmoNodeSdkHost } from '@/lib/luzmo/endpoints';
import { DEFAULT_DATASET_ID } from '@/lib/luzmo/defaults';

const DEFAULT_HOST = normalizeLuzmoNodeSdkHost(process.env.LUZMO_API_HOST);

/** Normalize create('authorization') API response — shape varies slightly by API version. */
function extractEmbedCredentials(authorization: unknown): { id: string; token: string } | null {
  if (!authorization || typeof authorization !== 'object') return null;
  const o = authorization as Record<string, unknown>;
  if (typeof o.id === 'string' && typeof o.token === 'string') {
    return { id: o.id, token: o.token };
  }
  const props = o.properties;
  if (props && typeof props === 'object') {
    const p = props as Record<string, unknown>;
    if (typeof p.id === 'string' && typeof p.token === 'string') {
      return { id: p.id, token: p.token };
    }
  }
  const rows = o.rows;
  if (Array.isArray(rows) && rows.length > 0 && rows[0] && typeof rows[0] === 'object') {
    const r = rows[0] as Record<string, unknown>;
    if (typeof r.id === 'string' && typeof r.token === 'string') {
      return { id: r.id, token: r.token };
    }
  }
  return null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveDatasetId(bodyDataset?: unknown): string {
  if (typeof bodyDataset === 'string' && bodyDataset.trim()) {
    return bodyDataset.trim();
  }
  return (
    process.env.LUZMO_DATASET_ID ||
    process.env.NEXT_PUBLIC_LUZMO_DATASET_ID ||
    DEFAULT_DATASET_ID
  ).trim();
}

function extractEmbedWarning(authorization: unknown): string | undefined {
  if (!authorization || typeof authorization !== 'object') return undefined;
  const o = authorization as Record<string, unknown>;
  if (typeof o.warning === 'string' && o.warning.trim()) return o.warning.trim();
  const props = o.properties;
  if (props && typeof props === 'object') {
    const w = (props as Record<string, unknown>).warning;
    if (typeof w === 'string' && w.trim()) return w.trim();
  }
  return undefined;
}

export async function POST(request: Request) {
  const apiKey = process.env.LUZMO_API_KEY;
  const apiToken = process.env.LUZMO_API_TOKEN;

  if (!apiKey || !apiToken) {
    return NextResponse.json(
      { error: 'Luzmo API credentials not configured' },
      { status: 500 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const datasetId = resolveDatasetId(body.datasetId);

  if (datasetId && !UUID_RE.test(datasetId)) {
    return NextResponse.json(
      { error: 'datasetId must be a valid UUID (Luzmo securable id).' },
      { status: 400 }
    );
  }

  if (!datasetId) {
    return NextResponse.json(
      {
        error:
          'No dataset ID for embed access. Set LUZMO_DATASET_ID in .env.local or ensure NEXT_PUBLIC_LUZMO_DATASET_ID is set.',
      },
      { status: 400 }
    );
  }

  try {
    const client = new Luzmo({
      api_key: apiKey,
      api_token: apiToken,
      host: DEFAULT_HOST,
    });

    /**
     * @see https://developer.luzmo.com/guide/dashboard-embedding--generating-an-authorization-token.md
     * @see https://developer.luzmo.com/api/createAuthorization.md
     * - `access.datasets[].id` + `rights: "use"` → minimum for Luzmo Flex.
     * - `suborganization` defaults to `routedata` for local demos; set `LUZMO_EMBED_SUBORGANIZATION` to your Luzmo org slug.
     */
    const embedUsername =
      (process.env.LUZMO_EMBED_USERNAME || 'routedata-demo-user').trim() || 'routedata-demo-user';
    const embedName = (process.env.LUZMO_EMBED_NAME || 'RouteData').trim() || 'RouteData';
    const embedEmail = (process.env.LUZMO_EMBED_EMAIL || 'demo@example.com').trim() || 'demo@example.com';
    const subOrg =
      (process.env.LUZMO_EMBED_SUBORGANIZATION || 'routedata').trim() || 'routedata';
    const roleRaw = (process.env.LUZMO_EMBED_ROLE || 'designer').trim().toLowerCase();
    const role = roleRaw === 'viewer' || roleRaw === 'owner' ? roleRaw : 'designer';

    const authProperties: Record<string, unknown> = {
      type: 'embed',
      username: embedUsername,
      name: embedName,
      email: embedEmail,
      suborganization: subOrg,
      role,
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      inactivity_interval: 3600,
      access: {
        datasets: [{ id: datasetId, rights: 'use' as const }],
      },
    };

    const authorization = await client.create('authorization', authProperties);

    const creds = extractEmbedCredentials(authorization);
    if (!creds) {
      console.error('Unexpected authorization response shape:', JSON.stringify(authorization));
      return NextResponse.json(
        { error: 'Invalid authorization response from Luzmo API' },
        { status: 502 }
      );
    }

    const warning = extractEmbedWarning(authorization);
    if (warning) {
      console.warn('Luzmo embed authorization warning:', warning);
    }

    return NextResponse.json({
      authKey: creds.id,
      authToken: creds.token,
      datasetIdUsed: datasetId,
      ...(warning ? { warning } : {}),
    });
  } catch (err: unknown) {
    console.error('Embed token generation failed:', err);
    const msg =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Failed to generate embed authorization';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
