
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LedgerEntry, Allocation } from '../types';
import { TrendingUp, CheckCircle, Clock, AlertCircle, FileX, LayoutList } from 'lucide-react';

interface Props {
  entries: LedgerEntry[];
  allocations: Allocation[];
  filters: any;
}

// Updated with CI Colors
const COLORS = ['#255FA1', '#F15E2A', '#A1C7C3', '#020010', '#8b5cf6'];

export default function Dashboard({ entries, allocations, filters }: Props) {
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (filters.companyCode && e.companyCode !== filters.companyCode) return false;
      if (filters.glAccount && e.glAccount !== filters.glAccount) return false;
      if (filters.site && filters.site.length > 0 && !filters.site.includes(e.siteFinal)) return false;
      
      if (filters.monthFrom && e.transactionMonth < filters.monthFrom) return false;
      if (filters.monthTo && e.transactionMonth > filters.monthTo) return false;
      
      return true;
    });
  }, [entries, filters]);

  const stats = useMemo(() => {
    const credits = filteredEntries.filter(e => e.direction === 'Credit').reduce((sum, e) => sum + (e.creditLC || 0), 0);
    const debits = filteredEntries.filter(e => e.direction === 'Debit').reduce((sum, e) => sum + (e.debitLC || 0), 0);
    const openQueueCount = filteredEntries.filter(e => e.siteReviewStatus === 'Open').length;
    const unknownSites = filteredEntries.filter(e => e.unknownSiteFlag).length;
    
    return {
      credits,
      debits,
      net: credits - debits,
      movement: debits - credits,
      openQueueCount,
      unknownSites
    };
  }, [filteredEntries]);

  const originData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredEntries.forEach(e => {
      const cat = e.businessMeaning || 'Other';
      data[cat] = (data[cat] || 0) + 1;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value: isNaN(value) ? 0 : value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredEntries]);

  const topSites = useMemo(() => {
    const data: Record<string, number> = {};
    filteredEntries.forEach(e => {
      const site = e.siteFinal || 'Unknown';
      const val = e.netMovementLC || 0;
      data[site] = (data[site] || 0) + val;
    });
    return Object.entries(data)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 10)
      .map(([name, value]) => ({ name, value: isNaN(value) ? 0 : value }));
  }, [filteredEntries]);

  const formatCurrency = (val: number) => {
    return `R ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (entries.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-gray-400 animate-in fade-in">
        <FileX size={64} className="mb-4 opacity-20" />
        <h2 className="text-xl font-bold">No Data Available</h2>
        <p>Go to the <strong>Import & Setup</strong> page to upload your ledger files.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-[#255FA1]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-bold uppercase tracking-tighter">Net Movement</span>
            <TrendingUp className="text-[#255FA1]" size={20} />
          </div>
          <div className="text-2xl font-black text-gray-900">
            {formatCurrency(stats.movement)}
          </div>
          <div className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">Debit-positive impact</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-[#F15E2A]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-bold uppercase tracking-tighter">Queue Items</span>
            <LayoutList className="text-[#F15E2A]" size={20} />
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.openQueueCount}</div>
          <div className="mt-2 text-[10px] text-[#F15E2A] font-bold uppercase tracking-widest">Exceptions & Reviews</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-[#020010]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-bold uppercase tracking-tighter">Missing Sites</span>
            <AlertCircle className="text-[#020010]" size={20} />
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.unknownSites}</div>
          <div className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">Requires mapping</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-[#A1C7C3]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-bold uppercase tracking-tighter">Data Integrity</span>
            <CheckCircle className="text-[#A1C7C3]" size={20} />
          </div>
          <div className="text-2xl font-black text-gray-900">
            {filteredEntries.length > 0 ? Math.round(((filteredEntries.length - stats.unknownSites) / filteredEntries.length) * 100) : 0}%
          </div>
          <div className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">Valid Site Rows</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-black text-[#255FA1] mb-6 flex items-center gap-2 text-sm uppercase tracking-tight">
            <Clock size={18} />
            Net Movement by Site (Top 10)
          </h3>
          <div className="h-80">
            {topSites.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSites}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#255FA1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 italic">No site data to visualize</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-black text-[#255FA1] mb-6 text-sm uppercase tracking-tight">Business Meaning Split</h3>
          <div className="h-64">
            {originData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={originData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {originData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-gray-300 italic">No category data</div>
            )}
          </div>
          <div className="mt-4 space-y-2 max-h-40 overflow-auto scrollbar-thin">
            {originData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-gray-600 truncate max-w-[140px] font-bold">{item.name}</span>
                </div>
                <span className="font-black text-gray-900">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
