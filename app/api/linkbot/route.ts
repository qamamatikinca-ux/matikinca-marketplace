import { NextRequest, NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

const PRODUCT_RULES = `
LoadLink is a South African logistics marketplace.
Core areas: Jobs, Contracts, Vehicles & Units, Drivers, Dealerships, Messages & Calls, Packages & Payments, Help.
Jobs are individual logistics opportunities. Contracts are recurring/project/longer-term opportunities and must stay separate from Jobs.
Manual vehicle listing access is R15 for one 10-day listing credit. Bulk Manual purchases create separate credits. Never invent discounts or extra fees.
Pro is for regular advertisers and includes advanced analytics. Dealer is for dealership showroom, stock, leads, team and dealership tools.
A dealership status ring represents a real active update; seen updates use a quieter treatment; no active update means no status ring.
Following a dealership is account-specific. Public users must not be told they are following something unless account data proves it.
Messages are private. Call events such as outgoing, incoming, missed, declined and failed calls belong in the chat history.
Never claim a payment is verified, a plan is active, a listing is approved, a user is verified, or a call succeeded unless the supplied context explicitly proves it.
Never ask for passwords, OTPs, PINs, card details or banking credentials.
When a problem requires account investigation, direct the user to Talk to an Agent rather than inventing an account state.
`;

const WEBSITE_CONTEXT = `You are LinkBot, LoadLink's practical help assistant. Answer like a knowledgeable product support specialist, not a generic chatbot. Use the user's current page/area when supplied. Give concise, direct steps. If the user asks where something is, name the exact LoadLink area. If a route is useful, describe the route in normal language rather than dumping implementation details. Ask one short clarifying question only when it genuinely changes the answer. ${PRODUCT_RULES}`;

type Faq = { keys: string[]; answer: string; followups: string[] };
const faq: Faq[] = [
  { keys:["agent","human","person","support","complaint"], answer:"I can keep helping, or you can hand this to a LoadLink agent. The current page can be attached to the support request so you do not need to explain the navigation again.", followups:["Keep helping me","Talk to an agent"] },
  { keys:["verify","verification","id","passport","otp","badge"], answer:"Open Account Verification and follow the exact status shown there. Identity documents stay private. If the page says rejected, use the resubmission path and correct only the affected information.", followups:["OTP help","Resubmission help","Talk to an agent"] },
  { keys:["post job","list job","create job"], answer:"Use Jobs and choose Post a job. Add the required vehicle or unit, Needed on date, location, rate, work details and contact information, then review and submit.", followups:["What should I include?","Find jobs","Talk to an agent"] },
  { keys:["contract","post contract"], answer:"Use Contracts and choose Post a contract. The contract form asks business-specific information such as company name, contract type, term/frequency, required vehicle or service, location, dates, pricing terms and contact details.", followups:["Find contracts","Contract safety","Talk to an agent"] },
  { keys:["manual","r15","credit","10 day"], answer:"One Manual listing credit costs R15 and gives one approved Manual vehicle listing a 10-day live period. Buying several creates separate credits; it does not turn one listing into a longer duration.", followups:["View packages","Payment problem","List a vehicle"] },
  { keys:["payment","charged","paystack","plan not active","pending"], answer:"Do not pay a second time immediately. LoadLink verifies payment server-side. Keep the LoadLink payment reference and use Talk to an Agent if the paid entitlement is not reflected after verification.", followups:["View packages","Talk to an agent"] },
  { keys:["dealer","dealership","showroom","follow","status"], answer:"A dealership showroom contains the dealer's public profile, stock and updates. Following is saved to your account. A status ring only appears when that followed dealership has a real active update.", followups:["Find dealerships","Dealer centre","Status not showing"] },
  { keys:["call","calling","audio","microphone","iphone","android"], answer:"Open the conversation and use the LoadLink call control. Allow microphone access and keep a stable connection. Failed, missed, declined and completed calls should appear inside the chat history rather than covering the messages.", followups:["Call not connecting","Microphone help","Talk to an agent"] },
  { keys:["message","chat","archive","potential deals"], answer:"Use Message on a listing to open the exact poster conversation. New enquiries may appear in Potential Deals. Archived conversations remain in Archived and call activity belongs in the conversation timeline.", followups:["Why can't I message?","Calls","Talk to an agent"] },
  { keys:["search","find","results","filter"], answer:"Use the homepage marketplace search, choose the correct category when helpful and add a location only when it matters. Results should keep Jobs, Contracts, Vehicles, Drivers and Dealerships in their correct types.", followups:["No results","Find contracts","Find vehicles"] },
  { keys:["photo","image","picture","broken"], answer:"Listing and showroom images should use the uploaded source without stretching. If one repeatedly fails to load, send support the exact listing/showroom link so the storage URL can be checked.", followups:["Upload help","Talk to an agent"] },
  { keys:["report","scam","fake","fraud","unsafe"], answer:"Use the LoadLink report sheet on the listing and explain the concern. Do not share OTPs, passwords, banking PINs or identity documents with another marketplace user.", followups:["Safety checklist","Talk to an agent"] },
  { keys:["analytics","views","leads","dealer centre"], answer:"Pro analytics focuses on listing performance. Dealer analytics focuses on showroom, stock and lead activity. Use the action-focused metrics rather than treating every number as a sales prediction.", followups:["Pro plan","Dealer centre","Improve a listing"] },
];

function fallback(message: string, area: string) {
  const words = message.toLowerCase();
  let best: Faq | undefined;
  let score = 0;
  for (const item of faq) {
    const current = item.keys.reduce((n, key) => n + (words.includes(key) ? key.length : 0), 0);
    if (current > score) { score = current; best = item; }
  }
  return best || {
    answer: `You're in ${area || "LoadLink"}. Tell me the action you tried and what happened after you tapped it. I can narrow the answer to that exact flow.`,
    followups: ["Find something", "Posting help", "Payments & plans", "Talk to an agent"],
  };
}

export async function POST(request: NextRequest) {
  const limited = serverRateLimit(request, "linkbot", 16, 60_000);
  if (limited) return limited;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 40_000) return NextResponse.json({ answer: "That request is too large.", followups: ["Ask a shorter question"] }, { status: 413 });

  const body = await request.json().catch(() => ({}));
  const message = String(body?.message || "").trim().slice(0, 1400);
  const history = Array.isArray(body?.history) ? body.history.slice(-10) : [];
  const context = body?.context && typeof body.context === "object" ? body.context : {};
  const pathname = String(context.pathname || "/").slice(0, 180);
  const area = String(context.area || "LoadLink").slice(0, 80);
  const signedIn = Boolean(context.signedIn);
  if (!message) return NextResponse.json({ answer: "Ask me anything about using LoadLink.", followups: ["Find something", "Posting help", "Talk to an agent"] }, { status: 400 });

  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.OPENAI_LINKBOT_MODEL || "gpt-5-mini",
          instructions: `${WEBSITE_CONTEXT}\nCurrent area: ${area}. Current route: ${pathname}. Signed in: ${signedIn ? "yes" : "no"}. Do not expose private account information and do not pretend to have account data that was not supplied.`,
          input: [
            ...history.map((m: { from?: string; text?: string }) => ({ role: m.from === "bot" ? "assistant" : "user", content: String(m.text || "").slice(0, 1200) })),
            { role: "user", content: message },
          ],
          max_output_tokens: 600,
        }),
        signal: AbortSignal.timeout(16000),
      });
      if (response.ok) {
        const data = await response.json();
        const answer = data.output_text || data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).map((part: { text?: string }) => part.text || "").join(" ");
        if (answer) return NextResponse.json({ answer, followups: ["Ask another question", "Talk to an agent"], ai: true });
      }
    } catch {}
  }

  const result = fallback(message, area);
  return NextResponse.json({ ...result, ai: false });
}
