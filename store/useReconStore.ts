import { create } from 'zustand';
import { LedgerEntry, Company, ImportMetadata, AccountDirectoryItem, Allocation, SiteOverrideLog, JournalInstruction, ReconProfile } from '../types';

interface GlobalFilters {
    companyCode: string;
    glAccount: string;
    monthFrom: string;
    monthTo: string;
    site: string[];
    searchText: string;
}

interface ReconState {
    entries: LedgerEntry[];
    companies: Company[];
    imports: ImportMetadata[];
    allocations: Allocation[];
    directory: AccountDirectoryItem[];
    overrideLogs: SiteOverrideLog[];
    journalInstructions: JournalInstruction[];
    reconProfiles: ReconProfile[];

    filters: GlobalFilters;

    // Setters
    setFilters: (filters: Partial<GlobalFilters>) => void;
    setEntries: (entries: LedgerEntry[]) => void;
    setCompanies: (companies: Company[]) => void;
    setImports: (imports: ImportMetadata[]) => void;
    setAllocations: (allocations: Allocation[]) => void;
    setDirectory: (directory: AccountDirectoryItem[]) => void;
    setOverrideLogs: (overrideLogs: SiteOverrideLog[]) => void;
    setJournalInstructions: (journalInstructions: JournalInstruction[]) => void;
    setReconProfiles: (reconProfiles: ReconProfile[]) => void;

    // Actions
    addEntries: (newEntries: LedgerEntry[], newImport: ImportMetadata) => void;
    updateEntryWithLog: (rowId: string, updates: Partial<LedgerEntry>) => void;
    addAllocation: (alloc: Allocation) => void;
    addJournalFix: (fix: JournalInstruction) => void;
    clearAllData: () => void;
}

export const useReconStore = create<ReconState>((set) => ({
    entries: [],
    companies: [],
    imports: [],
    allocations: [],
    directory: [],
    overrideLogs: [],
    journalInstructions: [],
    reconProfiles: [],

    filters: {
        companyCode: '',
        glAccount: '',
        monthFrom: '',
        monthTo: '',
        site: [],
        searchText: ''
    },

    setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),

    setEntries: (entries) => set({ entries }),
    setCompanies: (companies) => set({ companies }),
    setImports: (imports) => set({ imports }),
    setAllocations: (allocations) => set({ allocations }),
    setDirectory: (directory) => set({ directory }),
    setOverrideLogs: (overrideLogs) => set({ overrideLogs }),
    setJournalInstructions: (journalInstructions) => set({ journalInstructions }),
    setReconProfiles: (reconProfiles) => set({ reconProfiles }),

    addEntries: (newEntries, newImport) => set((state) => {
        const codes = Array.from(new Set(newEntries.map(e => e.companyCode)));
        const existingCodes = new Set(state.companies.map(c => c.code));
        const freshCompanies = codes.filter(c => !existingCodes.has(c)).map(code => ({ code, name: `Company ${code}` }));

        return {
            entries: [...state.entries, ...newEntries],
            imports: [newImport, ...state.imports],
            companies: [...state.companies, ...freshCompanies]
        };
    }),

    updateEntryWithLog: (rowId, updates) => set((state) => {
        let newLog: SiteOverrideLog | null = null;

        // We map over entries to update the specific one
        const newEntries = state.entries.map(e => {
            if (e.rowId !== rowId) return e;
            const newEntry = { ...e, ...updates };

            if (updates.siteOverride !== undefined) {
                newLog = {
                    id: Math.random().toString(36).substring(7),
                    rowId: e.rowId,
                    companyCode: e.companyCode,
                    glAccount: e.glAccount,
                    transNo: e.transNo,
                    postingDate: e.postingDate,
                    oldSite: e.siteFinal,
                    newSite: updates.siteOverride || e.site || e.suggestedSite || 'Unknown',
                    amount: e.creditLC || e.debitLC || 0,
                    direction: e.direction,
                    changedBy: 'Current User',
                    changedAt: new Date().toISOString(),
                    reason: 'Manual correction in workspace'
                };

                newEntry.siteFinal = newLog.newSite;
                newEntry.siteSource = updates.siteOverride ? 'Manual Override' : (e.site ? 'Site Column' : 'Derived');
                newEntry.unknownSiteFlag = newEntry.siteFinal === 'Unknown';
                newEntry.siteReviewStatus = 'Resolved';
            }
            return newEntry;
        });

        return {
            entries: newEntries,
            overrideLogs: newLog ? [...state.overrideLogs, newLog] : state.overrideLogs
        };
    }),

    addAllocation: (alloc) => set((state) => ({ allocations: [...state.allocations, alloc] })),
    addJournalFix: (fix) => set((state) => ({ journalInstructions: [...state.journalInstructions, fix] })),

    clearAllData: () => set({
        entries: [],
        imports: [],
        allocations: [],
        directory: [],
        overrideLogs: [],
        journalInstructions: [],
        companies: [],
        // Typically we might want to reset profiles to default too, but let's leave them empty or as is for now
    })
}));
