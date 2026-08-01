import fs from "node:fs";
import path from "node:path";
const limits = { totalPublicBytes: 28 * 1024 * 1024, singleImageBytes: 4 * 1024 * 1024 };
let total = 0; const oversized = [];
function walk(directory) { if (!fs.existsSync(directory)) return; for (const entry of fs.readdirSync(directory,{withFileTypes:true})) { const file=path.join(directory,entry.name); if(entry.isDirectory()) walk(file); else { const size=fs.statSync(file).size; total+=size; if(/\.(png|jpe?g|webp|gif)$/i.test(entry.name)&&size>limits.singleImageBytes) oversized.push(`${file} (${Math.ceil(size/1024)} KB)`); } } }
walk("public");
if (total > limits.totalPublicBytes) throw new Error(`Public assets exceed budget: ${(total/1048576).toFixed(2)} MB.`);
if (oversized.length) throw new Error(`Oversized images:\n${oversized.join("\n")}`);
console.log(`Performance budget passed: public assets ${(total/1048576).toFixed(2)} MB; no image exceeds 4 MB.`);
