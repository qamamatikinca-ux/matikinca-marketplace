"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main style={{minHeight:"100vh",background:"#050505",color:"#fff",display:"grid",placeItems:"center",padding:"24px",fontFamily:"Arial, sans-serif"}}>
          <section style={{maxWidth:680,textAlign:"center",borderTop:"1px solid rgba(255,255,255,.12)",borderBottom:"1px solid rgba(255,255,255,.12)",padding:"48px 12px"}}>
            <h1 style={{fontSize:"clamp(36px,7vw,64px)",lineHeight:.95,letterSpacing:"-.05em",margin:0}}>LoadLink hit an unexpected error.</h1>
            <p style={{margin:"18px auto 0",maxWidth:540,lineHeight:1.6,opacity:.62,fontSize:14}}>Nothing should be treated as successfully completed until the request is recovered. Try again or return to the homepage.</p>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginTop:26}}>
              <button type="button" onClick={reset} style={{minHeight:46,border:0,borderRadius:12,padding:"0 18px",fontWeight:800,background:"#f6b800",color:"#000"}}>Try again</button>
              <button type="button" onClick={() => window.location.assign("/")} style={{minHeight:46,border:"1px solid rgba(255,255,255,.18)",borderRadius:12,padding:"0 18px",fontWeight:800,background:"transparent",color:"#fff"}}>Go home</button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
