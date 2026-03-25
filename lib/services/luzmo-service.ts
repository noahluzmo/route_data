import type {
  Dataset,
  FieldMetadata,
  SourceTableConfig,
  EmbedAuthResponse,
  VisualizationSuggestion,
  CanvasItemDefinition,
  VizItemSlot,
} from '@/lib/types';
import { generateInsightSuggestions } from '@/lib/rules/insight-rules';
import { LUZMO_EU_API_HOST, LUZMO_EU_APP_SERVER, normalizeLuzmoApiHost, normalizeLuzmoAppServer } from '@/lib/luzmo/endpoints';
import { DEFAULT_DATASET_ID as FALLBACK_DATASET_ID } from '@/lib/luzmo/defaults';

/**
 * Client-side Flex + API origins (must match `LuzmoVizItemComponent` docs: appServer + apiHost).
 * Values come from `next.config` env (already normalized); we normalize again for safety.
 */
const API_HOST = normalizeLuzmoApiHost(process.env.NEXT_PUBLIC_LUZMO_API_HOST || LUZMO_EU_API_HOST);
const APP_SERVER = normalizeLuzmoAppServer(process.env.NEXT_PUBLIC_LUZMO_APP_SERVER || LUZMO_EU_APP_SERVER);
const DEFAULT_DATASET_ID = process.env.NEXT_PUBLIC_LUZMO_DATASET_ID || FALLBACK_DATASET_ID;

export function getApiHost(): string {
  return API_HOST;
}

export function getAppServer(): string {
  return APP_SERVER;
}

export function getDefaultDatasetId(): string {
  return DEFAULT_DATASET_ID;
}

export async function getEmbedAuthorization(datasetId?: string): Promise<EmbedAuthResponse> {
  const requested = datasetId?.trim() || '';
  const res = await fetch('/api/embed-token', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requested ? { datasetId: requested } : {}),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg =
      typeof errBody?.error === 'string'
        ? errBody.error
        : `Failed to get embed authorization: ${res.status}`;
    throw new Error(msg);
  }
  const data = await res.json();
  const authKey = data.authKey ?? data.id;
  const authToken = data.authToken ?? data.token;
  if (typeof data.warning === 'string' && data.warning.trim()) {
    console.warn('[Luzmo embed-token]', data.warning);
  }
  const datasetIdUsed =
    typeof data.datasetIdUsed === 'string' && data.datasetIdUsed.trim()
      ? data.datasetIdUsed.trim()
      : requested || undefined;
  return {
    authKey,
    authToken,
    warning: typeof data.warning === 'string' ? data.warning : undefined,
    datasetIdUsed,
  };
}

export async function getAuthorizedDatasets(
  authKey: string,
  authToken: string
): Promise<Dataset[]> {
  // ACK DataBroker handles dataset fetching internally when given auth credentials.
  // This function provides the dataset ID list for the authorized user.
  // In production, this would query available datasets from the backend.
  const datasetId = getDefaultDatasetId();
  if (!datasetId) return [];

  return [
    {
      id: datasetId,
      name: { en: 'Dataset' },
      columns: [],
      formulas: [],
    },
  ];
}

export async function getDatasetFields(
  _datasetId: string,
  _authKey: string,
  _authToken: string
): Promise<FieldMetadata[]> {
  // ACK components with auth-key/auth-token will fetch fields automatically via DataBroker.
  // This is a passthrough that returns empty - the ACK panels handle field loading.
  return [];
}

export async function runSourceTableQuery(
  _config: SourceTableConfig,
  _authKey: string,
  _authToken: string
): Promise<{ columns: string[]; rows: unknown[][] }> {
  // TODO: Wire to DataBroker.fetchData() for live query execution
  // The ACK DataBroker would execute:
  // dataBroker.fetchData({
  //   dimensions: config.selectedFieldIds.map(id => ({ column_id: id, set_id: config.datasetId })),
  //   measures: [],
  //   where: config.filters,
  //   limit: { by: config.limit || 100, offset: config.offset || 0 }
  // })
  return { columns: [], rows: [] };
}

export function getVisualizationSuggestions(
  selectedFields: FieldMetadata[],
  datasetId: string
): VisualizationSuggestion[] {
  return generateInsightSuggestions(selectedFields, datasetId);
}

export function buildLuzmoVizConfigFromWorkbookItem(
  item: CanvasItemDefinition
): {
  type: string;
  options: Record<string, unknown>;
  slots: VizItemSlot[];
  filters?: unknown[];
} {
  return {
    type: item.type,
    options: item.options,
    slots: item.slots,
    filters: item.filters,
  };
}
