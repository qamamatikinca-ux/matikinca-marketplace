import fs from "node:fs";
const recommendations = JSON.parse(fs.readFileSync("docs/loadlink-140-recommendations.json", "utf8"));
const map = fs.readFileSync("docs/IMPLEMENTATION-MAP.md", "utf8");
if (recommendations.length !== 140) throw new Error(`Expected 140 recommendations, found ${recommendations.length}.`);
const missing = recommendations.filter((item) => !map.includes(`### ${item.id} — ${item.title}`));
if (missing.length) throw new Error(`Implementation map is missing: ${missing.map((item) => item.id).join(", ")}`);
console.log("Recommendation coverage passed: all 140 approved updates are accounted for.");
