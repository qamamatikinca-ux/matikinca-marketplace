"use client";

import { useMemo } from "react";
import { createErrorReference } from "@/lib/core";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reference = useMemo(() => createErrorReference("LL-WEB"), []);
  return (
    <html lang="en">
      <body>
        <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#050505",color:"white",fontFamily:"Arial,sans-serif"}}>
          <section style={{width:"100%",maxWidth:600,textAlign:"center",border:"1px solid rgba(246,184,0,.38)",padding:"40px 24px",background:"#0d0d0d"}}>
            <p style={{color:"#f6b800",letterSpacing:2,fontSize:11,fontWeight:800}}>LOADLINK RECOVERY</p>
            <h1 style={{margin:"12px 0 0",fontSize:"clamp(32px,6vw,52px)",lineHeight:1,letterSpacing:"-.04em"}}>Something interrupted LoadLink.</h1>
            <p style={{margin:"18px auto 0",maxWidth:500,color:"#aaa",lineHeight:1.65,fontSize:14}}>The interrupted request has not been treated as successfully completed. Try again or return home.</p>
            <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap",marginTop:24}}>
              <button type="button" onClick={reset} style={{minHeight:46,padding:"0 18px",background:"#f6b800",border:0,fontWeight:800,cursor:"pointer",color:"#000"}}>Try again</button>
              <button type="button" onClick={() => window.location.assign("/")} style={{minHeight:46,padding:"0 18px",background:"transparent",border:"1px solid rgba(255,255,255,.2)",fontWeight:800,cursor:"pointer",color:"#fff"}}>Go home</button>
              <button type="button" onClick={() => window.location.assign("/help")} style={{minHeight:46,padding:"0 18px",background:"transparent",border:"1px solid rgba(255,255,255,.2)",fontWeight:800,cursor:"pointer",color:"#fff"}}>Help Centre</button>
            </div>
            <p style={{marginTop:20,fontSize:11,color:"#777"}}>Error reference {reference}</p>
          </section>
        </main>
      </body>
    </html>
  );
}
