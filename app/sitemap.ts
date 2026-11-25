import type {MetadataRoute} from "next";
const origin="https://matikinca-marketplace.vercel.app";
export default function sitemap():MetadataRoute.Sitemap{
 const pages:[string,"daily"|"weekly"|"monthly",number][]=[
  ["/","daily",1],["/jobs","daily",.9],["/contracts","daily",.9],
  ["/list-your-vehicle","daily",.9],["/drivers","daily",.8],["/driver-portal","weekly",.6],
  ["/tools/vehicle-price-guide","weekly",.7],["/tools","weekly",.6],["/help","monthly",.5],
  ["/packages","weekly",.5]
 ];
 return pages.map(([path,changeFrequency,priority])=>({url:origin+path,changeFrequency,priority}));
}
