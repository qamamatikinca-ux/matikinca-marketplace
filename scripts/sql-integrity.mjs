import fs from "node:fs";

const file = "supabase/migrations/20260801_000001_loadlink_professional_marketplace.sql";
const sql = fs.readFileSync(file, "utf8");
const failures = [];

if (!/^\s*--[\s\S]*?\bbegin\s*;/i.test(sql)) failures.push("migration must start with BEGIN");
if (!/\bcommit\s*;\s*$/i.test(sql)) failures.push("migration must end with COMMIT");

const dollarTags = [...sql.matchAll(/\$[A-Za-z0-9_]*\$/g)].map((match) => match[0]);
const dollarCounts = new Map();
for (const tag of dollarTags) dollarCounts.set(tag, (dollarCounts.get(tag) || 0) + 1);
for (const [tag, count] of dollarCounts) if (count % 2 !== 0) failures.push(`unbalanced dollar quote ${tag}: ${count}`);

const requiredContracts = [
  "loadlink_enforce_listing_rules",
  "loadlink_guard_dealership_profile",
  "loadlink_review_listing",
  "loadlink_review_marketplace_record",
  "loadlink_send_admin_notification",
  "loadlink_apply_verified_payment_event",
  "loadlink_public_listings",
  "loadlink_public_driver_profiles",
];
for (const contract of requiredContracts) if (!sql.includes(contract)) failures.push(`missing contract: ${contract}`);

for (const forbidden of ["notification_type", "owner_key text", "grant all on public.job_listings to anon"]) {
  if (sql.toLowerCase().includes(forbidden.toLowerCase())) failures.push(`forbidden migration pattern: ${forbidden}`);
}

if (failures.length) {
  console.error(`SQL integrity failed for ${file}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`SQL integrity passed: ${file}; ${dollarTags.length} dollar-quote markers balanced.`);
