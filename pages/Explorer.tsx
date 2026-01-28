
import { useMemo, useState, useEffect } from 'react';
import { LedgerEntry } from '../types';
import { Download, ChevronLeft, ChevronRight, FileText, Search, Filter, X } from 'lucide-react';

interface Props {
  entries: LedgerEntry[];
  filters: any;
  onUpdateEntry: (id: string, updates: Partial<LedgerEntry>) => void;
}

export default function Explorer({ entries, filters }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [localSiteFilter, setLocalSiteFilter] = useState('');
  const [localOffsetFilter, setLocalOffsetFilter] = useState('');
  
  const pageSize = 50;

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.companyCode, filters.glAccount, filters.month, filters.searchText, localSiteFilter, localOffsetFilter]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      // Global Header Filters
      if (filters.companyCode && e.companyCode !== filters.companyCode) return false;
      if (filters.glAccount && e.glAccount !== filters.glAccount) return false;
      if (filters.month && e.transactionMonth !== filters.month) return false;
      if (filters.site && filters.site.length > 0 && !filters.site.includes(e.siteFinal)) return false;
      
      // Explorer Specific Filters
      if (localSiteFilter && !e.siteFinal.toLowerCase().includes(localSiteFilter.toLowerCase())) return false;
      if (localOffsetFilter) {
        const offsetLower = localOffsetFilter.toLowerCase();
        const codeMatch = e.offsetAccountCode4.toLowerCase().includes(offsetLower);
        const nameMatch = e.offsetAccountName?.toLowerCase().includes(offsetLower);
        if (!codeMatch && !nameMatch) return false;
      }

      // Master Search Text
      if (filters.searchText) {
        const s = filters.searchText.toLowerCase();
        return (
          e.transNo.toLowerCase().includes(s) ||
          e.details.toLowerCase().includes(s) ||
          e.ref1.toLowerCase().includes(s) ||
          e.siteFinal.toLowerCase().includes(s) ||
          (e.offsetAccountName && e.offsetAccountName.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [entries, filters, localSiteFilter, localOffsetFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filtered, currentPage]);

  const formatDisplayDate = (iso: string) => iso.replace(/-/g, '/');

  const downloadCSV = () => {
    const headers = ['Co', 'GL', 'Date', 'TransNo', 'Details', 'Debit', 'Credit', 'SiteFinal', 'OffsetCode', 'OffsetName', 'DateStatus'];
    const rows = filtered.map(e => [
      e.companyCode, 
      e.glAccount, 
      e.postingDate, 
      e.transNo, 
      `"${(e.details || '').replace(/"/g, '""')}"`, 
      e.debitLC, 
      e.creditLC, 
      e.siteFinal, 
      e.offsetAccountCode4,
      `"${(e.offsetAccountName || '').replace(/"/g, '""')}"`,
      e.postingDateParseStatus
    ]);
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recon_explorer_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#255FA1] uppercase tracking-tight">Transaction Explorer</h2>
          <p className="text-xs text-gray-500 font-bold">Master database view with granular site and offset account filtering.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 bg-[#F15E2A] text-white rounded-xl text-xs font-black shadow-lg hover:bg-[#255FA1] transition-all uppercase tracking-widest">
            <Download size={14} /> Export Dataset
          </button>
        </div>
      </div>

      {/* EXPLORER SPECIFIC FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Filter size={10} /> Filter Site
          </label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search Site (e.g. P088)..." 
              className="w-full pl-3 pr-8 py-2 text-xs border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#255FA1] outline-none font-bold"
              value={localSiteFilter}
              onChange={(e) => setLocalSiteFilter(e.target.value)}
            />
            {localSiteFilter && (
              <button onClick={() => setLocalSiteFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Search size={10} /> Filter Offset Account
          </label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search Code or Name..." 
              className="w-full pl-3 pr-8 py-2 text-xs border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#255FA1] outline-none font-bold"
              value={localOffsetFilter}
              onChange={(e) => setLocalOffsetFilter(e.target.value)}
            />
            {localOffsetFilter && (
              <button onClick={() => setLocalOffsetFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end pb-1 text-[10px] font-bold text-gray-400">
          Showing {filtered.length.toLocaleString()} matching records
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-2">
             <button 
               disabled={currentPage === 1} 
               onClick={() => setCurrentPage(p => p - 1)} 
               className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 disabled:opacity-20 transition-all"
             >
               <ChevronLeft size={18} className="text-[#255FA1]" />
             </button>
             <div className="px-3 py-1 bg-white rounded-md border border-gray-200 text-[11px] font-black text-[#255FA1]">
               {currentPage}
             </div>
             <button 
               disabled={currentPage >= totalPages} 
               onClick={() => setCurrentPage(p => p + 1)} 
               className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 disabled:opacity-20 transition-all"
             >
               <ChevronRight size={18} className="text-[#255FA1]" />
             </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto scrollbar-thin">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 text-gray-400 font-black uppercase tracking-tighter shadow-sm">
              <tr>
                <th className="p-3 w-12 border-r">Co.</th>
                <th className="p-3">Date (Strict)</th>
                <th className="p-3">Trans #</th>
                <th className="p-3">Site</th>
                <th className="p-3">Offset Info</th>
                <th className="p-3">Details</th>
                <th className="p-3 text-right">Debit</th>
                <th className="p-3 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="p-20 text-center text-gray-300 italic">No records match the active explorer filters.</td></tr>
              ) : (
                paginated.map(row => (
                  <tr key={row.rowId} className="hover:bg-[#A1C7C3]/10 transition-colors group">
                    <td className="p-3 font-bold text-gray-400 border-r">{row.companyCode}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-700">{formatDisplayDate(row.postingDate)}</span>
                        <span className={`text-[8px] uppercase px-1 rounded w-fit font-black ${row.postingDateParseFailedFlag ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {row.postingDateParseStatus}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-black text-gray-900 group-hover:text-[#255FA1] transition-colors">{row.transNo}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-black text-[10px] shadow-sm ${row.unknownSiteFlag ? 'bg-red-100 text-red-700' : 'bg-[#255FA1] text-white'}`}>
                        {row.siteFinal}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col leading-tight">
                        <span className="font-black text-[#255FA1]">{row.offsetAccountCode4 || 'N/A'}</span>
                        <span className="text-[9px] text-gray-400 truncate w-32 font-bold uppercase">{row.offsetAccountName}</span>
                      </div>
                    </td>
                    <td className="p-3 max-w-xs truncate font-medium text-gray-600">{row.details || row.ref1}</td>
                    <td className="p-3 text-right font-mono font-black text-[#F15E2A]">
                      {row.debitLC > 0 ? `R ${row.debitLC.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-[#255FA1]">
                      {row.creditLC > 0 ? `R ${row.creditLC.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
