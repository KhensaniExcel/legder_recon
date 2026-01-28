
import { LedgerEntry, AccountDirectoryItem, ImportMetadata } from '../types';

/**
 * Normalizes text: Upper, trim, collapse spaces.
 */
export const normalize = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.toString().toUpperCase().trim().replace(/\s+/g, ' ');
};

const normalizeKey = (key: string): string => {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const HEADER_SYNONYMS: Record<string, string[]> = {
  'offsetaccount': ['offsetacc', 'offsetaccountcode', 'offsetaccno', 'offset'],
  'postingdate': ['date', 'docdate', 'posting', 'postingdate', 'postdate'],
  'transno': ['transnumber', 'docno', 'docnumber', 'trans', 'transno', 'transactionno'],
  'debitlc': ['debit', 'debitamount', 'dr', 'debitlc', 'debitamt'],
  'creditlc': ['credit', 'creditamount', 'cr', 'creditlc', 'creditamt'],
  'cumulativebalancelc': ['balance', 'cumbalance', 'cumulativebala', 'cumbals', 'cumulativebalancelc'],
  'site': ['site', 'sitecode', 'siteno', 'property', 'location', 'siteid', 'site#'],
  'bpaccountcode': ['bp/account code', 'bpcode', 'accountcode', 'bpacc']
};

export const getFuzzy = (obj: any, target: string): any => {
  if (!obj) return undefined;
  const normTarget = normalizeKey(target);
  let foundKey = Object.keys(obj).find(k => normalizeKey(k) === normTarget);
  if (!foundKey && HEADER_SYNONYMS[normTarget]) {
    foundKey = Object.keys(obj).find(k => {
      const nk = normalizeKey(k);
      return HEADER_SYNONYMS[normTarget].includes(nk);
    });
  }
  return foundKey ? obj[foundKey] : undefined;
};

export const parseAccountingNum = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  if (!str) return 0;
  const isNegative = (str.startsWith('(') && str.endsWith(')')) || str.startsWith('-');
  let clean = str.replace(/[^\d.,]/g, '');
  if (clean.includes(',') && (!clean.includes('.') || clean.indexOf(',') > clean.indexOf('.'))) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else {
    clean = clean.replace(/,/g, '');
  }
  let num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
};

export interface StrictDateResult {
  parsed: string | null;
  raw: string;
  formatDetected: 'YYYY/MM/DD' | 'YYYY/DD/MM' | 'DD/MM/YYYY' | 'Invalid';
  year: number;
  month: number;
  day: number;
  status: 'OK-YYYYfirst' | 'OK-DDfirst' | 'FAILED';
  failedFlag: boolean;
  reason?: string;
}

/**
 * Robust date parser following user's specific rules:
 * 1. If starts with 2024 or 2025 (the full 4 digits) -> YYYY/DD/MM
 * 2. Otherwise -> DD/MM/YYYY
 */
export const parseStrictDate = (raw: any): StrictDateResult => {
  const result: StrictDateResult = {
    parsed: null,
    raw: String(raw ?? ""),
    formatDetected: 'Invalid',
    year: 0, month: 0, day: 0,
    status: 'FAILED',
    failedFlag: true
  };

  const rawTrimmed = result.raw.trim();
  if (!rawTrimmed) {
    result.reason = "Empty value";
    return result;
  }

  // Pre-process string
  const dateStr = rawTrimmed.replace(/^'/, "").split(" ")[0];
  const s = dateStr.replace(/[\.\-]/g, "/");
  const parts = s.split("/");

  if (parts.length !== 3) {
    // Check if it's an Excel serial number passed as a string
    const numericVal = Number(rawTrimmed);
    if (!isNaN(numericVal) && numericVal > 40000 && numericVal < 60000) {
      const dt = new Date(Math.round((numericVal - 25569) * 86400 * 1000));
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate();
        result.year = y; result.month = m; result.day = d;
        result.status = 'OK-YYYYfirst'; result.formatDetected = 'YYYY/MM/DD';
        result.failedFlag = false;
        result.parsed = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        return result;
      }
    }
    result.reason = `Expected 3 segments, found ${parts.length}. String: "${s}"`;
    return result;
  }

  let y: number, m: number, d: number;
  const p1 = parts[0], p2 = parts[1], p3 = parts[2];

  // User rule: If starts with full 4-digit 2024 or 2025 -> YYYY/DD/MM
  if (p1 === "2024" || p1 === "2025") {
    y = parseInt(p1);
    d = parseInt(p2);
    m = parseInt(p3);
    result.status = 'OK-YYYYfirst';
    result.formatDetected = 'YYYY/DD/MM';
  } 
  // User rule: If it DOES NOT start with full 4-digit 2024/2025 -> DD/MM/YYYY
  else {
    d = parseInt(p1);
    m = parseInt(p2);
    // Handle 2-digit years in the end segment just in case
    y = p3.length === 2 ? 2000 + parseInt(p3) : parseInt(p3);
    result.status = 'OK-DDfirst';
    result.formatDetected = 'DD/MM/YYYY';
  }

  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    result.reason = `Non-numeric segments: [${p1}, ${p2}, ${p3}]`;
    return result;
  }

  // Monthly range validation
  if (m < 1 || m > 12) {
    result.reason = `Month out of bounds: ${m}. (Input segments: [${p1}, ${p2}, ${p3}])`;
    return result;
  }
  if (d < 1 || d > 31) {
    result.reason = `Day out of bounds: ${d}. (Input segments: [${p1}, ${p2}, ${p3}])`;
    return result;
  }

  // Calendar logic validation (e.g. Feb 30th)
  const dtFinal = new Date(y, m - 1, d);
  if (dtFinal.getFullYear() !== y || dtFinal.getMonth() !== (m - 1) || dtFinal.getDate() !== d) {
    result.reason = `Invalid calendar date: ${d}/${m}/${y}.`;
    return result;
  }

  result.year = y; result.month = m; result.day = d;
  result.failedFlag = false;
  result.parsed = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
  
  return result;
};

