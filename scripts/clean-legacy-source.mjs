import fs from "node:fs";
import path from "node:path";

const legacyRootEntries = [
  ".loadlink-backup", ":", "AGENTS.md", "CHANGES-COMPLETED.txt", "CHANGES-ONLY.txt", "CHANGES-PHASE-2-FINAL.txt", "CLAUDE.md",
  "CONTROL-BRIDGE-UPDATE.txt", "CRITICAL-REPAIR-NOTES.txt", "FINAL-NIGHT-FIX.txt", "fix-dark-logo-final.js", "fix-dark-logo.js",
  "fix-homepage-header.js", "fix-homepage-logo-auth.js", "fix-homepage-recent-activity.js", "fix-layout-loading.js", "fix-logo-inline-darkmode.js",
  "FIXES-THIS-UPDATE.txt", "GOOGLE-AUTH-UPDATE-NOTES.txt", "HELP-NEWS-LINKBOT-SETUP.txt", "install-actual-final-fix.js",
  "install-cleanup-fix.js", "install-contact-stack-fix.js", "install-final-real-logo-fix.js", "install-loadlink-package-update 2.yml",
  "install-loadlink-package-update.yml", "install-loadlink-phase2-website.yml", "install-loadlink-vercel-hotfix.yml", "install-smooth-owner-fix.js",
  "loadlink-actual-final-fix-installed.txt", "LoadLink-Buy-A-Truck-TypeScript-Hotfix.zip", "loadlink-chat-app-upgrade",
  "LOADLINK-CHAT-APP-UPGRADE-INSTALLED.txt", "LOADLINK-CHAT-APP-UPGRADE.sql", "loadlink-cleanup-fix-installed.txt",
  "loadlink-contact-stack-fix-installed.txt", "LOADLINK-CONTROL-BRIDGE.sql", "loadlink-corporate-control-centre-notifications-dealership 2.zip",
  "loadlink-corporate-control-centre-notifications-dealership 3.zip", "loadlink-dark-logo-final-fix.txt", "loadlink-dark-logo-hotfix.txt",
  "LOADLINK-DEALERSHIP-NOTIFICATION-FIX.sql", "loadlink-embedded-final-logo-fix.txt", "loadlink-experience-upgrade-v2",
  "LOADLINK-EXPERIENCE-UPGRADE-V2.sql", "loadlink-experience-v2-installed.txt", "loadlink-final-real-logo-fix.txt",
  "LOADLINK-GOOGLE-AUTH-ACCOUNT-STORAGE.sql", "loadlink-inline-dark-logo-fix.txt", "loadlink-logo-assets",
  "LOADLINK-MESSAGING-PRO-ANALYTICS.sql", "LOADLINK-MY-POSTS-TRUCK-VERIFICATION.sql", "loadlink-original-logo-restored.txt",
  "LOADLINK-PACKAGES-DEALERSHIPS.sql", "LOADLINK-PHASE-1-FOUNDATION.sql", "LOADLINK-PHASE-1-REMAINING-50.sql",
  "LOADLINK-PHASE-2-FINAL.sql", "LoadLink-Phase1-Remaining-50-iPhone.txt", "LoadLink-Precision-UI-Dealer-Fix 2.zip",
  "LOADLINK-PROFESSIONAL-REPAIR.txt", "loadlink-smooth-owner-fix-installed.txt", "loadlink-update-13-files-only.zip",
  "LoadLink-Vercel-TypeScript-Hotfix 2.zip", "NO-LOGIN-CHAT.sql", "PATCH-MANIFEST.txt", "PHASE-1-IMPLEMENTATION-CHECKLIST.md",
  "PHASE-2-DEPLOYMENT.txt", "PHASE-2-VERIFICATION.txt", "README.txt", "REAL-POSTS-FIX.txt", "restore-original-logo-and-dark-swap.js",
  "run-final-logo-fix.js", "supabase-chat-analytics.sql", "supabase-contact-stack.sql", "SUPABASE-GUEST-CHAT-FINAL.sql",
  "SUPABASE-GUEST-CHAT-LEGACY-REPAIR.sql", "supabase-jobs-setup.sql", "supabase-listings-visibility-fix.sql",
  "supabase-owner-controls.sql", "supabase-view-analytics.sql", "THIS-FIX.txt", "UPDATE-NOTES.txt", "VERIFICATION-SETUP.txt",
];

const legacyNestedEntries = [
  ".github/LoadLink-Precision-Installer-AutoFind.yml",
  "scripts/check-phase2-website.mjs",
  "scripts/install-phase2-website.mjs",
  "supabase/verification-system.sql",
];

const keepWorkflows = new Set(["quality-gate.yml", "install-loadlink-professional-release.yml"]);
const removed = [];

function remove(relativePath) {
  const target = path.resolve(relativePath);
  const root = process.cwd();
  if (!target.startsWith(`${root}${path.sep}`) && target !== root) throw new Error(`Refusing to remove outside repository: ${relativePath}`);
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
  removed.push(relativePath);
}

for (const entry of [...legacyRootEntries, ...legacyNestedEntries]) remove(entry);

const workflowDir = path.resolve(".github/workflows");
if (fs.existsSync(workflowDir)) {
  for (const name of fs.readdirSync(workflowDir)) {
    if (/\.ya?ml$/i.test(name) && !keepWorkflows.has(name)) remove(path.join(".github/workflows", name));
  }
}

console.log(`LoadLink legacy cleanup complete. Removed ${removed.length} existing legacy entries.`);
for (const item of removed) console.log(`- ${item}`);
