'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
  type LayoutItem,
  type ResponsiveLayouts,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { CanvasItemDefinition, NativeChartSpec } from '@/lib/types';
import { DataChartCanvas } from '@/components/charts/DataChartCanvas';
import { getApiHost, getAppServer } from '@/lib/services/luzmo-service';
import { LUZMO_DASHBOARD_CONTENTS_VERSION } from '@/lib/luzmo-embed-constants';
import { mergeShipbobFlexOptions } from '@/lib/luzmo/flex-chart-theme';
import { mergeFlexOptionsForStoredType, toFlexVizItemType } from '@/lib/luzmo/flex-viz-type';
import { StackLabelBadge } from '@/components/dev/StackLabelBadge';

const CHART_TYPE_ICONS: Record<string, string> = {
  'bar-chart': '📊',
  'line-chart': '📈',
  'area-chart': '📉',
  'donut-chart': '🍩',
  'pie-chart': '🥧',
  'evolution-number': '📌',
  'column-chart': '📊',
  'data-chart': '📊',
  'scatter-plot': '⚡',
  'heat-map': '🌡',
  'regular-table': '📋',
  'bubble-chart': '🫧',
  'treemap-chart': '🌳',
  'sunburst-chart': '☀️',
  'circle-pack-chart': '⭕',
  'pivot-table': '📑',
};

interface WorkbookCanvasProps {
  items: CanvasItemDefinition[];
  authKey: string;
  authToken: string;
  onItemAction?: (action: string, itemId: string) => void;
  onEditItem?: (item: CanvasItemDefinition) => void;
  onLayoutChange?: (items: CanvasItemDefinition[]) => void;
  viewMode?: boolean;
  onEmbedAuthorizationExpired?: () => void | Promise<void>;
}

function readNativeChart(item: CanvasItemDefinition): NativeChartSpec | null {
  const raw = item.options?.nativeChart;
  if (raw && typeof raw === 'object' && 'datasetId' in raw && 'kind' in raw) {
    return raw as NativeChartSpec;
  }
  return null;
}

/** Legacy Luzmo Flex single-item embed (`LuzmoVizItemComponent`) — Chart Data tab. */
function FlexVizItem({
  item,
  authKey,
  authToken,
  onEmbedAuthorizationExpired,
}: {
  item: CanvasItemDefinition;
  authKey: string;
  authToken: string;
  onEmbedAuthorizationExpired?: () => void | Promise<void>;
}) {
  const [LuzmoViz, setLuzmoViz] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    import('@luzmo/react-embed')
      .then((mod) => {
        setLuzmoViz(() => mod.LuzmoVizItemComponent);
      })
      .catch(() => {
        setLoadError(true);
      });
  }, []);

  const themedOptions = useMemo(() => {
    const base = mergeFlexOptionsForStoredType(item.type, (item.options ?? {}) as Record<string, unknown>);
    return mergeShipbobFlexOptions(base, { mode: 'preview' });
  }, [item.type, item.options]);

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-xs text-red-500">
        Failed to load visualization
      </div>
    );
  }

  if (!LuzmoViz) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authKey || !authToken || !item.slots || item.slots.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50/50">
        <span className="text-3xl mb-2">{CHART_TYPE_ICONS[item.type] || '📊'}</span>
        <p className="text-xs text-gray-400 text-center">
          {!authKey ? 'Waiting for authentication...' : 'No slot data configured'}
        </p>
      </div>
    );
  }

  const appServer = getAppServer();
  const apiHost = getApiHost();

  return (
    <StackLabelBadge
      className="h-full w-full"
      label="LuzmoVizItemComponent"
      description="Single Flex chart for the Chart Data tab: full Flex rendering inside a workbook tile."
      title="@luzmo/react-embed — luzmo-embed-viz-item (WorkbookCanvas)"
      variant="flex"
    >
      <LuzmoViz
        key={`${item.id}-${authKey}`}
        appServer={appServer}
        apiHost={apiHost}
        authKey={authKey}
        authToken={authToken}
        type={toFlexVizItemType(item.type)}
        options={themedOptions}
        slots={item.slots}
        contextId={item.id}
        dashboardContentsVersion={LUZMO_DASHBOARD_CONTENTS_VERSION}
        style={{ width: '100%', height: '100%' }}
        onAuthorizationExpired={() => {
          void onEmbedAuthorizationExpired?.();
        }}
      />
    </StackLabelBadge>
  );
}

