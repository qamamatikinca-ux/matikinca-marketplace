import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

test("the release contains one quality gate and one self-removing installer", () => {
  const files = fs.readdirSync(".github/workflows").filter((name) => /\.ya?ml$/i.test(name)).sort();
  assert.ok(
    JSON.stringify(files) === JSON.stringify(["quality-gate.yml"]) ||
    JSON.stringify(files) === JSON.stringify(["install-loadlink-professional-release.yml", "quality-gate.yml"]),
    `unexpected workflows: ${files.join(", ")}`,
  );
  if (files.includes("install-loadlink-professional-release.yml")) {
    const installer = read(".github/workflows/install-loadlink-professional-release.yml");
    assert.match(installer, /workflow_dispatch/);
    assert.match(installer, /rm -f \.github\/workflows\/install-loadlink-professional-release\.yml/);
    assert.match(installer, /git push/);
  }
});

test("ordered migration and deployment documentation are present", () => {
  for (const file of ["supabase/migrations/20260801_000001_loadlink_professional_marketplace.sql", "docs/DEPLOYMENT-GUIDE.md", "docs/QA-CHECKLIST.md", "docs/IMPLEMENTATION-MAP.md"]) assert.ok(fs.existsSync(file), file);
});
