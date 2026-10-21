import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { serverRateLimit } from "@/lib/serverRateLimit";
import { articleImage, newsFeeds, parseNewsFeed, type NewsItem } from "@/lib/logisticsNews";
import seed from "@/data/logistics-news-seed.json";
export const maxDuration=45;
async function fetchText(url:string){const response=await fetch(url,{cache:"no-store",redirect:"error",headers:{"User-Agent":"LoadLink News/2.0 (+https://matikinca-marketplace.vercel.app)"},signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error("Publisher unavailable");const reader=response.body?.getReader();if(!reader)throw new Error("Empty publisher response");const decoder=new TextDecoder();let size=0,text="";while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>2*1024*1024){await reader.cancel();throw new Error("Publisher response too large");}text+=decoder.decode(part.value,{stream:true});}return text+decoder.decode();}
const getNews=unstable_cache(async()=>{
  const feeds=await Promise.allSettled(newsFeeds.map(async feed=>parseNewsFeed(await fetchText(feed.url),feed)));
  const candidates=feeds.flatMap((result,index)=>(result.status==="fulfilled" && result.value.length ? result.value : seed.filter(item=>item.source===newsFeeds[index].source && Date.parse(item.publishedAt)>Date.now()-3*86400000)).slice(0,4)).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  const unique=[...new Map(candidates.map(item=>[item.url,item])).values()];
  const enriched=await Promise.allSettled(unique.slice(0,12).map(async item=>{if(!item.image)item.image=articleImage(await fetchText(item.url),item.url);return item;}));
  const items:NewsItem[]=enriched.flatMap(result=>result.status==="fulfilled"&&result.value.image?[result.value]:[]).slice(0,8);
  if(!items.length)throw new Error("No publisher headlines available");
  return {items,updatedAt:new Date().toISOString(),partial:feeds.some(result=>result.status==="rejected" || !result.value.length)};
},["loadlink-publisher-news-v3"],{revalidate:86400,tags:["logistics-news"]});
export async function GET(request:Request){
  const limited=serverRateLimit(request,"logistics-news",60,60000);if(limited)return limited;
  try{return NextResponse.json({...await getNews(),refreshHours:24},{headers:{"Cache-Control":"public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"}});}
  catch{const items=seed.filter(item=>Date.parse(item.publishedAt)>Date.now()-3*86400000);return NextResponse.json({items,updatedAt:items[0]?.publishedAt||null,refreshHours:24,stale:true},{headers:{"Cache-Control":"public, max-age=60, s-maxage=300, stale-while-revalidate=3600"}});}
}
