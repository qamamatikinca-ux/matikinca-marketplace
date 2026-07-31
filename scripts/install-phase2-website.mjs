import fs from "node:fs";

function addImport(source, statement, token){
  if(source.includes(token)) return source;
  const matches=[...source.matchAll(/^import .*;\s*$/gm)];
  if(matches.length){const last=matches.at(-1);const at=last.index+last[0].length;return source.slice(0,at)+"\n"+statement+source.slice(at);}
  return statement+"\n"+source;
}

const pagePath="app/page.tsx";
let page=fs.readFileSync(pagePath,"utf8");
page=addImport(page,'import DriversAvailableForWork from "@/components/phase2/DriversAvailableForWork";','@/components/phase2/DriversAvailableForWork');
if(!page.includes('<DriversAvailableForWork')){
  const at=page.lastIndexOf('</main>');
  if(at<0) throw new Error('Homepage does not contain a closing </main> tag. Phase 2 stopped without modifying it.');
  page=page.slice(0,at)+'\n      <DriversAvailableForWork />\n'+page.slice(at);
}
fs.writeFileSync(pagePath,page);

const layoutPath="app/layout.tsx";
let layout=fs.readFileSync(layoutPath,"utf8");
layout=addImport(layout,'import MarketplaceRestrictionGuard from "@/components/phase2/MarketplaceRestrictionGuard";','@/components/phase2/MarketplaceRestrictionGuard');
if(!layout.includes('<MarketplaceRestrictionGuard')){
  const match=layout.match(/<body\b[^>]*>/);
  if(!match || match.index===undefined) throw new Error('Root layout does not contain a body tag.');
  const at=match.index+match[0].length;
  layout=layout.slice(0,at)+'\n        <MarketplaceRestrictionGuard />'+layout.slice(at);
}
fs.writeFileSync(layoutPath,layout);
console.log('Phase 2 homepage and marketplace guard installed.');
