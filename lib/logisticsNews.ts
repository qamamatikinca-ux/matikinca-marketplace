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
export function articleImage(html:string,base:string){
  for(const meta of html.match(/<meta\b[^>]*>/gi)||[]){const attrs=Object.fromEntries([...meta.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(m=>[m[1].toLowerCase(),decodeNews(m[3])]));if(["og:image","twitter:image"].includes(attrs.property||attrs.name)){try{const image=new URL(attrs.content,base).href;if(allowedNewsImage(image))return image;}catch{}}}
  const candidates=[...html.matchAll(/<(?:img|media:content|media:thumbnail|enclosure)\b[^>]*(?:src|url)=["']([^"']+)["']/gi)];
  for(const candidate of candidates){try{const image=new URL(decodeNews(candidate[1]),base).href;if(allowedNewsImage(image)&&!/(avatar|logo|emoji|gravatar)/i.test(image))return image;}catch{}}
  return "";
}
export function parseNewsFeed(xml:string,feed:typeof newsFeeds[number],now=Date.now()):NewsItem[]{
  return (xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi)||[]).slice(0,10).flatMap(block=>{
    try{const url=new URL(clean(tag(block,"link")));const title=clean(tag(block,"title"));const date=Date.parse(clean(tag(block,"pubDate")));if(!title||url.protocol!=="https:"||!feed.hosts.includes(url.hostname)||!Number.isFinite(date)||date>now+86400000||date<now-45*86400000)return [];
      return [{title:title.slice(0,240),url:url.href,source:feed.source,publishedAt:new Date(date).toISOString(),image:articleImage(decodeNews(block),url.href),imageCredit:feed.source,summary:""}];
    }catch{return [];}
  });
}
