import React, { useState, useMemo, useDeferredValue } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    RefreshCcw,
    AlertCircle,
    Search,
    Upload,
    History,
    ClipboardList,
    LayoutGrid,
    Cloud,
    Trash2,
    Filter
} from 'lucide-react';
import { useReconStore } from '../store/useReconStore';
import { pushToSupabase, isSupabaseConfigured } from '../services/databaseService';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        filters, setFilters,
        companies, entries,
        imports, directory, allocations, overrideLogs, journalInstructions, reconProfiles,
        clearAllData
    } = useReconStore();

    const [isSiteSelectorOpen, setIsSiteSelectorOpen] = useState(false);
    const [siteSearch, setSiteSearch] = useState('');
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

    // Site List Logic
    const siteList = useMemo(() => {
        const sites = new Set<string>();
        entries.forEach(e => {
            if (e.siteFinal && e.siteFinal !== 'Unknown') sites.add(e.siteFinal);
        });
        return Array.from(sites).sort();
    }, [entries]);

    const filteredSiteList = useMemo(() => {
        if (!siteSearch) return siteList;
        const s = siteSearch.toLowerCase();
        return siteList.filter(site => site.toLowerCase().includes(s));
    }, [siteList, siteSearch]);

    const handleCloudPush = async () => {
        if (!isSupabaseConfigured()) {
            alert("Database not configured.");
            return;
        }
        setSyncStatus('syncing');
        try {
            await pushToSupabase({
                entries, imports, directory, allocations, overrideLogs, journalInstructions, companies, reconProfiles
            });
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (err: any) {
            setSyncStatus('error');
            // console.error(err);
        }
    };

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/recon', label: 'Recon Workspace', icon: RefreshCcw },
        { path: '/full-list', label: 'Full Recon List', icon: LayoutGrid },
        { path: '/journal', label: 'Journal Fixes', icon: ClipboardList },
        { path: '/queue', label: 'Site Queue', icon: AlertCircle },
        { path: '/audit', label: 'Audit Trail', icon: History },
        { path: '/explorer', label: 'Explorer', icon: Search },
        { path: '/import', label: 'Import & Setup', icon: Upload },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <aside className="w-64 bg-[#255FA1] text-white flex flex-col shrink-0">
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-xl font-black flex items-center gap-2 tracking-tighter">
                        <RefreshCcw className="text-[#A1C7C3]" /> LEDGER RECON
                    </h1>
                    <p className="text-[10px] text-white/60 mt-1 uppercase tracking-widest font-bold">Accounting Hub</p>
                </div>
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-bold ${isActive ? 'bg-[#F15E2A] text-white shadow-lg' : 'text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="p-4 border-t border-white/10 space-y-2">
                    <button
                        onClick={handleCloudPush}
                        disabled={syncStatus === 'syncing'}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-black text-blue-100 hover:bg-blue-500/20 rounded border border-blue-400/30 uppercase disabled:opacity-50"
                    >
                        <Cloud size={12} className={syncStatus === 'syncing' ? 'animate-pulse' : ''} />
                        {syncStatus === 'syncing' ? 'Syncing...' : 'Save Data'}
                    </button>
                    <button onClick={() => { if (window.confirm('Clear all?')) { clearAllData(); navigate('/import'); } }} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold text-red-100 hover:bg-red-500/20 rounded border border-red-400/30 uppercase">
                        <Trash2 size={12} /> Clear Database
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-[100] shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        {/* Company Filter */}
                        <div className="flex flex-col">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Company</label>
                            <select
                                className="text-xs border-gray-200 rounded px-2 py-1 bg-white outline-none font-bold min-w-[80px]"
                                value={filters.companyCode}
                                onChange={(e) => setFilters({ companyCode: e.target.value })}
                            >
                                <option value="">All</option>
                                {companies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                            </select>
                        </div>

                        {/* Account Filter */}
                        <div className="flex flex-col">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Account</label>
                            <select
                                className="text-xs border-gray-200 rounded px-2 py-1 bg-white outline-none font-bold min-w-[80px]"
                                value={filters.glAccount}
                                onChange={(e) => setFilters({ glAccount: e.target.value })}
                            >
                                <option value="">All</option>
                                <option value="9020">9020</option>
                                <option value="8055">8055</option>
                            </select>
                        </div>

                        {/* Site Filter */}
                        <div className="flex flex-col relative">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Site Filter</label>
                            <button
                                onClick={() => setIsSiteSelectorOpen(!isSiteSelectorOpen)}
                                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white outline-none font-bold min-w-[140px] text-left flex justify-between items-center"
                            >
                                <span className="truncate w-24">
                                    {filters.site.length === 0 ? 'All Sites' :
                                        filters.site.length === 1 ? filters.site[0] :
                                            `${filters.site.length} selected`}
                                </span>
                                <Filter size={10} className="text-[#F15E2A]" />
                            </button>
                            {isSiteSelectorOpen && (
                                <>
                                    <div className="fixed inset-0 z-[200]" onClick={() => { setIsSiteSelectorOpen(false); setSiteSearch(''); }}></div>
                                    <div className="absolute top-10 left-0 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 z-[210] max-h-[450px] flex flex-col animate-in zoom-in-95 origin-top">
                                        <div className="flex items-center justify-between mb-2 pb-2 border-b">
                                            <span className="text-[10px] font-black uppercase text-gray-400">Select Sites</span>
                                            <button onClick={() => setFilters({ site: [] })} className="text-[10px] text-[#255FA1] font-bold hover:underline">Clear</button>
                                        </div>
                                        <div className="mb-2 relative">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                            <input
                                                type="text"
                                                placeholder="Search site number..."
                                                className="w-full text-xs border border-gray-100 rounded pl-8 pr-2 py-2 focus:border-[#F15E2A] outline-none font-bold"
                                                autoFocus
                                                value={siteSearch}
                                                onChange={(e) => setSiteSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1 overflow-y-auto flex-1 scrollbar-thin">
                                            {filteredSiteList.length === 0 ? (
                                                <div className="text-[10px] text-gray-400 p-4 text-center italic">No matching sites found</div>
                                            ) : (
                                                filteredSiteList.map(s => (
                                                    <label key={s} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={filters.site.includes(s)}
                                                            onChange={(e) => {
                                                                const next = e.target.checked ? [...filters.site, s] : filters.site.filter(x => x !== s);
                                                                setFilters({ site: next });
                                                            }}
                                                            className="w-3.5 h-3.5 rounded border-gray-300 text-[#F15E2A] focus:ring-[#F15E2A]"
                                                        />
                                                        <span className="text-xs font-bold text-gray-700">{s}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Date Filters */}
                        <div className="flex items-center gap-2 border-l border-gray-100 pl-4">
                            <div className="flex flex-col">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">From</label>
                                <input
                                    type="month"
                                    className="text-xs border-gray-200 rounded px-2 py-1 bg-white outline-none font-bold"
                                    value={filters.monthFrom}
                                    onChange={(e) => setFilters({ monthFrom: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">To</label>
                                <input
                                    type="month"
                                    className="text-xs border-gray-200 rounded px-2 py-1 bg-white outline-none font-bold"
                                    value={filters.monthTo}
                                    onChange={(e) => setFilters({ monthTo: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search details..."
                                className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-full text-xs w-64 focus:ring-2 focus:ring-[#255FA1] outline-none"
                                value={filters.searchText}
                                onChange={(e) => setFilters({ searchText: e.target.value })}
                            />
                        </div>
                        {syncStatus !== 'idle' && (
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-right ${syncStatus === 'syncing' ? 'bg-blue-50 text-blue-600' :
                                syncStatus === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                }`}>
                                <Cloud size={12} className={syncStatus === 'syncing' ? 'animate-pulse' : ''} />
                                {syncStatus}
                            </div>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-hidden relative">
                    <div className="absolute inset-0 overflow-auto p-6 scrollbar-thin">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
