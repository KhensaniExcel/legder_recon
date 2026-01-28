import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IDatabaseProvider, SyncData } from './IDatabaseProvider';
import { Company, ImportMetadata, LedgerEntry, AccountDirectoryItem, Allocation, SiteOverrideLog, JournalInstruction, ReconProfile } from '../../types';

export class SupabaseProvider implements IDatabaseProvider {
    private supabase: SupabaseClient | null = null;
    private url: string;
    private key: string;

    constructor(url: string, key: string) {
        this.url = url;
        this.key = key;
        if (this.url && this.key) {
            this.supabase = createClient(this.url, this.key);
        }
    }

    isConfigured(): boolean {
        return !!(this.supabase && this.url && this.key);
    }

    private toDb(obj: any): any {
        if (Array.isArray(obj)) return obj.map(o => this.toDb(o));
        if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).reduce((acc, key) => {
                let snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

                // Fix for "LC" suffix (e.g. debitLC -> debit_lc, NOT debit_l_c)
                snakeKey = snakeKey.replace(/_l_c$/, '_lc');

                acc[snakeKey] = this.toDb(obj[key]);
                return acc;
            }, {} as any);
        }
        return obj;
    }

    private fromDb(obj: any): any {
        if (Array.isArray(obj)) return obj.map(o => this.fromDb(o));
        if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).reduce((acc, key) => {
                let camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());

                // Fix for "LC" suffix (e.g. debitLc -> debitLC)
                if (camelKey.endsWith('Lc')) {
                    camelKey = camelKey.slice(0, -2) + 'LC';
                }

                acc[camelKey] = this.fromDb(obj[key]);
                return acc;
            }, {} as any);
        }
        return obj;
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    }

    async pushData(data: SyncData): Promise<boolean> {
        if (!this.supabase) throw new Error("Supabase client not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");

        const mapped = {
            companies: this.toDb(data.companies),
            imports: this.toDb(data.imports),
            ledger_entries: this.toDb(data.entries),
            account_directory: this.toDb(data.directory),
            allocations: this.toDb(data.allocations),
            site_override_logs: this.toDb(data.overrideLogs),
            journal_instructions: this.toDb(data.journalInstructions),
            recon_profiles: this.toDb(data.reconProfiles),
        };

        const results = [];

        // Simple tables
        if (mapped.companies.length) results.push(this.supabase.from('companies').upsert(mapped.companies, { onConflict: 'code' }));
        if (mapped.imports.length) results.push(this.supabase.from('imports').upsert(mapped.imports, { onConflict: 'id' }));
        if (mapped.account_directory.length) results.push(this.supabase.from('account_directory').upsert(mapped.account_directory, { onConflict: 'code' }));
        if (mapped.allocations.length) results.push(this.supabase.from('allocations').upsert(mapped.allocations, { onConflict: 'id' }));
        if (mapped.site_override_logs.length) results.push(this.supabase.from('site_override_logs').upsert(mapped.site_override_logs, { onConflict: 'id' }));
        if (mapped.journal_instructions.length) results.push(this.supabase.from('journal_instructions').upsert(mapped.journal_instructions, { onConflict: 'id' }));
        if (mapped.recon_profiles.length) results.push(this.supabase.from('recon_profiles').upsert(mapped.recon_profiles, { onConflict: 'gl_account' }));

        // Chunked upload for Ledger Entries
        if (mapped.ledger_entries.length) {
            const chunks = this.chunkArray(mapped.ledger_entries, 250);
            for (const chunk of chunks) {
                results.push(this.supabase.from('ledger_entries').upsert(chunk, { onConflict: 'row_id' }));
            }
        }

        const responses = await Promise.all(results);
        const errors = responses.filter(r => r && r.error);

        if (errors.length > 0) {
            console.error("Supabase Sync Error:", errors);
            const msg = errors.map(e => e.error?.message).join('; ');
            throw new Error(`Database Error: ${msg}`);
        }

        return true;
    }

    async pullData(): Promise<SyncData> {
        if (!this.supabase) throw new Error("Supabase client not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");

        const [
            { data: companies },
            { data: imports },
            { data: entries },
            { data: directory },
            { data: allocations },
            { data: overrideLogs },
            { data: journalInstructions },
            { data: reconProfiles }
        ] = await Promise.all([
            this.supabase.from('companies').select('*'),
            this.supabase.from('imports').select('*'),
            this.supabase.from('ledger_entries').select('*'),
            this.supabase.from('account_directory').select('*'),
            this.supabase.from('allocations').select('*'),
            this.supabase.from('site_override_logs').select('*'),
            this.supabase.from('journal_instructions').select('*'),
            this.supabase.from('recon_profiles').select('*')
        ]);

        return {
            companies: this.fromDb(companies || []),
            imports: this.fromDb(imports || []),
            entries: this.fromDb(entries || []),
            directory: this.fromDb(directory || []),
            allocations: this.fromDb(allocations || []),
            overrideLogs: this.fromDb(overrideLogs || []),
            journalInstructions: this.fromDb(journalInstructions || []),
            reconProfiles: this.fromDb(reconProfiles || [])
        };
    }
}
