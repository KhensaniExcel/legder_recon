
import { useState, useMemo } from 'react';
import { ImportMetadata, LedgerEntry, AccountDirectoryItem, ReconProfile } from '../types';
import { Upload, FileText, Trash2, Database, Settings, AlertCircle, RefreshCw, X, Table, ShieldAlert, Cloud, Download, ArrowUpCircle, ArrowDownCircle, Code, Copy, Check } from 'lucide-react';
import { processLedgerRow, buildOffsetMapping, getFuzzy } from '../utils/dataProcessor';
import { SQL_SCHEMA, isSupabaseConfigured } from '../services/databaseService';

interface Props {
  entries: LedgerEntry[];
  onImport: (entries: LedgerEntry[], meta: ImportMetadata) => void;
  imports: ImportMetadata[];
  onDeleteImport: (id: string) => void;
  directory: AccountDirectoryItem[];
  onUpdateDirectory: (dir: AccountDirectoryItem[]) => void;
  reconProfiles: ReconProfile[];
  onUpdateProfiles: (profiles: ReconProfile[]) => void;
  onClearAll: () => void;
  onSyncPush: () => Promise<void>;
  onSyncPull: () => Promise<void>;
  syncStatus: string;
  syncError: string | null;
}

declare const XLSX: any;

const REQUIRED_LEDGER_COLUMNS = [
  "Posting Date",
  "Trans. No.",
  "Origin",
  "Offset Account",
  "Debit (LC)",
  "Credit (LC)",
  "Site"
];

