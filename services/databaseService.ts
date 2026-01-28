import { SupabaseProvider } from './db/SupabaseProvider';
import { SyncData } from './db/IDatabaseProvider';

// Get Supabase credentials from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Singleton instance - use Supabase (PostgreSQL)
const provider = new SupabaseProvider(SUPABASE_URL, SUPABASE_KEY);

export const supabase = null; // Direct client not exposed

export const isSupabaseConfigured = () => {
  return provider.isConfigured();
};

// Push data to Supabase PostgreSQL database
export async function pushData(data: SyncData) {
  return provider.pushData(data);
}

// Pull data from Supabase PostgreSQL database
export async function pullData() {
  return provider.pullData();
}

// Aliases for backward compatibility
export const pushToSupabase = pushData;
export const pullFromSupabase = pullData;

export const SQL_SCHEMA = `
-- COMPLETE RECON TOOL SCHEMA --
-- Run this in your Supabase SQL Editor to initialize the database structure.

CREATE TABLE IF NOT EXISTS companies (
  code TEXT PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  company_code TEXT,
  gl_account TEXT,
  gl_account_name TEXT,
  import_label TEXT,
  imported_by TEXT,
  imported_at TIMESTAMPTZ,
  file_name TEXT
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  row_id TEXT PRIMARY KEY,
  import_id TEXT,
  company_code TEXT,
  gl_account TEXT,
  posting_date TEXT,
  trans_no TEXT,
  origin TEXT,
  origin_no TEXT,
  ref1 TEXT,
  ref2 TEXT,
  offset_account TEXT,
  details TEXT,
  cd_lc TEXT,
  cumulative_balance_lc NUMERIC,
  debit_lc NUMERIC,
  credit_lc NUMERIC,
  bp_account_code TEXT,
  created_by TEXT,
  type TEXT,
  region TEXT,
  client TEXT,
  site TEXT,
  signed_amount NUMERIC,
  net_movement_lc NUMERIC,
  direction TEXT,
  origin_category TEXT,
  transaction_month TEXT,
  offset_account_norm TEXT,
  counterparty_type TEXT,
  tenant_sub_type TEXT,
  business_meaning TEXT,
  journal_reason_text TEXT,
  offset_account_key TEXT,
  offset_account_code4 TEXT,
  offset_account_name TEXT,
  offset_account_category TEXT,
  unknown_offset_account_flag BOOLEAN,
  site_override TEXT,
  suggested_site TEXT,
  site_final TEXT,
  site_source TEXT,
  unknown_site_flag BOOLEAN,
  ref_conflict_flag BOOLEAN,
  offset_conflict_flag BOOLEAN,
  multi_match_flag BOOLEAN,
  site_review_status TEXT,
  why_flagged TEXT[],
  posting_date_raw TEXT,
  posting_date_format_detected TEXT,
  year_part INTEGER,
  month_part INTEGER,
  day_part INTEGER,
  posting_date_parse_status TEXT,
  posting_date_parse_failed_flag BOOLEAN,
  date_failure_reason TEXT
);

CREATE TABLE IF NOT EXISTS account_directory (
  code TEXT PRIMARY KEY,
  name TEXT,
  category TEXT
);

CREATE TABLE IF NOT EXISTS allocations (
  id TEXT PRIMARY KEY,
  company_code TEXT,
  gl_account TEXT,
  site_final TEXT,
  credit_row_id TEXT,
  debit_row_id TEXT,
  allocated_amount NUMERIC,
  allocation_date TIMESTAMPTZ,
  allocated_by TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS site_override_logs (
  id TEXT PRIMARY KEY,
  row_id TEXT,
  company_code TEXT,
  gl_account TEXT,
  trans_no TEXT,
  posting_date TEXT,
  old_site TEXT,
  new_site TEXT,
  amount NUMERIC,
  direction TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS journal_instructions (
  id TEXT PRIMARY KEY,
  row_id TEXT,
  company_code TEXT,
  gl_account TEXT,
  site_final TEXT,
  original_amount NUMERIC,
  adjustment_amount NUMERIC,
  instruction TEXT,
  reference TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS recon_profiles (
  gl_account TEXT PRIMARY KEY,
  recon_name TEXT,
  uses_allocations BOOLEAN,
  default_matching_mode TEXT
);
`;
