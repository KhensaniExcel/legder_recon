
export interface Company {
  code: string;
  name: string;
}

export interface AccountDirectoryItem {
  code: string;
  name: string;
  category?: string;
  notes?: string;
}

export interface ReconProfile {
  companyCode?: string;
  glAccount: string;
  reconName: string;
  usesAllocations: boolean;
  defaultMatchingMode: 'Manual' | 'FIFO' | 'None';
}

export interface ImportMetadata {
  id: string;
  companyCode: string;
  glAccount: string;
  glAccountName?: string;
  importLabel: string;
  importedBy: string;
  importedAt: string;
  fileName: string;
}

export interface LedgerEntry {
  rowId: string;
  importId: string;
  companyCode: string;
  glAccount: string;
  
  // Original Columns
  postingDate: string; // ISO YYYY-MM-DD
  transNo: string;
  origin: string;
  originNo: string;
  ref1: string;
  ref2: string;
  offsetAccount: string;
  details: string;
  cdLC: string;
  cumulativeBalanceLC: number;
  debitLC: number;
  creditLC: number;
  bpAccountCode: string;
  createdBy: string;
  type: string;
  region: string;
  client: string;
  site: string;

  // STRICT DATE DEBUG FIELDS
  postingDateRaw: string;
  postingDateFormatDetected: 'YYYY/MM/DD' | 'YYYY/DD/MM' | 'DD/MM/YYYY' | 'Invalid';
  yearPart: number;
  monthPart: number;
  dayPart: number;
  postingDateParseStatus: 'OK-YYYYfirst' | 'OK-DDfirst' | 'FAILED';
  postingDateParseFailedFlag: boolean;
  dateFailureReason?: string;

  // Step 2 & 3: Measures
  signedAmount: number; // Credit - Debit
  netMovementLC: number; // Debit - Credit (Positive = Net Debit)
  direction: 'Credit' | 'Debit' | 'Zero/Other';
  originCategory: string;
  transactionMonth: string;
  
  // Step 1: Classification Rules
  offsetAccountNorm: string;
  counterpartyType: 'Landlord' | 'Intercompany Tenant' | 'Tenant';
  tenantSubType: 'Intercompany' | 'Voucher' | 'Credit Casual' | 'Normal' | '';
  businessMeaning: string;
  journalReasonText: string;

  offsetAccountKey: string;
  offsetAccountCode4: string;
  offsetAccountName?: string;
  offsetAccountCategory?: string;
  unknownOffsetAccountFlag: boolean;

  siteOverride: string;
  suggestedSite: string;
  siteFinal: string;
  siteSource: string;

  // Site Review Flags
  unknownSiteFlag: boolean;
  refConflictFlag: boolean;
  offsetConflictFlag: boolean;
  multiMatchFlag: boolean;
  
  siteReviewStatus: 'Open' | 'Resolved' | 'Ignore';
  whyFlagged: string[];
}

export interface Allocation {
  id: string;
  companyCode: string;
  glAccount: string;
  siteFinal: string;
  creditRowId: string;
  debitRowId: string;
  allocatedAmount: number;
  allocationDate: string;
  allocatedBy: string;
  note?: string;
}

export interface SiteOverrideLog {
  id: string;
  rowId: string;
  companyCode: string;
  glAccount: string;
  transNo: string;
  postingDate: string;
  oldSite: string;
  newSite: string;
  amount: number;
  direction: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface JournalInstruction {
  id: string;
  rowId: string; // The ledger entry it corrects
  companyCode: string;
  glAccount: string;
  siteFinal: string;
  originalAmount: number;
  adjustmentAmount: number; // e.g. -originalAmount to reverse it
  instruction: string;
  reference: string;
  status: 'Draft' | 'Sent' | 'Processed';
  createdAt: string;
}
