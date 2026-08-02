"use client";

import { useMemo } from "react";
import { createErrorReference } from "@/lib/core";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reference = useMemo(() => createErrorReference("LL-WEB"), []);
  return (
    <html lang="en">
      <body>
        <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#050505",color:"white",fontFamily:"Arial,sans-serif"}}>
          <section style={{maxWidth:560,textAlign:"center",border:"1px solid #4b3a12",padding:32,background:"#0d0d0d"}}>
            <p style={{color:"#c8a64b",letterSpacing:2,fontSize:12}}>LOADLINK RECOVERY</p>
            <h1>Something interrupted this page</h1>
            <p style={{color:"#c9c9c9",lineHeight:1.6}}>Your account and existing data have not been changed. Try loading the page again.</p>
            <button onClick={reset} style={{marginTop:16,padding:"12px 20px",background:"#c8a64b",border:0,fontWeight:700,cursor:"pointer"}}>Try again</button>
            <p style={{marginTop:18,fontSize:12,color:"#888"}}>Error reference {reference}</p>
          </section>
        </main>
      </body>
    </html>
  );
}
