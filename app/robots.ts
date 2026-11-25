import type {MetadataRoute} from "next";
const origin="https://matikinca-marketplace.vercel.app";
export default function robots():MetadataRoute.Robots{
 return {rules:[{userAgent:"*",allow:"/",disallow:[
  "/admin/","/api/","/messages","/account/","/notifications","/my-posts","/dealer/dashboard","/payments/",
  "/login","/signup","/forgot-password","/reset-password","/verification-status","/verify","/list-your-vehicle?view=post"
 ]}],sitemap:origin+"/sitemap.xml",host:origin};
}
