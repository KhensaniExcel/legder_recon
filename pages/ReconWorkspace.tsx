
import React, { useMemo, useState, useEffect } from 'react';
import { LedgerEntry, Allocation, ReconProfile, JournalInstruction } from '../types';
import { 
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ListFilter,
  CreditCard,
  Building,
  UserCheck,
  Zap,
  CalendarDays,
  X,
  Info,
  LayoutGrid,
  FileEdit,
  ChevronDown,
  CheckCircle2,
  RefreshCw,
  Check,
  ArrowRightLeft
} from 'lucide-react';

interface Props {
  entries: LedgerEntry[];
  allocations: Allocation[];
  journalInstructions: JournalInstruction[];
  filters: any;
  profiles: ReconProfile[];
  onUpdateEntry: (id: string, updates: Partial<LedgerEntry>) => void;
  onAddAllocation: (alloc: Allocation) => void;
  onAddJournalFix: (fix: JournalInstruction) => void;
}

type TabKey = 'summary' | 'siteSummary' | 'tenant' | 'landlord' | 'bank' | 'adjustments';

export default function ReconWorkspace({ entries, allocations, journalInstructions, filters, onUpdateEntry, onAddAllocation, onAddJournalFix }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [drillMonth, setDrillMonth] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [selectedCreditId, setSelectedCreditId] = useState<string | null>(null);
  
  // Re-allocation state
  const [editingSite, setEditingSite] = useState<string>('');
  const [allocationPosted, setAllocationPosted] = useState(false);

  // Journal Instruction State
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalFixInput, setJournalFixInput] = useState({ instruction: '', adjAmount: 0, targetSite: '' });

  const siteList = useMemo(() => {
    const s = new Set<string>();
    entries.forEach(e => { if (e.siteFinal && e.siteFinal !== 'Unknown') s.add(e.siteFinal); });
    return Array.from(s).sort();
  }, [entries]);

  // Sync editingSite when selectedEntry changes
  useEffect(() => {
    if (selectedEntry) {
      setEditingSite(selectedEntry.siteFinal === 'Unknown' ? '' : selectedEntry.siteFinal);
      setAllocationPosted(false);
      setJournalFixInput({ instruction: '', adjAmount: -selectedEntry.signedAmount, targetSite: '' });
    }
  }, [selectedEntry]);

  const filteredData = useMemo(() => {
    return entries.filter(e => {
      if (filters.companyCode && e.companyCode !== filters.companyCode) return false;
      if (filters.glAccount && e.glAccount !== filters.glAccount) return false;
      if (filters.site.length > 0 && !filters.site.includes(e.siteFinal)) return false;
      if (filters.monthFrom && e.transactionMonth < filters.monthFrom) return false;
      if (filters.monthTo && e.transactionMonth > filters.monthTo) return false;
      if (filters.searchText) {
         const s = filters.searchText.toLowerCase();
         return e.transNo.toLowerCase().includes(s) || e.details.toLowerCase().includes(s) || 
                e.offsetAccountName?.toLowerCase().includes(s) || e.ref1.toLowerCase().includes(s);
      }
      return true;
    });
  }, [entries, filters]);

  const activeInstructions = useMemo(() => {
    return journalInstructions.filter(i => {
        if (filters.companyCode && i.companyCode !== filters.companyCode) return false;
        if (filters.glAccount && i.glAccount !== filters.glAccount) return false;
        if (filters.site.length > 0 && !filters.site.includes(i.siteFinal)) return false;
        return true;
    });
  }, [journalInstructions, filters]);

  const categoryFilters = {
    tenant: (e: LedgerEntry) => (e.origin === 'CN' || e.origin === 'IN') && e.counterpartyType !== 'Landlord',
    landlord: (e: LedgerEntry) => ((e.origin === 'CN' || e.origin === 'IN') && e.counterpartyType === 'Landlord') || e.origin === 'PU',
    bank: (e: LedgerEntry) => e.origin === 'RC',
    adjustments: (e: LedgerEntry) => ['JE', 'PS'].includes(e.origin)
  };

  const balances = useMemo(() => {
    const obRows = filteredData.filter(e => e.origin === 'OB');
    const movementRows = filteredData.filter(e => e.origin !== 'OB');
    const openingBalance = obRows.reduce((sum, e) => sum + e.signedAmount, 0);
    const ledgerMovement = movementRows.reduce((sum, e) => sum + e.signedAmount, 0);
    const journalAdjustments = activeInstructions.reduce((sum, i) => sum + i.adjustmentAmount, 0);
    const closingBalance = openingBalance + ledgerMovement + journalAdjustments;

    return { openingBalance, movement: ledgerMovement, journalAdjustments, closingBalance };
  }, [filteredData, activeInstructions]);

  const summaryData = useMemo(() => {
    const months: Record<string, { tenant: number, landlord: number, bank: number, adj: number, total: number }> = {};
    filteredData.forEach(e => {
      if (e.origin === 'OB') return;
      const m = e.transactionMonth || 'Unknown';
      if (!months[m]) months[m] = { tenant: 0, landlord: 0, bank: 0, adj: 0, total: 0 };
      const move = e.signedAmount;
      if (categoryFilters.tenant(e)) months[m].tenant += move;
      else if (categoryFilters.landlord(e)) months[m].landlord += move;
      else if (categoryFilters.bank(e)) months[m].bank += move;
      else if (categoryFilters.adjustments(e)) months[m].adj += move;
      months[m].total += move;
    });
    return Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredData]);

  const siteSummaryData = useMemo(() => {
    const sites: Record<string, { tenant: number, landlord: number, bank: number, adj: number, total: number, journal: number }> = {};
    filteredData.forEach(e => {
      if (e.origin === 'OB') return;
      const s = e.siteFinal || 'Unknown';
      if (!sites[s]) sites[s] = { tenant: 0, landlord: 0, bank: 0, adj: 0, total: 0, journal: 0 };
      const move = e.signedAmount;
      if (categoryFilters.tenant(e)) sites[s].tenant += move;
      else if (categoryFilters.landlord(e)) sites[s].landlord += move;
      else if (categoryFilters.bank(e)) sites[s].bank += move;
      else if (categoryFilters.adjustments(e)) sites[s].adj += move;
      sites[s].total += move;
    });
    activeInstructions.forEach(i => {
      if (!sites[i.siteFinal]) sites[i.siteFinal] = { tenant: 0, landlord: 0, bank: 0, adj: 0, total: 0, journal: 0 };
      sites[i.siteFinal].journal += i.adjustmentAmount;
    });
    return Object.entries(sites).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredData, activeInstructions]);

  const ledgerTransactions = useMemo(() => {
    let base = filteredData;
    if (drillMonth) base = base.filter(e => e.transactionMonth === drillMonth);
    if (activeTab === 'summary' || activeTab === 'siteSummary') return base;
    return base.filter(categoryFilters[activeTab as keyof typeof categoryFilters]);
  }, [filteredData, activeTab, drillMonth]);

  const credits = ledgerTransactions.filter(e => e.direction === 'Credit');
  const debits = ledgerTransactions.filter(e => e.direction === 'Debit');

  const allocBalances = useMemo(() => {
    const b: Record<string, number> = {};
    allocations.forEach(a => {
      b[a.creditRowId] = (b[a.creditRowId] || 0) + a.allocatedAmount;
      b[a.debitRowId] = (b[a.debitRowId] || 0) + a.allocatedAmount;
    });
    return b;
  }, [allocations]);

  const getUnallocated = (e: LedgerEntry) => {
    const total = e.direction === 'Credit' ? e.creditLC : e.debitLC;
    return Math.max(0, total - (allocBalances[e.rowId] || 0));
  };

  const formatValue = (val: number, isTotal = false) => {
    if (Math.abs(val) < 0.01) return <span className="text-gray-200">-</span>;
    return (
      <span className={`${val > 0 ? 'text-[#F15E2A]' : 'text-[#255FA1]'} ${isTotal ? 'font-black' : 'font-bold'}`}>
        R {val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
    );
  };

  const handleCreateJournalFix = () => {
    if (!selectedEntry || !journalFixInput.instruction) return;
    
    // 1. REVERSAL instruction (Old Site)
    const reversal: JournalInstruction = {
        id: Math.random().toString(36).substring(7),
        rowId: selectedEntry.rowId,
        companyCode: selectedEntry.companyCode,
        glAccount: selectedEntry.glAccount,
        siteFinal: selectedEntry.siteFinal,
        originalAmount: selectedEntry.signedAmount,
        adjustmentAmount: journalFixInput.adjAmount,
        instruction: journalFixInput.targetSite 
            ? `Reversal of misallocation to ${selectedEntry.siteFinal}. Moving to ${journalFixInput.targetSite}. ${journalFixInput.instruction}`
            : journalFixInput.instruction,
        reference: `RECON-REVERSAL-${selectedEntry.transNo}`,
        status: 'Draft',
        createdAt: new Date().toISOString()
    };
    onAddJournalFix(reversal);

    // 2. ALLOCATION instruction (Target Site) if provided
    if (journalFixInput.targetSite && journalFixInput.targetSite.trim() !== selectedEntry.siteFinal) {
        const target: JournalInstruction = {
            id: Math.random().toString(36).substring(7),
            rowId: selectedEntry.rowId,
            companyCode: selectedEntry.companyCode,
            glAccount: selectedEntry.glAccount,
            siteFinal: journalFixInput.targetSite.trim().toUpperCase(),
            originalAmount: 0,
            adjustmentAmount: -journalFixInput.adjAmount, // Inverse of reversal is the original amount
            instruction: `Allocated from site ${selectedEntry.siteFinal}. ${journalFixInput.instruction}`,
            reference: `RECON-ALLOC-${selectedEntry.transNo}`,
            status: 'Draft',
            createdAt: new Date().toISOString()
        };
        onAddJournalFix(target);
    }

    setShowJournalForm(false);
    setJournalFixInput({ instruction: '', adjAmount: 0, targetSite: '' });
    setSelectedEntry(null);
    alert("Journal instruction(s) created and balances adjusted.");
  };

  const handleSiteChange = (rowId: string, newSite: string) => {
    if (!newSite.trim()) return;
    onUpdateEntry(rowId, { siteOverride: newSite.trim().toUpperCase() });
    setAllocationPosted(true);
    if (selectedEntry && selectedEntry.rowId === rowId) {
      setSelectedEntry({ ...selectedEntry, siteFinal: newSite.trim().toUpperCase() });
    }
  };

  if (!filters.companyCode || !filters.glAccount) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-100 p-10">
        <ListFilter size={64} className="mb-4 opacity-10" />
        <h2 className="text-xl font-bold">Scope Required</h2>
        <p className="text-sm">Please select a Company and GL Account in the header.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 relative">
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#A1C7C3]">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Opening Balance</label>
          <div className="text-sm font-black text-gray-700">R {balances.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#255FA1]">
          <label className="text-[9px] font-black text-[#255FA1] uppercase tracking-widest">Ledger Movement</label>
          <div className="text-sm font-black text-gray-700">R {balances.movement.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#F15E2A]">
          <label className="text-[9px] font-black text-[#F15E2A] uppercase tracking-widest">Journal Fixes</label>
          <div className="text-sm font-black text-[#F15E2A]">R {balances.journalAdjustments.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-[#255FA1] p-4 rounded-xl border border-[#255FA1] shadow-sm flex flex-col justify-center">
          <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">Adjusted Balance</label>
          <div className="text-lg font-black text-white">R {balances.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-1">
          <button onClick={() => setActiveTab('summary')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'summary' ? 'bg-[#255FA1] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><ListFilter size={14} /> Summary</button>
          <button onClick={() => setActiveTab('siteSummary')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'siteSummary' ? 'bg-[#255FA1] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutGrid size={14} /> Site Summary</button>
          <div className="w-px h-6 bg-gray-200 mx-2"></div>
          {(['tenant', 'landlord', 'bank', 'adjustments'] as const).map(k => (
            <button key={k} onClick={() => setActiveTab(k)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase ${activeTab === k ? 'bg-[#255FA1] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
              {k === 'tenant' && <UserCheck size={14} />}{k === 'landlord' && <Building size={14} />}{k === 'bank' && <CreditCard size={14} />}{k === 'adjustments' && <Zap size={14} />}{k}
            </button>
          ))}
        </div>
        {drillMonth && (
          <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 border border-orange-100 rounded-lg">
             <span className="text-[10px] font-black text-[#F15E2A] uppercase tracking-tighter">Drill: {drillMonth}</span>
             <button onClick={() => setDrillMonth(null)} className="p-0.5 hover:bg-orange-100 rounded text-[#F15E2A]"><X size={12}/></button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
        {activeTab === 'summary' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in">
            <div className="p-4 border-b border-gray-50 bg-[#255FA1]/5 flex items-center justify-between">
              <span className="font-black text-[#255FA1] text-xs uppercase">Ledger Trends</span>
            </div>
            <div className="overflow-auto scrollbar-thin flex-1">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 text-gray-400 font-bold uppercase tracking-tight">
                  <tr><th className="p-4 border-r w-32">Period</th><th className="p-4 text-right">Tenant</th><th className="p-4 text-right">Landlord</th><th className="p-4 text-right">Bank</th><th className="p-4 text-right">Adjustments</th><th className="p-4 text-right bg-[#255FA1]/5 border-l">Impact</th><th className="p-4 text-center">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summaryData.length === 0 ? (
                    <tr><td colSpan={7} className="p-20 text-center text-gray-300 italic">No movement data available for the selected scope.</td></tr>
                  ) : (
                    summaryData.map(([month, vals]) => (
                      <tr key={month} className="hover:bg-blue-50/10 transition-colors group">
                        <td className="p-4 font-black text-[#255FA1] border-r">{month}</td>
                        <td className="p-4 text-right">{formatValue(vals.tenant)}</td><td className="p-4 text-right">{formatValue(vals.landlord)}</td><td className="p-4 text-right">{formatValue(vals.bank)}</td><td className="p-4 text-right">{formatValue(vals.adj)}</td>
                        <td className="p-4 text-right bg-blue-50/5 border-l">{formatValue(vals.total, true)}</td>
                        <td className="p-4 text-center"><button onClick={() => { setDrillMonth(month); setActiveTab('tenant'); }} className="p-2 bg-orange-50 text-[#F15E2A] hover:bg-[#F15E2A] hover:text-white rounded-lg transition-all shadow-sm"><ArrowUpRight size={14} /></button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'siteSummary' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in">
            <div className="p-4 border-b border-gray-50 bg-[#255FA1]/5 flex items-center justify-between"><span className="font-black text-[#255FA1] text-xs uppercase">Site Reconciliation Matrix</span></div>
            <div className="overflow-auto scrollbar-thin flex-1">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 text-gray-400 font-bold uppercase tracking-tight">
                  <tr><th className="p-4 border-r w-32">Site Name</th><th className="p-4 text-right">Ledger Move</th><th className="p-4 text-right">Journal Fixes</th><th className="p-4 text-right bg-[#255FA1]/5 font-black border-l">Site Reconciled</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {siteSummaryData.map(([site, vals]) => (
                    <tr key={site} className="hover:bg-blue-50/10 transition-colors">
                      <td className="p-4 font-black text-[#255FA1] border-r">{site}</td>
                      <td className="p-4 text-right">{formatValue(vals.total)}</td>
                      <td className="p-4 text-right">{formatValue(vals.journal)}</td>
                      <td className="p-4 text-right bg-[#255FA1]/5 border-l font-black">{formatValue(vals.total + vals.journal, true)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 bg-[#255FA1] text-white font-black text-[11px] z-20">
                  <tr>
                    <td className="p-4 border-r uppercase tracking-widest border-white/10">Grand Totals</td>
                    <td className="p-4 text-right">R {siteSummaryData.reduce((s,v) => s + v[1].total, 0).toLocaleString()}</td>
                    <td className="p-4 text-right text-orange-200">R {siteSummaryData.reduce((s,v) => s + v[1].journal, 0).toLocaleString()}</td>
                    <td className="p-4 text-right bg-white/10 border-l font-black">R {siteSummaryData.reduce((s,v) => s + (v[1].total + v[1].journal), 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {(!['summary', 'siteSummary'].includes(activeTab)) && (
          <div className="flex-1 overflow-auto space-y-4 scrollbar-thin pb-20 animate-in slide-in-from-bottom-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-[#A1C7C3]/10 border-b border-[#A1C7C3]/30 flex justify-between items-center"><span className="font-black text-[#255FA1] text-[10px] uppercase flex items-center gap-2"><TrendingUp size={16} /> Incoming / Credits ({credits.length})</span></div>
              <table className="w-full text-[10px] text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold uppercase">
                  <tr><th className="p-3">Date</th><th className="p-3">Trans #</th><th className="p-3">Site</th><th className="p-3">Offset Info</th><th className="p-3">Details</th><th className="p-3 text-right">Credit</th><th className="p-3 text-right">Unmatched</th><th className="p-3 text-center">Inspect</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {credits.length === 0 ? (
                    <tr><td colSpan={8} className="p-10 text-center text-gray-300 italic">No credit items found for this view.</td></tr>
                  ) : (
                    credits.map(row => (
                      <tr key={row.rowId} onClick={() => setSelectedCreditId(row.rowId)} className={`hover:bg-blue-50/30 cursor-pointer ${selectedCreditId === row.rowId ? 'bg-blue-50 ring-2 ring-[#255FA1] ring-inset' : ''}`}>
                        <td className="p-3 font-mono">{row.postingDate.replace(/-/g, '/')}</td>
                        <td className="p-3 font-black text-gray-900">{row.transNo}</td>
                        <td className="p-3"><span className="px-1.5 py-0.5 bg-[#A1C7C3]/20 rounded text-[#255FA1] font-black">{row.siteFinal}</span></td>
                        <td className="p-3"><div className="flex flex-col leading-tight"><span className="font-bold text-gray-800">{row.offsetAccountCode4}</span><span className="text-[9px] text-gray-400 truncate w-24">{row.offsetAccountName}</span></div></td>
                        <td className="p-3 truncate max-w-xs">{row.details || row.ref1}</td>
                        <td className="p-3 text-right font-black">R {row.creditLC.toLocaleString()}</td>
                        <td className="p-3 text-right"><span className={`font-black ${getUnallocated(row) > 0 ? 'text-[#255FA1]' : 'text-gray-300'}`}>{getUnallocated(row) > 0 ? `R ${getUnallocated(row).toLocaleString()}` : 'MATCHED'}</span></td>
                        <td className="p-3 text-center"><button onClick={(e) => { e.stopPropagation(); setSelectedEntry(row); }} className="text-gray-400 hover:text-[#255FA1] p-1"><Info size={16} /></button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-[#F15E2A]/5 border-b border-[#F15E2A]/20 flex justify-between items-center"><span className="font-black text-[#F15E2A] text-[10px] uppercase flex items-center gap-2"><TrendingDown size={16} /> Outgoing / Debits ({debits.length})</span></div>
              <table className="w-full text-[10px] text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold uppercase">
                  <tr><th className="p-3">Date</th><th className="p-3">Trans #</th><th className="p-3">Site</th><th className="p-3">Offset Info</th><th className="p-3">Details</th><th className="p-3 text-right">Debit</th><th className="p-3 text-right">Unmatched</th><th className="p-3 text-center">Inspect</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {debits.length === 0 ? (
                    <tr><td colSpan={8} className="p-10 text-center text-gray-300 italic">No debit items found for this view.</td></tr>
                  ) : (
                    debits.map(row => (
                      <tr key={row.rowId} className="hover:bg-orange-50/30">
                        <td className="p-3 font-mono">{row.postingDate.replace(/-/g, '/')}</td><td className="p-3 font-black text-gray-900">{row.transNo}</td><td className="p-3"><span className="px-1.5 py-0.5 bg-[#A1C7C3]/20 rounded text-[#255FA1] font-black">{row.siteFinal}</span></td>
                        <td className="p-3"><div className="flex flex-col leading-tight"><span className="font-bold text-gray-800">{row.offsetAccountCode4}</span><span className="text-[9px] text-gray-400 truncate w-32 font-bold uppercase">{row.offsetAccountName}</span></div></td>
                        <td className="p-3 truncate max-w-xs">{row.details || row.ref1}</td>
                        <td className="p-3 text-right font-black">R {row.debitLC.toLocaleString()}</td>
                        <td className="p-3 text-right"><span className={`font-black ${getUnallocated(row) > 0 ? 'text-[#F15E2A]' : 'text-gray-300'}`}>{getUnallocated(row) > 0 ? `R ${getUnallocated(row).toLocaleString()}` : 'MATCHED'}</span></td>
                        <td className="p-3 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => setSelectedEntry(row)} className="text-gray-400 hover:text-[#255FA1] p-1"><Info size={16} /></button>
                          {selectedCreditId && getUnallocated(row) > 0 && (<button onClick={() => { const c = credits.find(cc => cc.rowId === selectedCreditId); if (c) { const amt = Math.min(getUnallocated(c), getUnallocated(row)); if (amt > 0) onAddAllocation({ id: Math.random().toString(36).substring(7), companyCode: row.companyCode, glAccount: row.glAccount, siteFinal: row.siteFinal, creditRowId: c.rowId, debitRowId: row.rowId, allocatedAmount: amt, allocationDate: new Date().toISOString(), allocatedBy: 'Recon Hero' }); } }} className="p-1.5 bg-[#255FA1] text-white rounded shadow-md hover:bg-[#F15E2A] transition-all"><ArrowUpRight size={12} /></button>)}
                        </div></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 z-[200] flex justify-end animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setSelectedEntry(null)}></div>
           <div className="relative w-[500px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
              <div className="p-6 bg-[#255FA1] text-white flex items-center justify-between shrink-0">
                <div><h3 className="text-lg font-black uppercase tracking-tight">Transaction Review</h3><p className="text-xs text-white/60 font-mono">{selectedEntry.transNo}</p></div>
                <button onClick={() => setSelectedEntry(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={24} /></button>
              </div>
              <div className="p-6 flex-1 overflow-auto space-y-8 scrollbar-thin pb-20">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 border-l-4 border-l-[#255FA1] shadow-sm"><label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Impact</label><div className="text-xl font-black text-gray-900">R {selectedEntry.signedAmount.toLocaleString()}</div></div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 border-l-4 border-l-[#A1C7C3] shadow-sm"><label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Unmatched</label><div className="text-xl font-black text-gray-900">R {getUnallocated(selectedEntry).toLocaleString()}</div></div>
                 </div>

                 <section className="p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-inner">
                    <label className="text-[10px] font-black text-[#255FA1] uppercase block mb-3 flex items-center gap-2"><RefreshCw size={14}/> Change Site Allocation</label>
                    <div className="flex gap-2">
                       {allocationPosted ? (
                          <div className="flex-1 flex items-center gap-3 bg-white border border-emerald-200 rounded px-3 py-2 animate-in zoom-in-95">
                             <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"><Check size={14} /></div>
                             <span className="text-xs font-black text-emerald-700 uppercase">Site Updated to {selectedEntry.siteFinal}</span>
                             <button onClick={() => setAllocationPosted(false)} className="ml-auto text-[10px] font-bold text-gray-400 hover:text-gray-600 border-b border-dotted">Reset</button>
                          </div>
                       ) : (
                          <>
                            <input 
                              type="text" 
                              placeholder="Enter site (e.g. P088)..." 
                              className="flex-1 text-sm border border-blue-200 rounded px-3 py-2 bg-white font-black uppercase focus:ring-2 focus:ring-[#F15E2A] outline-none"
                              value={editingSite}
                              onChange={(e) => setEditingSite(e.target.value.toUpperCase())}
                            />
                            <button 
                              onClick={() => handleSiteChange(selectedEntry.rowId, editingSite)}
                              className="px-4 py-2 bg-[#F15E2A] text-white rounded text-xs font-black shadow-lg hover:bg-[#255FA1] transition-all"
                            >
                              Post
                            </button>
                          </>
                       )}
                    </div>
                    {allocationPosted && (
                      <button onClick={() => setSelectedEntry(null)} className="w-full mt-4 py-2 bg-[#255FA1] text-white rounded font-black text-xs uppercase tracking-widest shadow-lg">Done</button>
                    )}
                    {!allocationPosted && (
                      <div className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-tighter italic">Currently assigned: <span className="text-[#255FA1]">{selectedEntry.siteFinal}</span></div>
                    )}
                 </section>

                 <section className="space-y-4 p-4 bg-orange-50 border border-orange-100 rounded-xl shadow-inner">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-black text-[#F15E2A] uppercase tracking-tighter flex items-center gap-2">
                          <FileEdit size={14} /> Accounting Correction
                       </h4>
                       {!showJournalForm && (<button onClick={() => setShowJournalForm(true)} className="text-[10px] font-black text-[#255FA1] uppercase bg-white px-2 py-1 rounded shadow-sm border border-[#255FA1]/10">Flag for Fix</button>)}
                    </div>
                    {showJournalForm && (
                      <div className="space-y-3 animate-in slide-in-from-top-2">
                        <div className="bg-white p-3 rounded-lg border border-orange-100">
                           <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Target Site (Move To)</label>
                           <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-400">{selectedEntry.siteFinal}</span>
                              <ArrowRightLeft size={14} className="text-[#F15E2A]" />
                              <input 
                                type="text" 
                                className="flex-1 text-xs border border-orange-200 rounded px-2 py-1 font-black bg-white focus:ring-2 focus:ring-[#F15E2A] outline-none"
                                placeholder="New Site (e.g. P123)"
                                value={journalFixInput.targetSite}
                                onChange={(e) => setJournalFixInput(p => ({...p, targetSite: e.target.value.toUpperCase()}))}
                              />
                           </div>
                           <p className="text-[9px] text-gray-400 mt-1 italic">This will create a reversal for {selectedEntry.siteFinal} and a new entry for {journalFixInput.targetSite || '...'}.</p>
                        </div>
                        <div>
                           <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Journal Instruction (Reason)</label>
                           <textarea 
                             className="w-full text-xs border border-orange-200 rounded p-2 focus:ring-2 focus:ring-[#F15E2A] outline-none h-16 bg-white" 
                             placeholder="e.g. booked to wrong GL, site misallocation..."
                             value={journalFixInput.instruction}
                             onChange={(e) => setJournalFixInput(p => ({...p, instruction: e.target.value}))}
                           />
                        </div>
                        <div className="flex gap-2 pt-2">
                           <button onClick={handleCreateJournalFix} className="flex-1 py-2 bg-[#F15E2A] text-white font-black text-xs rounded hover:bg-[#255FA1] transition-all uppercase tracking-widest shadow-lg">Post Fix Pack</button>
                           <button onClick={() => setShowJournalForm(false)} className="px-4 py-2 border border-gray-300 rounded text-xs text-gray-500 font-bold bg-white uppercase">Cancel</button>
                        </div>
                      </div>
                    )}
                 </section>

                 <section className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-tighter border-b pb-2">Narratives</h4>
                    <div className="space-y-4">
                       <div className="bg-gray-50 p-3 rounded-lg"><label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Details</label><p className="text-xs font-medium text-gray-700 leading-relaxed">{selectedEntry.details || 'No details'}</p></div>
                       <div className="bg-gray-50 p-3 rounded-lg"><label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Ref 1</label><p className="text-xs font-medium text-gray-700">{selectedEntry.ref1 || '-'}</p></div>
                    </div>
                 </section>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
