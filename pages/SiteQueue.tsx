
import React, { useMemo, useState } from 'react';
import { LedgerEntry } from '../types';
import { 
  AlertCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Save,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Copy
} from 'lucide-react';

interface Props {
  entries: LedgerEntry[];
  onUpdateEntry: (id: string, updates: Partial<LedgerEntry>) => void;
  filters: any;
}

export default function SiteQueue({ entries, onUpdateEntry, filters }: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({});

  const queueEntries = useMemo(() => {
    return entries.filter(e => {
      const needsReview = e.siteReviewStatus === 'Open';
      if (!needsReview) return false;
      if (filters.companyCode && e.companyCode !== filters.companyCode) return false;
      if (filters.glAccount && e.glAccount !== filters.glAccount) return false;
      if (filters.searchText) {
        const s = filters.searchText.toLowerCase();
        return e.transNo.toLowerCase().includes(s) || e.details.toLowerCase().includes(s) || e.siteFinal.toLowerCase().includes(s);
      }
      return true;
    });
  }, [entries, filters]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  const handleManualAssign = (id: string) => {
    const site = manualInputs[id];
    if (!site) return;
    onUpdateEntry(id, { siteOverride: site, siteReviewStatus: 'Resolved' });
    setManualInputs(prev => {
      const n = {...prev};
      delete n[id];
      return n;
    });
  };

  const formatDisplayDate = (iso: string) => iso.replace(/-/g, '/');

  const copyDebugInfo = (row: LedgerEntry) => {
    const info = `Trans: ${row.transNo}\nRaw Date: "${row.postingDateRaw}"\nStatus: ${row.postingDateParseStatus}\nReason: ${row.dateFailureReason}\nDetected: ${row.postingDateFormatDetected}`;
    navigator.clipboard.writeText(info);
    alert("Debug info copied to clipboard.");
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <HelpCircle className="text-amber-500" size={24} />
            Site Correction Queue
            <span className="ml-2 px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-bold">
              {queueEntries.length} Items
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-medium">Identify and fix misallocated sites or date parsing errors from the raw data.</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4 w-12"></th>
                <th className="p-4">Transaction Details</th>
                <th className="p-4">Suggested Site</th>
                <th className="p-4">Validation Flags</th>
                <th className="p-4">Correction</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {queueEntries.length === 0 ? (
                <tr><td colSpan={6} className="p-24 text-center text-gray-300 italic">Queue is currently empty. Great job!</td></tr>
              ) : (
                queueEntries.map(row => {
                  const isExpanded = expandedRows.has(row.rowId);
                  const isDateFail = row.postingDateParseFailedFlag;
                  return (
                    <React.Fragment key={row.rowId}>
                      <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                        <td className="p-4">
                          <button onClick={() => toggleExpand(row.rowId)} className="p-1 rounded text-gray-400 hover:text-blue-600">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{row.transNo}</span>
                            <span className={`text-[9px] font-bold ${isDateFail ? 'text-red-500 underline' : 'text-gray-400'}`}>
                              Raw: {row.postingDateRaw || 'Empty'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                           <div className={`px-2 py-1 rounded border font-bold text-[10px] w-fit ${row.suggestedSite ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                             {row.suggestedSite || 'N/A'}
                           </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {row.whyFlagged.map(f => (
                              <span key={f} className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[9px] font-bold uppercase border border-red-100 flex items-center gap-1">
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center gap-2">
                             <input 
                                type="text" placeholder="P###" 
                                className="w-16 px-2 py-1 border border-gray-200 rounded text-[10px] font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                                value={manualInputs[row.rowId] || ''}
                                onChange={(e) => setManualInputs(p => ({...p, [row.rowId]: e.target.value.toUpperCase()}))}
                             />
                             <button onClick={() => handleManualAssign(row.rowId)} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm"><Save size={12} /></button>
                           </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => copyDebugInfo(row)} 
                              className="p-1.5 hover:bg-gray-200 rounded text-gray-400" 
                              title="Diagnostic Info"
                            >
                              <Terminal size={14} />
                            </button>
                            {row.suggestedSite && (
                              <button onClick={() => onUpdateEntry(row.rowId, { siteOverride: row.suggestedSite, siteReviewStatus: 'Resolved' })} className="px-2 py-1 bg-emerald-600 text-white rounded text-[9px] font-bold hover:bg-emerald-700 uppercase">Auto Apply</button>
                            )}
                            <button onClick={() => onUpdateEntry(row.rowId, { siteReviewStatus: 'Resolved' })} className="p-1.5 hover:bg-emerald-50 rounded text-emerald-600"><CheckCircle2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="p-4 bg-slate-50 border-b border-gray-200 animate-in slide-in-from-top-1">
                             <div className="grid grid-cols-3 gap-6 text-[10px]">
                                <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                                   <div className="font-bold text-gray-400 mb-2 uppercase tracking-widest">Diagnostic Date Details</div>
                                   <div className="space-y-1">
                                      <div className="flex justify-between"><span>Parser Status:</span> <span className={`font-bold ${isDateFail ? 'text-red-500' : 'text-emerald-500'}`}>{row.postingDateParseStatus}</span></div>
                                      <div className="flex justify-between"><span>Detected Format:</span> <span className="font-mono">{row.postingDateFormatDetected}</span></div>
                                      <div className="flex justify-between"><span>Parsed Output:</span> <span className="font-bold">{row.postingDate}</span></div>
                                      <div className="pt-2 italic text-red-600 border-t border-red-50">{row.dateFailureReason || "No logic errors found."}</div>
                                   </div>
                                </div>
                                <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                                   <div className="font-bold text-gray-400 mb-2 uppercase tracking-widest">Classification</div>
                                   <div className="space-y-1">
                                      <div>Origin: <span className="font-bold text-blue-600">{row.origin} ({row.originCategory})</span></div>
                                      <div>Type: <span className="font-bold text-purple-600 uppercase">{row.tenantSubType || 'N/A'}</span></div>
                                      <div className="pt-1 text-gray-500 leading-tight">Ref: {row.ref1 || 'None'}</div>
                                   </div>
                                </div>
                                <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                                   <div className="font-bold text-gray-400 mb-2 uppercase tracking-widest">Offset Information</div>
                                   <div className="text-lg font-black text-gray-800">{row.offsetAccountCode4}</div>
                                   <div className="text-gray-500 font-medium">{row.offsetAccountName || 'Unknown Counterparty'}</div>
                                </div>
                             </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
