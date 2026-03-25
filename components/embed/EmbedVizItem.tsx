'use client';

import React from 'react';
import type { CanvasItemDefinition } from '@/lib/types';

interface EmbedVizItemProps {
  item: CanvasItemDefinition;
  authKey: string;
  authToken: string;
  appServer?: string;
  apiHost?: string;
}

export default function EmbedVizItem({ item, authKey, authToken }: EmbedVizItemProps) {
  const hasContent = item.slots.some((s) => s.content.length > 0);

  if (!authKey || !authToken || !hasContent) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg p-4">
        <p className="text-xs text-gray-400 font-medium">
          {!hasContent ? 'Configure chart data to preview' : 'Awaiting authorization...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50/50 rounded-lg p-6">
      <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p className="text-xs font-medium text-gray-600 mb-1">Visualization</p>
      <p className="text-[10px] text-gray-400 text-center">{item.type}</p>
      <div className="mt-2 px-2 py-1 rounded bg-green-50 text-[9px] text-green-600 font-mono">connected</div>
    </div>
  );
}
