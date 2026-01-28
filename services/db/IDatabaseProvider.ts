import { LedgerEntry, ImportMetadata, AccountDirectoryItem, Allocation, SiteOverrideLog, JournalInstruction, Company, ReconProfile } from '../../types';

export interface SyncData {
    entries: LedgerEntry[];
    imports: ImportMetadata[];
    directory: AccountDirectoryItem[];
    allocations: Allocation[];
    overrideLogs: SiteOverrideLog[];
    journalInstructions: JournalInstruction[];
    companies: Company[];
    reconProfiles: ReconProfile[];
}

export interface IDatabaseProvider {
    /**
     * Pushes all local state to the database.
     * @param data The complete dataset to sync.
     * @returns boolean indicating success.
     */
    pushData(data: SyncData): Promise<boolean>;

    /**
     * Pulls all data from the database.
     * @returns The complete dataset.
     */
    pullData(): Promise<SyncData>;

    /**
     * Checks if the provider is correctly configured (e.g. has API keys).
     */
    isConfigured(): boolean;
}
