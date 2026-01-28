import React, { useEffect, useMemo, useDeferredValue, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ReconWorkspace from './pages/ReconWorkspace';
import SiteQueue from './pages/SiteQueue';
import Explorer from './pages/Explorer';
import ImportPage from './pages/ImportPage';
import AuditTrail from './pages/AuditTrail';
import JournalFixes from './pages/JournalFixes';
import FullReconList from './pages/FullReconList';
import { useReconStore } from './store/useReconStore';
import { pullFromSupabase, pushToSupabase } from './services/databaseService';
import { LedgerEntry, JournalInstruction } from './types';

export default function App() {
  const store = useReconStore();
  const {
    entries, allocations, journalInstructions, reconProfiles, overrideLogs, companies, imports, directory,
    filters,
    setEntries, setImports, setDirectory, setAllocations, setOverrideLogs, setJournalInstructions, setCompanies, setReconProfiles,
    updateEntryWithLog, addAllocation, addJournalFix, addEntries, clearAllData
  } = store;

  // Sync state
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  const deferredSearchText = useDeferredValue(filters.searchText);
  const effectiveFilters = useMemo(() => ({
    ...filters,
    searchText: deferredSearchText
  }), [filters, deferredSearchText]);

  // Initial Load from Supabase
  useEffect(() => {
    (async () => {
      try {
        const data = await pullFromSupabase();
        setEntries(data.entries);
        setImports(data.imports);
        setDirectory(data.directory);
        setAllocations(data.allocations);
        setOverrideLogs(data.overrideLogs);
        setJournalInstructions(data.journalInstructions);
        setCompanies(data.companies);
        setReconProfiles(data.reconProfiles);
      } catch (e) {
        console.error("Failed to load initial data", e);
      }
    })();
  }, []);

  // Auto-Save Effect (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      pushToSupabase({
        entries, imports, directory, allocations, overrideLogs, journalInstructions, companies, reconProfiles
      }).catch(console.error);
    }, 2000);
    return () => clearTimeout(timer);
  }, [entries, imports, directory, allocations, overrideLogs, journalInstructions, companies, reconProfiles]);

  // Manual Sync Push Handler
  const handleSyncPush = async () => {
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      await pushToSupabase({
        entries, imports, directory, allocations, overrideLogs, journalInstructions, companies, reconProfiles
      });
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e: any) {
      setSyncError(e.message || 'Push failed');
      setSyncStatus('error');
    }
  };

  // Manual Sync Pull Handler
  const handleSyncPull = async () => {
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const data = await pullFromSupabase();
      setEntries(data.entries);
      setImports(data.imports);
      setDirectory(data.directory);
      setAllocations(data.allocations);
      setOverrideLogs(data.overrideLogs);
      setJournalInstructions(data.journalInstructions);
      setCompanies(data.companies);
      setReconProfiles(data.reconProfiles);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e: any) {
      setSyncError(e.message || 'Pull failed');
      setSyncStatus('error');
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard entries={entries} allocations={allocations} filters={effectiveFilters} />} />
          <Route path="/recon" element={
            <ReconWorkspace
              entries={entries}
              allocations={allocations}
              journalInstructions={journalInstructions}
              filters={effectiveFilters}
              onUpdateEntry={(id, u) => updateEntryWithLog(id, u)}
              onAddAllocation={addAllocation}
              onAddJournalFix={addJournalFix}
              profiles={reconProfiles}
            />
          } />
          <Route path="/full-list" element={<FullReconList entries={entries} journalInstructions={journalInstructions} filters={effectiveFilters} />} />
          <Route path="/journal" element={
            <JournalFixes
              instructions={journalInstructions}
              onUpdateStatus={(id, status) => {
                const updated = journalInstructions.map(f => f.id === id ? { ...f, status } : f);
                setJournalInstructions(updated);
              }}
            />
          } />
          <Route path="/queue" element={<SiteQueue entries={entries} onUpdateEntry={(id, u) => updateEntryWithLog(id, u)} filters={effectiveFilters} />} />
          <Route path="/audit" element={<AuditTrail logs={overrideLogs} />} />
          <Route path="/explorer" element={<Explorer entries={entries} filters={effectiveFilters} onUpdateEntry={(id, u) => updateEntryWithLog(id, u)} />} />
          <Route path="/import" element={
            <ImportPage
              entries={entries}
              onImport={addEntries}
              imports={imports}
              onDeleteImport={(id) => {
                setEntries(entries.filter(e => e.importId !== id));
                setImports(imports.filter(i => i.id !== id));
              }}
              directory={directory}
              onUpdateDirectory={setDirectory}
              reconProfiles={reconProfiles}
              onUpdateProfiles={setReconProfiles}
              onClearAll={clearAllData}
              onSyncPush={handleSyncPush}
              onSyncPull={handleSyncPull}
              syncStatus={syncStatus}
              syncError={syncError}
            />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
