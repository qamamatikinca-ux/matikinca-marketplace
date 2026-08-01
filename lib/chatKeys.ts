/**
 * Legacy storage identifiers retained only so existing browsers can be cleaned
 * up safely. LoadLink no longer uses browser-generated keys for listing
 * ownership or conversation access; Supabase authentication is authoritative.
 */
export const ACTIVE_ACCOUNT_STORAGE_KEY = "loadlink-active-account-id";
export const LEGACY_STATE_OWNER_STORAGE_KEY = "loadlink-state-owner-id";
