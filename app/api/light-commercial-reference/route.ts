import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getLightCommercialModelYearStatus } from "@/lib/southAfricanLightCommercialCatalog";

export const runtime = "nodejs";
export const revalidate = 86400;

type ReferencePhoto = { url: string; fallbackUrl?: string; title: string; credit: string; license: string };
type WikimediaEntry = { title?: string; imageinfo?: Array<{
  thumburl?: string; url?: string; mime?: string; width?: number; height?: number;
  extmetadata?: Record<string,{value?:string}>;
}> };
const HEADERS = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };
const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g," ").trim();
const cleanCredit = (value: string) => value.replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').slice(0,120);
const aliases: Record<string,string[]> = {
  "volkswagen":["volkswagen","vw"],"mercedes benz":["mercedes benz","mercedes"],
  "gwm":["gwm","great wall"],"isuzu":["isuzu"],"ldv":["ldv","maxus"]
};
function directCommonsImage(file:string) {
  const name=file.trim().replace(/ /g,"_");
  const hash=createHash("md5").update(name,"utf8").digest("hex");
  const encoded=encodeURIComponent(name);
  return {
    url:"https://upload.wikimedia.org/wikipedia/commons/thumb/"+hash[0]+"/"+hash.slice(0,2)+"/"+encoded+"/960px-"+encoded,
    fallbackUrl:"https://commons.wikimedia.org/wiki/Special:Redirect/file/"+encoded+"?width=960",
  };
}
const curated: Array<{make:string;model:string;first:number;last?:number;files:Array<{file:string;credit:string;license:string}>}> = [
  {make:"Nissan",model:"Navara",first:2009,files:[
    {file:"Nissan Navara 4x2 VL 2019.jpg",credit:"Wikimedia Commons contributors",license:"Creative Commons"},
    {file:"Nissan Navara 4x4 VL 2019.jpg",credit:"Wikimedia Commons contributors",license:"Creative Commons"},
    {file:"Nissan Navara (29696483778).jpg",credit:"Wikimedia Commons contributors",license:"Creative Commons"}
  ]},
  {make:"Nissan",model:"NP200",first:2009,last:2024,files:[
    {file:"Nissan NP200 1.6i (2022) (52716005654).jpg",credit:"Charles from Port Chester",license:"CC BY 2.0"}
  ]},
  {make:"Toyota",model:"Hilux",first:2009,files:[
    {file:"Toyota Hilux 172018.jpg",credit:"Wikimedia Commons contributors",license:"Creative Commons"}
  ]},
  {make:"Ford",model:"Ranger",first:2009,last:2012,files:[
    {file:"Ford Ranger 10-01-2019.jpg",credit:"SsmIntrigue",license:"Creative Commons"}
  ]},
  {make:"Isuzu",model:"D-Max",first:2009,last:2015,files:[
    {file:"Isuzu D Max Pick Up (3678649296).jpg",credit:"nakhon100",license:"CC BY 2.0"}
  ]}
];
function photosFromCurated(make:string,model:string,year:number):ReferencePhoto[] {
  const match=curated.find(item=>normalize(item.make)===normalize(make) &&
    (normalize(item.model)===normalize(model)||normalize(model).startsWith(normalize(item.model)+" ")) &&
    year>=item.first&&(!item.last||year<=item.last));
  return (match?.files||[]).map(({file,credit,license})=>({
    ...directCommonsImage(file),title:(match?.make||make)+" "+(match?.model||model),credit,license
  }));
}
function matchesFilename(filename:string,make:string,model:string) {
  const name=normalize(filename.replace(/^File:/i,""));
  if(!(aliases[normalize(make)]||[normalize(make)]).some(alias=>name.includes(alias)))return false;
  const tokens=normalize(model).split(" ").filter(word=>word.length>1&&!["series","model","cargo","van","pickup"].includes(word));
  return tokens.length>0&&tokens.every(token=>name.split(" ").includes(token));
}
function trustedUpload(url:string) {
  try {const p=new URL(url);return p.protocol==="https:"&&p.hostname==="upload.wikimedia.org"&&p.port===""&&!p.username&&!p.password;}
  catch{return false;}
}
async function searchCommons(make:string,model:string):Promise<ReferencePhoto[]> {
  const endpoint=new URL("https://commons.wikimedia.org/w/api.php");
  const params=endpoint.searchParams;
  params.set("action","query");params.set("format","json");
  params.set("generator","search");params.set("gsrnamespace","6");
  params.set("gsrlimit","50");
  params.set("gsrsearch",make+" "+model+" filetype:bitmap");
  params.set("prop","imageinfo");params.set("iiprop","url|mime|size|extmetadata");
  params.set("iiurlwidth","960");params.set("iiextmetadatafilter","LicenseShortName|Artist|Credit");
  const response=await fetch(endpoint,{
    headers:{Accept:"application/json","User-Agent":"LoadLink/1.0 (https://matikinca-marketplace.vercel.app; vehicle model references)"},
    signal:AbortSignal.timeout(9000),next:{revalidate:86400}
  });
  if(!response.ok)throw Error("Reference provider unavailable");
  const data=await response.json() as {query?:{pages?:Record<string,WikimediaEntry>}};
  return Object.values(data.query?.pages||{}).flatMap(row=>{
    const info=row.imageinfo?.[0];
    if(!info||!row.title||!matchesFilename(row.title,make,model)||
      !/^image\/(?:jpeg|png|webp)$/.test(info.mime||"")||(info.width||0)<460||(info.height||0)<260)return [];
    const url=info.thumburl||info.url||"";
    if(!trustedUpload(url))return [];
    const license=cleanCredit(info.extmetadata?.LicenseShortName?.value||"");
    if(!/^(?:CC BY|CC0|Public domain|PD-)/i.test(license))return [];
    return [{url,title:row.title.replace(/^File:/i,"").replace(/\.[^.]+$/,"").replace(/_/g," "),
      credit:cleanCredit(info.extmetadata?.Artist?.value||info.extmetadata?.Credit?.value||"Wikimedia Commons contributor"),
      license}];
  }).slice(0,3);
}
export async function GET(request:NextRequest) {
  const make=(request.nextUrl.searchParams.get("make")||"").trim();
  const model=(request.nextUrl.searchParams.get("model")||"").trim();
  const year=Number(request.nextUrl.searchParams.get("year")||0);
  if(!make||!model||make.length>64||model.length>64||
    !/^[a-zA-Z0-9À-ÿ .'-]+$/.test(make+model)||
    !Number.isInteger(year)||year<2009||year>new Date().getFullYear())
    return NextResponse.json({photos:[],error:"Invalid vehicle details"},{status:400,headers:{"Cache-Control":"no-store"}});
  const availability=getLightCommercialModelYearStatus(make,model,year);
  if(availability&&!availability.valid)
    return NextResponse.json({photos:[],availability,reason:"year_not_listed"},{headers:HEADERS});
  const curatedPhotos=photosFromCurated(make,model,year);
  if(curatedPhotos.length)return NextResponse.json({photos:curatedPhotos,availability,kind:"model_family_reference"},{headers:HEADERS});
  try {
    const photos=await searchCommons(make,model);
    return NextResponse.json({photos,availability,kind:"model_family_reference"},{headers:HEADERS});
  } catch {
    return NextResponse.json({photos:[],availability,temporarilyUnavailable:true},{headers:{"Cache-Control":"no-store"}});
  }
}
