'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ErrorBoundary from '@/components/ErrorBoundary';
import SideNav, { type AppPage } from '@/components/nav/SideNav';
import Header from '@/components/ui/Header';
import StepSourceTable from '@/components/workflow/StepSourceTable';

/** ACK / Lit modules assume browser globals during import — skip SSR for this step. */
const StepDashboardBuilder = dynamic(
  () => import('@/components/workflow/StepDashboardBuilder'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center p-12 bg-gray-50/50">
        <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
          <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          Loading workbook editor…
        </div>
      </div>
    ),
  }
);
import LoadWorkbookDialog from '@/components/workbook/LoadWorkbookDialog';
import SaveWorkbookDialog from '@/components/workbook/SaveWorkbookDialog';
import HomePage from '@/components/pages/HomePage';
import DashboardsPage from '@/components/pages/DashboardsPage';
import DataSourcesPage from '@/components/pages/DataSourcesPage';
import TargetsPage from '@/components/pages/TargetsPage';
import SettingsPage from '@/components/pages/SettingsPage';
import { useAuth } from '@/hooks/useAuth';
import { useWorkbook } from '@/hooks/useWorkbook';
import { usePlatformData } from '@/hooks/usePlatformData';
import { getDefaultDatasetId } from '@/lib/services/luzmo-service';
import { deleteWorkbookDefinition, loadWorkbookDefinitions } from '@/lib/services/workbook-service';
import type { CanvasItemDefinition, FieldMetadata } from '@/lib/types';
import { DevStackLabelsProvider } from '@/components/dev/DevStackLabelsProvider';
import { DevStackLabelsToggleBar } from '@/components/dev/DevStackLabelsToggleBar';

type WorkflowStep = 'source-table' | 'dashboard';

