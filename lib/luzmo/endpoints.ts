/**
 * Luzmo Flex + API host normalization (EU multi-tenant defaults).
 *
 * Flex is embedded via `@luzmo/react-embed` / `<luzmo-embed-viz-item>` — the library loads the
 * dashboard-app runtime from **appServer** (not a hand-built iframe in our app). You still pass
 * `appServer`, `apiHost`, embed `authKey` / `authToken`, `type`, and `slots` as in the docs.
 *
 * @see https://developer.luzmo.com/guide/guides--creating-a-column-flex-chart.md
 * @see https://developer.luzmo.com/guide/flex--introduction--basic-usage.md
 */

/** EU VPC — matches Luzmo documentation defaults */
export const LUZMO_EU_APP_SERVER = 'https://app.luzmo.com';

/** EU VPC — Luzmo REST API for server SDK + Data API */
export const LUZMO_EU_API_HOST = 'https://api.luzmo.com';

function stripTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, '');
}

/**
 * `appServer` for `LuzmoVizItemComponent` / web component.
 * Coerces common misconfigurations (e.g. marketing `luzmo.com`) to `https://app.luzmo.com`.
 */
export function normalizeLuzmoAppServer(input?: string | null): string {
  const fallback = LUZMO_EU_APP_SERVER;
  if (input == null || !String(input).trim()) return fallback;
  let v = stripTrailingSlashes(String(input).trim());
  try {
    const u = new URL(v);
    const h = u.hostname.toLowerCase();
    if (h === 'luzmo.com' || h === 'www.luzmo.com') {
      return fallback;
    }
    // App runtime is not served from the API host
    if (h === 'api.luzmo.com' || h.endsWith('.api.luzmo.com')) {
      return fallback;
    }
    return v;
  } catch {
    return fallback;
  }
}

/**
 * `apiHost` for Flex + embed. Must be the Luzmo API origin, not the marketing site.
 */
export function normalizeLuzmoApiHost(input?: string | null): string {
  const fallback = LUZMO_EU_API_HOST;
  if (input == null || !String(input).trim()) return fallback;
  let v = stripTrailingSlashes(String(input).trim());
  try {
    const u = new URL(v);
    const h = u.hostname.toLowerCase();
    if (h === 'luzmo.com' || h === 'www.luzmo.com' || h === 'app.luzmo.com') {
      return fallback;
    }
    return v;
  } catch {
    return fallback;
  }
}

/** `@luzmo/nodejs-sdk` `host` option — same origin rules as `normalizeLuzmoApiHost` */
export function normalizeLuzmoNodeSdkHost(input?: string | null): string {
  return normalizeLuzmoApiHost(input);
}