export default function ImportPage({
  imports, onImport, onDeleteImport, directory, onUpdateDirectory, reconProfiles, onClearAll, entries,
  onSyncPush, onSyncPull, syncStatus, syncError
}: Props) {
  const [activeTab, setActiveTab] = useState<'history' | 'directory' | 'profiles' | 'cloud'>('history');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  const [companyCode, setCompanyCode] = useState('');
  const [glAccount, setGlAccount] = useState('9020');
  const [label, setLabel] = useState('');

  const failedDates = useMemo(() => {
    return entries.filter(e => e.postingDateParseFailedFlag);
  }, [entries]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!companyCode || !glAccount) {
      setImportError("Please enter Company Code and select a GL Account first.");
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    setImportError(null);

    const processData = (data: any[]) => {
      try {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("The file appears to be empty.");
        }
        const sampleRow = data.find(row => Object.keys(row).length > 3);
        const missing = REQUIRED_LEDGER_COLUMNS.filter(col => getFuzzy(sampleRow, col) === undefined);
        if (missing.length > 0) throw new Error(`Missing required columns: ${missing.join(', ')}.`);

        const importId = Math.random().toString(36).substring(7);
        const meta: ImportMetadata = {
          id: importId,
          companyCode,
          glAccount,
          importLabel: label || `${glAccount} Import (${new Date().toLocaleDateString()})`,
          importedBy: 'Current User',
          importedAt: new Date().toISOString(),
          fileName: file.name
        };

        const offsetMap = buildOffsetMapping([]);
        const processed = data
          .filter(row => row && Object.keys(row).length > 2)
          .map((row: any) => processLedgerRow(row, meta, directory, offsetMap));

        onImport(processed, meta);
        setLabel('');
        setImportError(null);
      } catch (err: any) {
        setImportError(err.message || "An error occurred during file processing.");
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      (window as any).Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => processData(results.data),
        error: (err: any) => { setImportError("CSV Error: " + err.message); setIsImporting(false); }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary', cellDates: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
          processData(data);
        } catch (err: any) { setImportError("Excel Error: " + err.message); setIsImporting(false); }
      };
      reader.readAsBinaryString(file);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm w-fit overflow-x-auto">
          {(['history', 'directory', 'cloud', 'profiles'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${activeTab === tab ? 'bg-[#255FA1] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {tab === 'history' && <FileText size={18} />}
              {tab === 'directory' && <Database size={18} />}
              {tab === 'cloud' && <Cloud size={18} />}
              {tab === 'profiles' && <Settings size={18} />}
              <span className="capitalize">{tab === 'history' ? 'Import Ledger' : tab === 'cloud' ? 'Supabase Sync' : tab === 'profiles' ? 'Recon Profiles' : 'Account Directory'}</span>
            </button>
          ))}
        </div>
        <button onClick={onClearAll} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100">
          <RefreshCw size={16} /> Factory Reset
        </button>
      </div>

      {importError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start gap-4 animate-in slide-in-from-top-2">
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
          <div className="flex-1"><h4 className="font-bold text-sm">Import Error</h4><p className="text-sm opacity-90">{importError}</p></div>
          <button onClick={() => setImportError(null)} className="text-red-400 hover:text-red-600"><X size={20} /></button>
        </div>
      )}

      {activeTab === 'cloud' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xl flex flex-col items-center text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border-4 ${syncStatus === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                syncStatus === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}>
              <Cloud size={40} className={syncStatus === 'syncing' ? 'animate-bounce' : ''} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Supabase Cloud Database</h3>
            <p className="text-gray-500 max-w-md mb-8 font-medium">Sync your ledger reconciliations, site overrides, and audit trails to your central Supabase instance.</p>

            {syncError && (
              <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100 max-w-lg w-full flex items-center gap-3">
                <AlertCircle size={16} />
                <span>{syncError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl mb-12">
              <button onClick={onSyncPush} disabled={syncStatus === 'syncing'} className="flex flex-col items-center justify-center p-6 bg-white border-2 border-blue-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50/30 transition-all group disabled:opacity-50 shadow-sm">
                <ArrowUpCircle className="text-blue-500 mb-3 group-hover:scale-110 transition-transform" size={32} />
                <span className="font-black text-gray-900">Push to Cloud</span>
              </button>
              <button onClick={onSyncPull} disabled={syncStatus === 'syncing'} className="flex flex-col items-center justify-center p-6 bg-white border-2 border-[#F15E2A]/10 rounded-2xl hover:border-[#F15E2A] hover:bg-orange-50/30 transition-all group disabled:opacity-50 shadow-sm">
                <ArrowDownCircle className="text-[#F15E2A] mb-3 group-hover:scale-110 transition-transform" size={32} />
                <span className="font-black text-gray-900">Pull from Cloud</span>
              </button>
            </div>

            <div className="w-full max-w-2xl border-t border-gray-100 pt-8">
              <div className="flex items-center justify-between mb-4">
                <div className="text-left">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <ShieldAlert size={16} className="text-[#F15E2A]" />
                    Database Setup Required
                  </h4>
                  <p className="text-xs text-gray-400 font-bold">Ensure the tables exist in your Supabase project before syncing.</p>
                </div>
                <button
                  onClick={() => setShowSql(!showSql)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Code size={14} /> {showSql ? 'Hide SQL' : 'Show SQL Schema'}
                </button>
              </div>

              {showSql && (
                <div className="animate-in zoom-in-95 duration-200">
                  <div className="relative bg-slate-900 rounded-xl p-4 text-left overflow-hidden">
                    <button onClick={copySql} className="absolute right-4 top-4 p-2 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors">
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                    <pre className="text-[10px] text-blue-300 font-mono overflow-auto max-h-64 scrollbar-thin scrollbar-thumb-white/10">
                      {SQL_SCHEMA}
                    </pre>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold text-left border border-blue-100">
                    <p>Copy the code above and paste it into the <strong>SQL Editor</strong> in your Supabase Dashboard to create the necessary tables.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800"><Upload size={20} className="text-blue-500" /> Upload New Ledger</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Company Code *</label>
                    <input type="text" placeholder="e.g. 1000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white font-bold" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Target GL Account *</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white font-bold" value={glAccount} onChange={(e) => setGlAccount(e.target.value)}><option value="9020">9020 - Revenue Control</option><option value="8055">8055 - Tenant Revenue</option></select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Import Label</label>
                    <input type="text" placeholder="e.g. Jul22-Nov25 Recon" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white font-bold" value={label} onChange={(e) => setLabel(e.target.value)} />
                  </div>
                  <div className="pt-4">
                    <label className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all ${companyCode ? 'border-blue-300 bg-blue-50/50 hover:bg-blue-100/50' : 'border-gray-200 bg-gray-50 cursor-not-allowed'}`}>
                      {isImporting ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div> : <><Upload className={`${companyCode ? 'text-blue-600' : 'text-gray-300'} mb-2`} size={32} /><span className="text-sm font-bold text-gray-700">Excel or CSV</span></>}
                      <input type="file" accept=".csv, .xls, .xlsx" className="hidden" onChange={handleFileUpload} disabled={!companyCode || isImporting} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[450px]">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between"><span className="font-bold text-gray-700 text-sm">Recent Imports</span><span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{imports.length} Files</span></div>
                <div className="divide-y divide-gray-100 overflow-auto max-h-[400px]">
                  {imports.length === 0 ? <div className="p-20 text-center text-gray-300 italic">No files imported.</div> : imports.map(imp => (
                    <div key={imp.id} className="p-4 flex items-center justify-between hover:bg-gray-50 group">
                      <div className="flex items-center gap-4"><div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100"><FileText size={20} /></div><div><div className="font-bold text-gray-900 text-sm">{imp.importLabel}</div><div className="text-[10px] text-gray-500 font-mono">CO: {imp.companyCode} | GL: {imp.glAccount}</div></div></div>
                      <button onClick={() => onDeleteImport(imp.id)} className="p-2 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