export default function Home() {
  const { auth, status, loading: authLoading, refresh: refreshEmbedAuth } = useAuth();
  const wb = useWorkbook();
  const defaultDatasetId = getDefaultDatasetId();
  const { data: platformData, loading: platformLoading } = usePlatformData();

  const [page, setPage] = useState<AppPage>('home');
  const [step, setStep] = useState<WorkflowStep>('source-table');
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const datasetId = wb.workbook.sourceTable.datasetId || defaultDatasetId;
  const homeDatasetId = platformData?.dataset.id || defaultDatasetId;
  const authKey = auth?.authKey || '';
  const authToken = auth?.authToken || '';

  /** Flex + ACK need an embed token scoped to the same dataset as slots/fields, or charts spin forever. */
  const embedReadyForDataset =
    Boolean(auth && datasetId && auth.datasetIdUsed === datasetId);

  const lastEmbedRefreshRef = useRef(0);

  // Keep embed token aligned with the workbook dataset (fixes perpetual Flex spinner on luzmo-item-grid).
  useEffect(() => {
    if (page !== 'reporting' || !datasetId) return;
    if (auth?.datasetIdUsed === datasetId) return;
    void refreshEmbedAuth({ silent: true, datasetId });
  }, [page, datasetId, auth?.datasetIdUsed, refreshEmbedAuth]);

  useEffect(() => {
    if (page !== 'home' || !homeDatasetId) return;
    if (auth?.datasetIdUsed === homeDatasetId) return;
    void refreshEmbedAuth({ silent: true, datasetId: homeDatasetId });
  }, [page, homeDatasetId, auth?.datasetIdUsed, refreshEmbedAuth]);

  const handleEmbedAuthorizationExpired = useCallback(async () => {
    const now = Date.now();
    if (now - lastEmbedRefreshRef.current < 1500) return;
    lastEmbedRefreshRef.current = now;
    const refreshDatasetId = page === 'home' ? homeDatasetId : datasetId;
    await refreshEmbedAuth({ silent: true, datasetId: refreshDatasetId });
  }, [refreshEmbedAuth, datasetId, homeDatasetId, page]);

  const handleFieldSelectionChanged = useCallback(
    (fields: FieldMetadata[]) => {
      wb.setSelectedFields(fields);
    },
    [wb.setSelectedFields]
  );

  const handleDatasetNameResolved = useCallback(
    (name: string) => {
      wb.setDatasetName(name);
    },
    [wb.setDatasetName]
  );

  const handleDatasetChanged = useCallback(
    (id: string) => {
      wb.setDatasetId(id);
      if (id?.trim()) {
        void refreshEmbedAuth({ silent: true, datasetId: id.trim() });
      }
    },
    [wb.setDatasetId, refreshEmbedAuth]
  );

  const selectedFieldIds = useMemo(
    () => wb.selectedFields.map((f) => f.id),
    [wb.selectedFields]
  );

  const handleAddCanvasItem = useCallback(
    (item: Omit<CanvasItemDefinition, 'id' | 'position'>) => {
      wb.addCanvasItem(item);
    },
    [wb.addCanvasItem]
  );

  const handleDeleteWorkbook = useCallback(
    (id: string) => {
      deleteWorkbookDefinition(id);
      wb.refreshSavedList();
    },
    [wb]
  );

  const handleNavigate = useCallback((target: AppPage) => {
    if (target === 'dashboards') wb.refreshSavedList();
    setPage(target);
  }, [wb]);

  const handleLoadWorkbook = useCallback(
    async (id: string) => {
      wb.loadWorkbook(id);
      setPage('reporting');
      const found = loadWorkbookDefinitions().find((w) => w.id === id);
      if (found && found.sourceTable.selectedFields.length > 0) {
        const ds =
          found.sourceTable.datasetId?.trim() || defaultDatasetId;
        await refreshEmbedAuth({ silent: true, datasetId: ds });
        setStep('dashboard');
      }
    },
    [wb, refreshEmbedAuth, defaultDatasetId]
  );

  const handleReportingStepChange = useCallback(
    async (s: WorkflowStep) => {
      if (s === 'dashboard' && wb.selectedFields.length === 0) return;
      if (s === 'dashboard') {
        await refreshEmbedAuth({ silent: true, datasetId });
      }
      setStep(s);
    },
    [wb.selectedFields.length, refreshEmbedAuth, datasetId]
  );

  const handleContinueToDashboard = useCallback(async () => {
    await refreshEmbedAuth({ silent: true, datasetId });
    setStep('dashboard');
  }, [refreshEmbedAuth, datasetId]);

  return (
    <ErrorBoundary>
    <DevStackLabelsProvider>
    <div className="flex h-screen bg-gray-50/50">
      <SideNav currentPage={page} onNavigate={handleNavigate} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="h-0.5 bg-gradient-to-r from-green-500 via-green-400 to-emerald-400 flex-shrink-0" />
        <DevStackLabelsToggleBar />

        {page === 'reporting' && (
          <>
            <Header
              connected={status.connected}
              workbookName={wb.workbook.name}
              currentStep={step}
              onStepChange={handleReportingStepChange}
              canGoToDashboard={wb.selectedFields.length > 0}
              onNewWorkbook={() => {
                wb.newWorkbook();
                setStep('source-table');
              }}
              onSaveWorkbook={() => setShowSaveDialog(true)}
              onLoadWorkbook={() => {
                wb.refreshSavedList();
                setShowLoadDialog(true);
              }}
            />

            {step === 'source-table' && (
              <StepSourceTable
                authKey={authKey}
                authToken={authToken}
                authLoading={authLoading}
                datasetId={datasetId}
                selectedFieldIds={selectedFieldIds}
                selectedFields={wb.selectedFields}
                sorts={wb.sorts}
                onFieldSelectionChanged={handleFieldSelectionChanged}
                onDatasetNameResolved={handleDatasetNameResolved}
                onSortChange={wb.setSorts}
                onContinue={handleContinueToDashboard}
              />
            )}

            {step === 'dashboard' && (
              <StepDashboardBuilder
                authKey={authKey}
                authToken={authToken}
                datasetId={datasetId}
                datasetName={wb.workbook.sourceTable.datasetName || ''}
                embedReadyForDataset={embedReadyForDataset}
                embedWarning={auth?.warning}
                embedKey={`${authKey}-${auth?.datasetIdUsed ?? ''}`}
                selectedFields={wb.selectedFields}
                canvasItems={wb.workbook.canvasItems}
                filters={wb.filters}
                sorts={wb.sorts}
                onAddCanvasItem={handleAddCanvasItem}
                onAddCanvasItemsBatch={wb.addCanvasItemsBatch}
                onRemoveCanvasItem={wb.removeCanvasItem}
                onUpdateCanvasItem={wb.updateCanvasItem}
                onSetFilters={wb.setFilters as (filters: unknown[]) => void}
                onLayoutChange={wb.updateCanvasLayout}
                onDatasetChanged={handleDatasetChanged}
                onBack={() => setStep('source-table')}
                onEmbedAuthorizationExpired={handleEmbedAuthorizationExpired}
              />
            )}
          </>
        )}

        {page === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            connected={status.connected}
            platformData={platformData}
            platformLoading={platformLoading}
            savedWorkbookCount={wb.savedWorkbooks.length}
            authKey={authKey}
            authToken={authToken}
            datasetId={homeDatasetId}
            embedReadyForDataset={Boolean(auth && homeDatasetId && auth.datasetIdUsed === homeDatasetId)}
            onEmbedAuthorizationExpired={handleEmbedAuthorizationExpired}
          />
        )}

        {page === 'dashboards' && (
          <DashboardsPage
            onNavigate={handleNavigate}
            savedWorkbooks={wb.savedWorkbooks}
            onLoadWorkbook={handleLoadWorkbook}
            onDeleteWorkbook={handleDeleteWorkbook}
          />
        )}

        {page === 'data-sources' && (
          <DataSourcesPage />
        )}

        {page === 'targets' && (
          <TargetsPage
            targets={platformData?.targets ?? []}
            loading={platformLoading}
          />
        )}

        {page === 'settings' && (
          <SettingsPage connected={status.connected} />
        )}
      </div>

      <LoadWorkbookDialog
        open={showLoadDialog}
        workbooks={wb.savedWorkbooks}
        onLoad={async (id) => {
          wb.loadWorkbook(id);
          setShowLoadDialog(false);
          setPage('reporting');
          const found = loadWorkbookDefinitions().find((w) => w.id === id);
          if (found && found.sourceTable.selectedFields.length > 0) {
            const ds =
              found.sourceTable.datasetId?.trim() || defaultDatasetId;
            await refreshEmbedAuth({ silent: true, datasetId: ds });
            setStep('dashboard');
          }
        }}
        onClose={() => setShowLoadDialog(false)}
        onDelete={handleDeleteWorkbook}
      />
      <SaveWorkbookDialog
        open={showSaveDialog}
        initialName={wb.workbook.name}
        initialDescription={wb.workbook.description || ''}
        onSave={({ name, description }) => {
          wb.saveWorkbook({ name, description });
          setShowSaveDialog(false);
        }}
        onClose={() => setShowSaveDialog(false)}
      />
    </div>
    </DevStackLabelsProvider>
    </ErrorBoundary>
  );
}