function itemToLayout(item: CanvasItemDefinition): LayoutItem {
  return {
    i: item.id,
    x: item.position.col,
    y: item.position.row,
    w: item.position.sizeX,
    h: item.position.sizeY,
    minW: 2,
    minH: 3,
    maxW: 12,
  };
}

export default function WorkbookCanvas({
  items,
  authKey,
  authToken,
  onItemAction,
  onEditItem,
  onLayoutChange,
  viewMode,
  onEmbedAuthorizationExpired,
}: WorkbookCanvasProps) {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 800 });

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const layout = useMemo(() => items.map(itemToLayout), [items]);

  const handleLayoutChange = useCallback(
    (newLayout: Layout, _layouts: ResponsiveLayouts) => {
      if (!onLayoutChange) return;
      const currentItems = itemsRef.current;
      let changed = false;
      const updatedItems = currentItems.map((item) => {
        const l = newLayout.find((n) => n.i === item.id);
        if (!l) return item;
        const newPos = { col: l.x, row: l.y, sizeX: l.w, sizeY: l.h };
        if (
          newPos.col !== item.position.col ||
          newPos.row !== item.position.row ||
          newPos.sizeX !== item.position.sizeX ||
          newPos.sizeY !== item.position.sizeY
        ) {
          changed = true;
          return { ...item, position: newPos };
        }
        return item;
      });
      if (changed) onLayoutChange(updatedItems);
    },
    [onLayoutChange]
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-8">
        <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">Empty Canvas</h3>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          Add charts from the Suggestions panel on the right.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4" ref={containerRef}>
      {mounted && (
      <ResponsiveGridLayout
        className="layout"
        width={width}
        layouts={{ lg: layout, md: layout, sm: layout }}
        breakpoints={{ lg: 1200, md: 768, sm: 0 }}
        cols={{ lg: 12, md: 8, sm: 4 }}
        rowHeight={40}
        dragConfig={{ enabled: !viewMode, bounded: false, handle: '.drag-handle', threshold: 3 }}
        resizeConfig={{ enabled: !viewMode, handles: ['se', 'e', 's'] }}
        onLayoutChange={handleLayoutChange}
        compactor={verticalCompactor}
        margin={[16, 16]}
      >
        {items.map((item) => {
          const native = readNativeChart(item);
          return (
          <div
            key={item.id}
            className="group relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md"
          >
            <div className="drag-handle flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white cursor-grab active:cursor-grabbing select-none flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                </svg>
                <span className="text-xs flex-shrink-0">{CHART_TYPE_ICONS[item.type] || '📊'}</span>
                <h4 className="text-xs font-semibold text-gray-700 truncate">{item.title}</h4>
              </div>
              {!viewMode && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {onEditItem && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditItem(item); }}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit chart"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}
                  {onItemAction && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onItemAction('delete', item.id); }}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {item.type === 'data-chart' && native ? (
                <DataChartCanvas
                  authKey={authKey}
                  authToken={authToken}
                  nativeChart={native}
                />
              ) : item.type === 'data-chart' ? (
                <div className="h-full flex items-center justify-center p-4 text-[10px] text-amber-700 bg-amber-50/50 text-center">
                  This chart is missing <code className="mx-0.5">nativeChart</code> in options. Remove it and add again from Suggestions.
                </div>
              ) : item.slots && item.slots.length > 0 ? (
                <FlexVizItem
                  item={item}
                  authKey={authKey}
                  authToken={authToken}
                  onEmbedAuthorizationExpired={onEmbedAuthorizationExpired}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50/50">
                  <span className="text-2xl mb-2">{CHART_TYPE_ICONS[item.type] || '📊'}</span>
                  <p className="text-[10px] text-gray-500 text-center">
                    No chart data. Use <strong>Suggestions</strong> or <strong>Chart Data</strong> to configure slots.
                  </p>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </ResponsiveGridLayout>
      )}
    </div>
  );
}
