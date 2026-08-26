"use client";

import { useEffect, useState } from "react";

const RECOVERY_WINDOW_MS = 15000;

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [failedTwice, setFailedTwice] = useState(false);

  useEffect(() => {
    const path = window.location.pathname || "/";
    const key = `loadlink-global-recovery:${path}`;
    const now = Date.now();
    let previous = 0;

    try {
      previous = Number(window.sessionStorage.getItem(key) || 0);
    } catch {}

    if (!previous || now - previous > RECOVERY_WINDOW_MS) {
      try { window.sessionStorage.setItem(key, String(now)); } catch {}
      const timer = window.setTimeout(() => reset(), 120);
      return () => window.clearTimeout(timer);
    }

    if (path !== "/") {
      window.location.replace("/");
      return;
    }

    setFailedTwice(true);
  }, [reset]);

  return (
    <html lang="en">
      <body style={{margin:0,background:"#050505",color:"white",fontFamily:"Arial,sans-serif"}}>
        <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,textAlign:"center"}}>
          {!failedTwice ? (
            <div aria-live="polite" style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,.62)"}}>Recovering LoadLink…</div>
          ) : (
            <div style={{maxWidth:360}}>
              <p style={{margin:0,fontSize:15,fontWeight:800}}>LoadLink could not reload.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{marginTop:16,minHeight:44,border:0,borderRadius:999,padding:"0 20px",background:"#f6b800",color:"#000",fontWeight:800,cursor:"pointer"}}
              >
                Reload
              </button>
            </div>
          )}
        </main>
      </body>
    </html>
  );
}
