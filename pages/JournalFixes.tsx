
import React from 'react';
import { JournalInstruction } from '../types';
import { ClipboardList, Download, ArrowRight, CheckCircle2, Clock, Trash2 } from 'lucide-react';

interface Props {
  instructions: JournalInstruction[];
  onUpdateStatus: (id: string, status: 'Draft' | 'Sent' | 'Processed') => void;
}

export default function JournalFixes({ instructions, onUpdateStatus }: Props) {
  const downloadCSV = () => {
    const headers = ['ID', 'TransNo', 'Company', 'GL', 'Site', 'OriginalAmt', 'AdjAmt', 'Instruction', 'Status', 'Date'];
    const rows = instructions.map(i => [i.id, i.reference, i.companyCode, i.glAccount, i.siteFinal, i.originalAmount, i.adjustmentAmount, i.instruction, i.status, i.createdAt]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journal_fixes_export_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#255FA1] flex items-center gap-3 uppercase tracking-tight">
            <ClipboardList className="text-[#F15E2A]" size={24} />
            Accounting Journal Fixes
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-bold italic">Manual corrections requested for accounting processing.</p>
        </div>
        <button onClick={downloadCSV} className="px-4 py-2 bg-[#F15E2A] text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg uppercase tracking-widest hover:bg-[#255FA1] transition-all">
          <Download size={16} /> Export Instruction Pack
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="overflow-auto flex-1 scrollbar-thin">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="sticky top-0 bg-[#255FA1]/5 border-b border-gray-200 z-10 text-gray-400 font-black uppercase tracking-tighter">
              <tr>
                <th className="p-4">Reference</th>
                <th className="p-4">Entity/Site</th>
                <th className="p-4 text-right">Adj. Amount</th>
                <th className="p-4">Instruction</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {instructions.length === 0 ? (
                <tr><td colSpan={6} className="p-24 text-center text-gray-300 italic">No manual fixes have been identified yet.</td></tr>
              ) : (
                instructions.map(inst => (
                  <tr key={inst.id} className="hover:bg-[#A1C7C3]/5 transition-colors group">
                    <td className="p-4">
                       <div className="flex flex-col leading-tight">
                          <span className="font-black text-[#255FA1]">{inst.reference}</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase">{new Date(inst.createdAt).toLocaleDateString()}</span>
                       </div>
                    </td>
                    <td className="p-4">
                       <div className="flex flex-col">
                          <span className="font-black text-gray-900">CO: {inst.companyCode} | GL: {inst.glAccount}</span>
                          <span className="text-[10px] text-blue-500 font-black uppercase">Site: {inst.siteFinal}</span>
                       </div>
                    </td>
                    <td className="p-4 text-right">
                       <div className="flex flex-col">
                          <span className={`font-black ${inst.adjustmentAmount < 0 ? 'text-[#F15E2A]' : 'text-[#255FA1]'}`}>R {inst.adjustmentAmount.toLocaleString()}</span>
                          <span className="text-[8px] text-gray-400">Orig: {inst.originalAmount.toLocaleString()}</span>
                       </div>
                    </td>
                    <td className="p-4 text-gray-700 font-medium italic max-w-xs truncate" title={inst.instruction}>
                      "{inst.instruction}"
                    </td>
                    <td className="p-4">
                       <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase w-fit flex items-center gap-1 ${inst.status === 'Processed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                          {inst.status === 'Processed' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {inst.status}
                       </div>
                    </td>
                    <td className="p-4 text-center">
                       <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => onUpdateStatus(inst.id, inst.status === 'Processed' ? 'Draft' : 'Processed')}
                            className={`p-1.5 rounded-lg transition-all ${inst.status === 'Processed' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}
                          >
                             {inst.status === 'Processed' ? 'Mark Draft' : 'Mark Done'}
                          </button>
                       </div>
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