export const extractAccountCode = (text: string): string => {
  const match = text.match(/\d+/);
  return match ? match[0] : '';
};

export const extractSites = (text: string): string[] => {
  const matches = text.match(/\bP\d{3}\b/g);
  return matches ? Array.from(new Set(matches.map(m => m.toUpperCase()))) : [];
};

export const processLedgerRow = (
  raw: any,
  importMeta: ImportMetadata,
  accountDirectory: AccountDirectoryItem[],
  offsetMap: Record<string, { site: string; confidence: number }>
): LedgerEntry => {
  const rawOrigin = normalize(getFuzzy(raw, 'Origin'));
  const rawDebit = getFuzzy(raw, 'Debit (LC)');
  const rawCredit = getFuzzy(raw, 'Credit (LC)');
  const rawPostingDate = getFuzzy(raw, 'Posting Date');
  const rawTransNo = getFuzzy(raw, 'Trans. No.');
  const rawOffset = getFuzzy(raw, 'Offset Account');
  const rawSite = normalize(getFuzzy(raw, 'Site'));

  const debitLC = Math.abs(parseAccountingNum(rawDebit));
  const creditLC = Math.abs(parseAccountingNum(rawCredit));
  const signedAmount = creditLC - debitLC;
  const netMovementLC = debitLC - creditLC;
  const direction = creditLC > 0 ? 'Credit' : (debitLC > 0 ? 'Debit' : 'Zero/Other');

  const offsetAccountNorm = normalize(rawOffset);
  const startsWithCIP = offsetAccountNorm.startsWith("CIP");
  const startsWithDBT = offsetAccountNorm.startsWith("DBT");
  const voucherTenantFlag = offsetAccountNorm.endsWith("V") && !startsWithCIP && !startsWithDBT;
  const creditCasualTenantFlag = offsetAccountNorm.endsWith("C") && !startsWithCIP && !startsWithDBT;

  let counterpartyType: 'Landlord' | 'Intercompany Tenant' | 'Tenant' = 'Tenant';
  if (startsWithCIP || rawOrigin === 'PU') counterpartyType = 'Landlord';
  else if (startsWithDBT) counterpartyType = 'Intercompany Tenant';

  let tenantSubType: 'Intercompany' | 'Voucher' | 'Credit Casual' | 'Normal' | '' = '';
  if (counterpartyType !== 'Landlord') {
    if (counterpartyType === 'Intercompany Tenant') tenantSubType = 'Intercompany';
    else if (voucherTenantFlag) tenantSubType = 'Voucher';
    else if (creditCasualTenantFlag) tenantSubType = 'Credit Casual';
    else tenantSubType = 'Normal';
  }

  const businessMeaning = (function() {
    if (rawOrigin === 'CN' || rawOrigin === 'IN') {
      return counterpartyType === 'Landlord' ? 'Landlord Invoice/Credit Note (CIP)' : 'Tenant Invoice/Credit Note';
    }
    if (rawOrigin === 'PU') return 'Landlord Credit Note (PU)';
    if (rawOrigin === 'RC') return 'Receipts / Revenue Banked';
    if (rawOrigin === 'JE') return 'Journal / Manual Adjustment';
    if (rawOrigin === 'PS') return 'Payments / Reversal';
    if (rawOrigin === 'OB') return 'Opening Balance';
    return 'Other';
  })();

  const dateResult = parseStrictDate(rawPostingDate);
  const transactionMonth = dateResult.parsed ? dateResult.parsed.substring(0, 7) : 'Unknown';

  const ref1 = String(getFuzzy(raw, 'Ref. 1') || '');
  const ref2 = String(getFuzzy(raw, 'Ref. 2') || '');
  const details = String(getFuzzy(raw, 'Details') || '');

  const ref1Sites = extractSites(normalize(ref1));
  const ref2Sites = extractSites(normalize(ref2));
  const detailSites = extractSites(normalize(details));
  const suggestedSite = ref1Sites[0] || ref2Sites[0] || detailSites[0] || '';
  
  const siteFinal = rawSite || suggestedSite || 'Unknown';
  const siteSource = rawSite ? 'Site Column' : (suggestedSite ? 'Derived' : 'Unknown');

  const unknownSiteFlag = siteFinal === 'Unknown';
  const multiMatchFlag = ref1Sites.length > 1 || ref2Sites.length > 1 || detailSites.length > 1;
  const refConflictFlag = !!rawSite && !!suggestedSite && rawSite !== suggestedSite;

  const whyFlagged: string[] = [];
  if (rawOrigin !== 'OB') {
    if (unknownSiteFlag) whyFlagged.push("Missing Site");
    if (multiMatchFlag) whyFlagged.push("Multiple Sites in Text");
    if (refConflictFlag) whyFlagged.push("Site Conflict (File vs Ref)");
    if (dateResult.failedFlag) whyFlagged.push("Date Parse Failed");
  }

  const offsetCode = extractAccountCode(offsetAccountNorm);
  const directoryEntry = accountDirectory.find(a => a.code === offsetCode);
  const offsetAccountCode4 = offsetCode || offsetAccountNorm; 
  const offsetAccountName = directoryEntry?.name || '';
  
  return {
    rowId: Math.random().toString(36).substring(7),
    importId: importMeta.id,
    companyCode: importMeta.companyCode,
    glAccount: importMeta.glAccount,
    postingDate: dateResult.parsed || '',
    postingDateRaw: dateResult.raw,
    postingDateFormatDetected: dateResult.formatDetected,
    yearPart: dateResult.year, monthPart: dateResult.month, dayPart: dateResult.day,
    postingDateParseStatus: dateResult.status,
    postingDateParseFailedFlag: dateResult.failedFlag,
    dateFailureReason: dateResult.reason,
    transNo: String(rawTransNo || ''),
    origin: rawOrigin,
    originNo: String(getFuzzy(raw, 'Origin No.') || ''),
    ref1, ref2,
    offsetAccount: rawOffset,
    details,
    cdLC: String(getFuzzy(raw, 'C/D (LC)') || ''),
    cumulativeBalanceLC: parseAccountingNum(getFuzzy(raw, 'Cumulative Balance (LC)')),
    debitLC, creditLC, signedAmount, netMovementLC, direction, 
    originCategory: businessMeaning,
    transactionMonth,
    offsetAccountNorm, counterpartyType, tenantSubType, businessMeaning, journalReasonText: `${ref1} | ${ref2} | ${details}`,
    offsetAccountKey: offsetAccountNorm,
    offsetAccountCode4, offsetAccountName, offsetAccountCategory: directoryEntry?.category || 'Other',
    unknownOffsetAccountFlag: false,
    siteOverride: '', suggestedSite, siteFinal, siteSource,
    unknownSiteFlag, refConflictFlag, offsetConflictFlag: false, multiMatchFlag,
    siteReviewStatus: whyFlagged.length > 0 ? 'Open' : 'Resolved',
    whyFlagged,
    bpAccountCode: String(getFuzzy(raw, 'BP/Account Code') || ''),
    createdBy: String(getFuzzy(raw, 'Created By') || ''),
    type: String(getFuzzy(raw, 'Type') || ''),
    region: String(getFuzzy(raw, 'Region') || ''),
    client: String(getFuzzy(raw, 'Client') || ''),
    site: rawSite
  };
};

export const buildOffsetMapping = (entries: LedgerEntry[]): Record<string, { site: string; confidence: number }> => ({});
