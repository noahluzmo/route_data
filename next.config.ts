import type { NextConfig } from 'next';
import { normalizeLuzmoApiHost, normalizeLuzmoAppServer } from './lib/luzmo/endpoints';
import { DEFAULT_DATASET_ID } from './lib/luzmo/defaults';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@luzmo/analytics-components-kit',
    '@luzmo/react-embed',
    '@luzmo/lucero',
  ],
  /** Inlined into the client — normalized to EU defaults from Luzmo Flex docs (app.luzmo.com / api.luzmo.com). */
  env: {
    NEXT_PUBLIC_LUZMO_API_HOST: normalizeLuzmoApiHost(process.env.LUZMO_API_HOST),
    NEXT_PUBLIC_LUZMO_APP_SERVER: normalizeLuzmoAppServer(process.env.LUZMO_APP_SERVER),
    NEXT_PUBLIC_LUZMO_DATASET_ID: process.env.LUZMO_DATASET_ID || DEFAULT_DATASET_ID,
  },
};

export default nextConfig;
