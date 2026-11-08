export type NewsItem = {title:string;url:string;source:string;publishedAt:string;image:string;imageCredit:string;summary:string};
export const newsFeeds = [
  {url:"https://www.freightnews.co.za/rss",source:"Freight News",hosts:["www.freightnews.co.za","freightnews.co.za"]},
  {url:"https://satrucker.co.za/feed/",source:"SA Trucker",hosts:["satrucker.co.za","www.satrucker.co.za"]},
];
export const newsImageHosts = new Set(["www.freightnews.co.za","freightnews.co.za","satrucker.co.za","www.satrucker.co.za","i0.wp.com","i1.wp.com","i2.wp.com"]);
export function allowedNewsImage(value:string) {try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&(!u.port||u.port==="443")&&newsImageHosts.has(u.hostname.toLowerCase());}catch{return false;}}
export function decodeNews(value:string) {
  return value.replace(/<!\[CDATA\[|\]\]>/g,"").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&apos;|&#39;/gi,"'").replace(/&amp;/gi,"&").replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_,n)=>{const code=n[0].toLowerCase()==="x"?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):"";});
}
function tag(block:string,name:string){return decodeNews(block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`,"i"))?.[1]||"");}
function clean(value:string){return decodeNews(value).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();}
// A trucking publisher can also publish crime or general-interest stories.
// Apply the same editorial rule to feeds, cached responses and fallback items.
export function isLogisticsNewsItem(item: { title?: unknown; url?: unknown; summary?: unknown }, context = "") {
  if (typeof item.title !== "string" || typeof item.url !== "string") return false;
  let url: URL;
  try { url = new URL(item.url); } catch { return false; }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !newsFeeds.some(feed => feed.hosts.includes(url.hostname))) return false;
  const text = clean(`${item.title} ${typeof item.summary === "string" ? item.summary : ""} ${decodeNews(url.pathname).replace(/[-_/]/g, " ")} ${context}`).toLowerCase();
  const crime = /\b(?:crim(?:e|es|inal|inals|inality)|hijack\w*|rob(?:bery|beries|bed|bers?)|theft|thieves|thief|stolen|stealing|arrest(?:ed|s)?|police|saps|hawks|murder\w*|shooting\w*|shot|gunmen|gunfire|assault\w*|kidnap\w*|abduct\w*|smuggl\w*|syndicat\w*|fraud\w*|brib\w*|corrupt\w*|dagga|cocaine|heroin|methamphetamine|drug(?:s| bust)?|seizure\w*|seized|contraband|suspects?|criminal charges|court appearance|sentenced|fatal\w*|killed|dead|deaths?)\b/;
  if (crime.test(text)) return false;
  return /\b(?:trucks?|trucking|truckers?|lorr(?:y|ies)|haulage|hauliers?|freight|logistics|cargo|supply chains?|warehous(?:e|es|ing)|fleet(?:s| management)?|commercial vehicles?|heavy vehicles?|semi trailers?|truck trailers?|container(?:s| terminal)?|ports? (?:operations?|congestion|delays?|terminals?|(?:and |& )?rail)|vessel rotation)\b/.test(text);
}
export function freshLogisticsNews(items: NewsItem[], now = Date.now(), maxAgeDays = 3) {
  return items.filter(item => isLogisticsNewsItem(item) && Number.isFinite(Date.parse(item.publishedAt)) && Date.parse(item.publishedAt) <= now + 86400000 && Date.parse(item.publishedAt) > now - maxAgeDays * 86400000 && allowedNewsImage(item.image));
}
export function articleImage(html:string,base:string){
  for(const meta of html.match(/<meta\b[^>]*>/gi)||[]){const attrs=Object.fromEntries([...meta.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(m=>[m[1].toLowerCase(),decodeNews(m[3])]));if(["og:image","twitter:image"].includes(attrs.property||attrs.name)){try{const image=new URL(attrs.content,base).href;if(allowedNewsImage(image))return image;}catch{}}}
  const candidates=[...html.matchAll(/<(?:img|media:content|media:thumbnail|enclosure)\b[^>]*(?:src|url)=["']([^"']+)["']/gi)];
  for(const candidate of candidates){try{const image=new URL(decodeNews(candidate[1]),base).href;if(allowedNewsImage(image)&&!/(avatar|logo|emoji|gravatar)/i.test(image))return image;}catch{}}
  return "";
}
export function parseNewsFeed(xml:string,feed:typeof newsFeeds[number],now=Date.now()):NewsItem[]{
  return (xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi)||[]).slice(0,40).flatMap(block=>{
    try{const url=new URL(clean(tag(block,"link")));const title=clean(tag(block,"title"));const date=Date.parse(clean(tag(block,"pubDate")));if(!title||url.protocol!=="https:"||!feed.hosts.includes(url.hostname)||!Number.isFinite(date)||date>now+86400000||date<now-45*86400000)return [];
      const description = clean(tag(block,"description"));
      const context = clean(tag(block,"content:encoded")) + " " + [...block.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)].map(match => clean(match[1])).join(" ");
      const item = {title:title.slice(0,240),url:url.href,source:feed.source,publishedAt:new Date(date).toISOString(),image:articleImage(decodeNews(block),url.href),imageCredit:feed.source,summary:description.slice(0,400)};
      return isLogisticsNewsItem(item, description + " " + context) ? [item] : [];
    }catch{return [];}
  });
}
