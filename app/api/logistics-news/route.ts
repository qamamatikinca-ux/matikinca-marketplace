import { NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NewsItem = { title:string; url:string; source:string; publishedAt:string; image:string; imageCredit:string; summary:string };

const covers = { road:"/images/news/road-freight.jpg", forklift:"/images/news/forklift-loading.jpg", contract:"/images/news/contracts-logistics.jpg", truck:"/images/news/truck-operations.jpg" };

function decodeEntities(value:string){let result=value||"";for(let i=0;i<3;i+=1){result=result.replace(/<!\[CDATA\[|\]\]>/g,"").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&#x2F;/gi,"/").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));}return result.replace(/<[^>]*>/g," ").replace(/https?:\/\/\S+/g," ").replace(/\s+/g," ").trim();}
function rawTag(block:string,name:string){return block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`,"i"))?.[1]||"";}
function tag(block:string,name:string){return decodeEntities(rawTag(block,name));}
function coverFor(title:string,index:number){const value=title.toLowerCase();if(/warehouse|forklift|distribution|delivery centre|depot/.test(value))return covers.forklift;if(/contract|tender|construction|project/.test(value))return covers.contract;if(/truck|road|driver|fleet|freight/.test(value))return covers.truck;return [covers.road,covers.truck,covers.forklift,covers.contract][index%4];}

export async function GET(request:Request){
  const limited=serverRateLimit(request,"logistics-news",60,60_000);if(limited)return limited;
  try{
    const rss="https://news.google.com/rss/search?q=South+Africa+logistics+freight+trucking+ports+rail+when:7d&hl=en-ZA&gl=ZA&ceid=ZA:en";
    const response=await fetch(rss,{cache:"no-store",headers:{"User-Agent":"LoadLink News/1.0"},signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error("News feed unavailable");
    const xml=await response.text();
    const blocks=xml.match(/<item>[\s\S]*?<\/item>/gi)?.slice(0,12)||[];
    const items:NewsItem[]=blocks.map((block,index)=>{const fullTitle=tag(block,"title");const source=tag(block,"source")||fullTitle.split(" - ").pop()||"News source";const title=fullTitle.replace(/\s+-\s+[^-]+$/,"").trim();const url=tag(block,"link");const publishedAt=tag(block,"pubDate")||"";return{title,url,source,publishedAt,image:coverFor(title,index),imageCredit:"Related LoadLink logistics cover",summary:`Reporting from ${source} on a current South African transport or logistics development.`};}).filter((item)=>item.title&&item.url&&item.publishedAt).slice(0,8);
    return NextResponse.json({items,updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, max-age=60, s-maxage=300, stale-while-revalidate=900"}});
  }catch{
    return NextResponse.json({items:[],updatedAt:new Date().toISOString(),unavailable:true},{status:200,headers:{"Cache-Control":"public, max-age=30, s-maxage=60, stale-while-revalidate=120"}});
  }
}
