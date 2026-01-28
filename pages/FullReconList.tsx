
import React, { useMemo } from 'react';
import { LedgerEntry, JournalInstruction } from '../types';
import { LayoutGrid, Download, TrendingUp, TrendingDown, Info } from 'lucide-react';

interface Props {
  entries: LedgerEntry[];
  journalInstructions: JournalInstruction[];
  filters: any;
}

export default function FullReconList({ entries, journalInstructions, filters }: Props) {
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (filters.companyCode && e.companyCode !== filters.companyCode) return false;
      if (filters.glAccount && e.glAccount !== filters.glAccount) return false;
      if (filters.site.length > 0 && !filters.site.includes(e.siteFinal)) return false;
      if (filters.monthFrom && e.transactionMonth < filters.monthFrom) return false;
      if (filters.monthTo && e.transactionMonth > filters.monthTo) return false;
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
    const obRows = filteredEntries.filter(e => e.origin === 'OB');
    const moveRows = filteredEntries.filter(e => e.origin !== 'OB');
    
    const openingBalance = obRows.reduce((sum, e) => sum + e.signedAmount, 0);
    const movement = moveRows.reduce((sum, e) => sum + e.signedAmount, 0);
    const journalFixesTotal = activeInstructions.reduce((sum, i) => sum + i.adjustmentAmount, 0);
    const closingBalance = openingBalance + movement + journalFixesTotal;

    return { openingBalance, movement, journalFixesTotal, closingBalance };
  }, [filteredEntries, activeInstructions]);

  const siteSummaryData = useMemo(() => {
    const sites: Record<string, { tenant: number, landlord: number, bank: number, adj: number, totalLedger: number, journal: number }> = {};
    
    filteredEntries.forEach(e => {
      if (e.origin === 'OB') return;
      const s = e.siteFinal || 'Unknown';
      if (!sites[s]) sites[s] = { tenant: 0, landlord: 0, bank: 0, adj: 0, totalLedger: 0, journal: 0 };
      
      const move = e.signedAmount;
      if (categoryFilters.tenant(e)) { sites[s].tenant += move; sites[s].totalLedger += move; }
      else if (categoryFilters.landlord(e)) { sites[s].landlord += move; sites[s].totalLedger += move; }
      else if (categoryFilters.bank(e)) { sites[s].bank += move; sites[s].totalLedger += move; }
      else if (categoryFilters.adjustments(e)) { sites[s].adj += move; sites[s].totalLedger += move; }
      else { sites[s].totalLedger += move; } // Other categories
    });

    activeInstructions.forEach(i => {
      if (!sites[i.siteFinal]) sites[i.siteFinal] = { tenant: 0, landlord: 0, bank: 0, adj: 0, totalLedger: 0, journal: 0 };
      sites[i.siteFinal].journal += i.adjustmentAmount;
    });

    return Object.entries(sites).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredEntries, activeInstructions]);

  const formatCurrency = (val: number) => {
    return `R ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const downloadCSV = () => {
    const headers = ['Site', 'Tenant', 'Landlord', 'Bank', 'Adjustments', 'Ledger Total', 'Journal Fixes', 'Reconciled Total'];
    const rows = siteSummaryData.map(([site, v]) => [
      site, v.tenant, v.landlord, v.bank, v.adj, v.totalLedger, v.journal, (v.totalLedger + v.journal)
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `full_recon_list_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#255FA1] flex items-center gap-3 uppercase tracking-tight">
            <LayoutGrid className="text-[#F15E2A]" size={24} />
            Full Site Reconciliation List
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-bold">Consolidated view of all sites with integrated ledger movements and accounting fixes.</p>
        </div>
        <button onClick={downloadCSV} className="px-4 py-2 bg-[#F15E2A] text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:bg-[#255FA1] transition-all uppercase tracking-widest">
          <Download size={16} /> Export Detailed List
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#A1C7C3]">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global OB</label>
          <div className="text-lg font-black text-gray-700">{formatCurrency(balances.openingBalance)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#255FA1]">
          <label className="text-[10px] font-black text-[#255FA1] uppercase tracking-widest">Net Ledger Move</label>
          <div className="text-lg font-black text-gray-700">{formatCurrency(balances.movement)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#F15E2A]">
          <label className="text-[10px] font-black text-[#F15E2A] uppercase tracking-widest">Journal Fixes</label>
          <div className="text-lg font-black text-[#F15E2A]">{formatCurrency(balances.journalFixesTotal)}</div>
        </div>
        <div className="bg-[#255FA1] p-4 rounded-xl shadow-lg flex flex-col justify-center">
          <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Final Reconciled</label>
          <div className="text-xl font-black text-white">{formatCurrency(balances.closingBalance)}</div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 scrollbar-thin">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="sticky top-0 bg-[#255FA1] text-white z-10 font-black uppercase tracking-tighter shadow-sm">
              <tr>
                <th className="p-4 border-r border-white/10">Site Name</th>
                <th className="p-4 text-right">Tenant</th>
                <th className="p-4 text-right">Landlord</th>
                <th className="p-4 text-right">Bank</th>
                <th className="p-4 text-right">Adj.</th>
                <th className="p-4 text-right bg-white/10">Ledger Net</th>
                <th className="p-4 text-right text-orange-200">Fixes</th>
                <th className="p-4 text-right bg-white/20 font-black">Final Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              {siteSummaryData.length === 0 ? (
                <tr><td colSpan={8} className="p-24 text-center text-gray-300 italic">No movement data for the current scope.</td></tr>
              ) : (
                siteSummaryData.map(([site, v]) => (
                  <tr key={site} className="hover:bg-[#A1C7C3]/10 transition-colors">
                    <td className="p-4 font-black text-[#255FA1] border-r">{site}</td>
                    <td className="p-4 text-right">{v.tenant.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right">{v.landlord.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right">{v.bank.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right">{v.adj.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right bg-gray-50/50 font-bold">{v.totalLedger.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right text-[#F15E2A] font-black">{v.journal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className={`p-4 text-right font-black bg-[#255FA1]/5 ${(v.totalLedger + v.journal) > 0 ? 'text-[#F15E2A]' : 'text-[#255FA1]'}`}>
                      {(v.totalLedger + v.journal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="sticky bottom-0 bg-slate-900 text-white font-black text-[11px] z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
              <tr>
                <td className="p-4 border-r border-white/10 uppercase tracking-widest">Full List Totals</td>
                <td className="p-4 text-right border-white/10">{siteSummaryData.reduce((s,v) => s + v[1].tenant, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right border-white/10">{siteSummaryData.reduce((s,v) => s + v[1].landlord, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right border-white/10">{siteSummaryData.reduce((s,v) => s + v[1].bank, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right border-white/10">{siteSummaryData.reduce((s,v) => s + v[1].adj, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right bg-white/10 border-white/10">{siteSummaryData.reduce((s,v) => s + v[1].totalLedger, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right text-orange-200 border-white/10">{siteSummaryData.reduce((s,v) => s + v[1].journal, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right bg-[#F15E2A] font-black">
                  {siteSummaryData.reduce((s,v) => s + (v[1].totalLedger + v[1].journal), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
