'use client';

import React from 'react';

/** Small SVG by Luzmo Flex chart type id (bar-chart, line-chart, …). */
export function ChartTypeIcon({ chartType, className = 'w-4 h-4' }: { chartType: string; className?: string }) {
  switch (chartType) {
    case 'line-chart':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 17l6-6 4 4 8-10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'area-chart':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 19V5l6 6 4-4 6 6v6H4z" opacity="0.95" />
        </svg>
      );
    case 'column-chart':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="11" width="3.5" height="9" rx="1" />
          <rect x="10" y="7" width="3.5" height="13" rx="1" />
          <rect x="16" y="10" width="3.5" height="10" rx="1" />
        </svg>
      );
    case 'bar-chart':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="4" width="12" height="3" rx="1" />
          <rect x="4" y="10.5" width="16" height="3" rx="1" />
          <rect x="4" y="17" width="9" height="3" rx="1" />
        </svg>
      );
    case 'donut-chart':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'pie-chart':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4a8 8 0 018 8h-8V4z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'evolution-number':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="4" width="12" height="16" rx="3" />
          <path d="M9.2 16.2c.6 0 1.1-.5 1.1-1.1 0-.6-.5-1.1-1.1-1.1h-1" />
          <path d="M14 7h2" />
          <path d="M13 16.2h3" />
        </svg>
      );
    case 'scatter-plot':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="6" cy="18" r="1.5" />
          <circle cx="10" cy="13" r="1.5" />
          <circle cx="14" cy="9" r="1.5" />
          <circle cx="18" cy="12" r="1.5" />
          <path d="M4 20L20 8" strokeLinecap="round" />
        </svg>
      );
    case 'heat-map':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l-6 3 1-7 7-9 7 9 1 7-6-3" />
          <path d="M12 14c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3z" />
          <circle cx="12" cy="11" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'regular-table':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M4 10h16M10 5v14" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </svg>
      );
  }
}
