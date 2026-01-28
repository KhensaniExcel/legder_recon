
import React from 'react';
import { SiteOverrideLog } from '../types';
import { History, FileText, User, Calendar, MapPin, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  logs: SiteOverrideLog[];
}

export default function AuditTrail({ logs }: Props) {
  const sortedLogs = [...logs].sort((a, b) => b.changedAt.localeCompare(a.changedAt));

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#255FA1] flex items-center gap-3 uppercase tracking-tight">
            <History className="text-[#F15E2A]" size={24} />
            Site Re-Allocation Audit
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-bold">Full trail of manual site corrections and adjustments.</p>
        </div>
        <div className="px-3 py-1 bg-[#A1C7C3]/20 text-[#255FA1] rounded-full text-[10px] font-black uppercase tracking-widest">
          {logs.length} Total Changes
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 scrollbar-thin">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="sticky top-0 bg-[#255FA1]/5 border-b border-gray-200 z-10 text-gray-400 font-black uppercase tracking-tighter">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Transaction</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Transition</th>
                <th className="p-4">Performed By</th>
                <th className="p-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-24 text-center text-gray-300 italic">
                    No manual site corrections have been logged yet.
                  </td>
                </tr>
              ) : (
                sortedLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#A1C7C3]/5 transition-colors">
                    <td className="p-4">
                       <div className="flex flex-col">
                          <span className="font-black text-gray-900">{new Date(log.changedAt).toLocaleDateString()}</span>
                          <span className="text-[10px] text-gray-400 font-bold">{new Date(log.changedAt).toLocaleTimeString()}</span>
                       </div>
                    </td>
                    <td className="p-4">
                       <div className="flex flex-col">
                          <span className="font-black text-[#255FA1] flex items-center gap-1">
                            <FileText size={10} className="text-[#F15E2A]" /> {log.transNo}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">Date: {log.postingDate}</span>
                       </div>
                    </td>
                    <td className="p-4 font-mono">
                       <div className="flex items-center gap-2 font-black">
                          {log.direction === 'Credit' ? <TrendingUp size={12} className="text-[#A1C7C3]"/> : <TrendingDown size={12} className="text-[#F15E2A]"/>}
                          <span className={log.direction === 'Credit' ? 'text-[#255FA1]' : 'text-[#F15E2A]'}>
                            R {log.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                       </div>
                       <div className="text-[8px] uppercase font-bold text-gray-400">{log.direction}</div>
                    </td>
                    <td className="p-4">
                       <div className="flex items-center gap-3 font-mono">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-400 line-through font-bold">{log.oldSite}</span>
                          <ArrowRight size={14} className="text-[#F15E2A]" />
                          <span className="px-2 py-0.5 bg-[#255FA1] text-white rounded font-black shadow-sm">{log.newSite}</span>
                       </div>
                    </td>
                    <td className="p-4">
                       <div className="flex items-center gap-2 font-black text-gray-700">
                          <User size={14} className="text-[#F15E2A]" />
                          {log.changedBy}
                       </div>
                    </td>
                    <td className="p-4 text-gray-500 italic font-bold">
                      {log.reason || 'Manual Correction'}
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
