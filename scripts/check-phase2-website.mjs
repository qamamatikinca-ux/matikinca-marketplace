import fs from 'node:fs';
const required=['app/api/phase2/public-drivers/route.ts','app/api/phase2/documents/route.ts','app/driver-profile/page.tsx','components/phase2/DriversAvailableForWork.tsx','components/phase2/MarketplaceRestrictionGuard.tsx'];
for(const file of required){if(!fs.existsSync(file))throw new Error(`Missing ${file}`);}
const home=fs.readFileSync('app/page.tsx','utf8');
const layout=fs.readFileSync('app/layout.tsx','utf8');
if(!home.includes('<DriversAvailableForWork'))throw new Error('Homepage driver section missing');
if(!layout.includes('<MarketplaceRestrictionGuard'))throw new Error('Marketplace restriction guard missing');
const profile=fs.readFileSync('app/driver-profile/page.tsx','utf8');
for(const excluded of ['police clearance','medical certificate','proof of address','reference letters','employer letters']){if(!profile.toLowerCase().includes(excluded))throw new Error(`Excluded document notice missing: ${excluded}`);}
for(const forbidden of ['private profile','fire-safety upload','first-aid upload']){if(profile.toLowerCase().includes(forbidden))throw new Error(`Forbidden profile option found: ${forbidden}`);}
console.log('Website Phase 2 static contract passed.');
