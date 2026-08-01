import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

test("public listing projection excludes ownership and private contact fields", () => {
  const source = read("lib/marketplace/publicListing.ts");
  for (const forbidden of ["owner_key", "user_id", "contact_number", "whatsapp_number", "id_document_path"]) assert.ok(!source.includes(`"${forbidden}"`), forbidden);
});

test("browser ownership keys are cleanup-only", () => {
  const state = read("lib/accountState.ts");
  assert.match(state, /removeLegacyOwnershipKeys/);
  assert.ok(!state.includes("claim_guest_listings"));
  assert.ok(!state.includes("createPrivateKey"));
});

test("payment webhook requires signature and server service role", () => {
  const webhook = read("app/api/payments/webhook/route.ts");
  assert.match(webhook, /validSignature/);
  assert.match(webhook, /serviceSupabase/);
  assert.ok(!webhook.includes("publicSupabase()"));
});

test("sensitive buckets are private and chat is participant-scoped", () => {
  const migration = read("supabase/migrations/20260801_000001_loadlink_professional_marketplace.sql");
  for (const bucket of ["verification-documents", "dealership-documents", "vehicle-verification", "loadlink-driver-documents"]) assert.match(migration, new RegExp(`'${bucket}'`));
  assert.match(migration, /loadlink_chat_participant_read/);
  assert.match(migration, /loadlink_start_listing_conversation/);
});

test("public network fetches are allowlisted", () => {
  const proxy = read("app/api/news-image/route.ts") + read("lib/server/networkSafety.ts");
  assert.match(proxy, /validateRemoteImageUrl|isAllowedHost|ALLOWED/i);
  assert.match(proxy, /private|loopback|localhost|127\.0\.0\.1/i);
});

test("package limits and listing ownership are derived by the server", () => {
  const migration = read("supabase/migrations/20260801_000001_loadlink_professional_marketplace.sql");
  assert.match(migration, /marketplace_plan_rules/);
  assert.match(migration, /loadlink_enforce_listing_rules/);
  assert.match(migration, /user_subscriptions/);
  assert.match(migration, /listing_access_periods/);
  assert.match(migration, /new\.package_type:=v_plan/);
  assert.match(migration, /new\.user_id:=auth\.uid\(\)/);
  assert.match(migration, /Paid vehicle listing access is required/);
  assert.match(migration, /maximum of % listing images/);
});

test("dealership creation is plan-gated and staff-controlled", () => {
  const migration = read("supabase/migrations/20260801_000001_loadlink_professional_marketplace.sql");
  assert.match(migration, /loadlink_guard_dealership_profile/);
  assert.match(migration, /An active Dealer subscription is required/);
  assert.match(migration, /new\.verification_status:='pending'/);
  assert.match(migration, /new\.is_public:=false/);
  assert.match(migration, /Approval and trust fields can only be changed/);
});

test("production CSP does not permit unsafe eval", () => {
  const config = read("next.config.ts");
  assert.match(config, /process\.env\.NODE_ENV === "development"/);
  assert.match(config, /: "script-src 'self' 'unsafe-inline'";/);
});

test("public driver projection excludes account identity and private contact fields", () => {
  const migration = read("supabase/migrations/20260801_000001_loadlink_professional_marketplace.sql");
  const start = migration.indexOf("create view public.loadlink_public_driver_profiles");
  const end = migration.indexOf("revoke all on public.loadlink_public_driver_profiles", start);
  const view = migration.slice(start, end);
  for (const forbidden of ["user_id", "phone", "email", "review_reason", "missing_document_type"]) assert.ok(!view.includes(forbidden), forbidden);
});
