import { NextRequest, NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

const WEBSITE_CONTEXT = `You are LinkBot, LoadLink's product help assistant for a South African logistics marketplace. Be concise, practical and route-aware. You help with Jobs, Contracts, Vehicles & Units, Drivers, Dealerships, showrooms, dealer statuses, following, Messages, Calls, quotes, notifications, packages, Manual credits, Pro, Dealer, payments, verification, reports, cookie preferences, search and account settings.

Always use these product truths:
- Jobs are ordinary logistics work for truck/mobile-unit owners.
- Contracts are separate longer-term/recurring/project opportunities and have their own posting flow.
- Vehicles & Units are marketplace assets, not Jobs.
- One Manual listing credit costs R15 and gives one approved Manual listing 10 live days.
- Pro is R399/month and Dealer is R2,999/month unless the server catalogue says otherwise.
- Never claim a payment succeeded merely because checkout opened; LoadLink verifies payment server-side.
- A gold dealership status ring means an active relevant update. No active update means no gold ring.
- Dealership showrooms are public dealership pages; the Dealership Centre is the dealership's private operating workspace.
- Archived Messages remain; Starred is not part of the current product.
- Calls are in-app audio. If a call fails, help the user check microphone permission/network and recommend retrying from the same conversation. Never promise a connection you cannot verify.
- Never invent the user's plan, payment, verification, listing, message, call or dealership status.
- If the user is logged out, don't instruct them to use authenticated-only controls without first telling them to sign in.
- If the route context already reveals what page they are on, use it instead of asking unnecessary questions.
- Give the exact next LoadLink page/action where possible.
- Escalate to human support when a user reports money charged but no entitlement, account security issues, moderation disputes, repeated technical failures, or anything you cannot safely resolve.

Tone: calm, direct, no marketing fluff, no fake AI language.`;

type Faq = { keys: string[]; answer: (context: RequestContext) => string; followups: string[] };
type RequestContext = { pathname: string; search: string; title: string; signedIn: boolean; theme: string };

const faq: Faq[] = [
  { keys:["agent","human","person","support","complaint"], answer:()=>"I can keep helping, or I can hand this to LoadLink Support. Include the page/listing involved, what you expected, and what actually happened.", followups:["Keep helping me","Talk to an agent"] },
  { keys:["charged","money taken","paid but","payment pending","plan not active","credits not active"], answer:()=>"Do not pay again yet. Open Packages/Payment history and check the LoadLink payment reference. LoadLink must verify the Paystack amount and reference server-side before activating a plan or Manual credits. If you were charged and nothing activated, send the payment reference to Support — never send card details or banking passwords.", followups:["Open packages","Talk to an agent"] },
  { keys:["manual","credit","r15","10 days","bulk"], answer:()=>"Manual is pay-as-you-go: R15 buys one listing credit and that approved listing gets 10 live days. Buying 10 creates 10 separate credits, not one 100-day listing. Bulk quantity should equal quantity × R15 exactly.", followups:["Open packages","How do credits activate?","Talk to an agent"] },
  { keys:["verify","verification","id","passport","otp","badge"], answer:(c)=>c.signedIn?"Open Account Verification and complete the requested identity/business steps. Pending, verified, rejected and resubmission states are handled separately, and private verification documents are not public.":"Sign in first, then open Account Verification to complete the required identity or business steps.", followups:["Verification rejected","OTP not arriving","Talk to an agent"] },
  { keys:["post job","list job","create job"], answer:()=>"Use Jobs → Post a job. Add what vehicle/mobile unit is needed, the Needed on date, location, rate, details and contact information. Jobs are for ordinary work, not longer-term contracts.", followups:["Open jobs","Post a contract instead","Talk to an agent"] },
  { keys:["contract","post contract","tender","recurring"], answer:()=>"Use Contracts → Post a contract. The contract form asks for company, contract type, required vehicle/service, start/end dates, frequency, rate or tender terms, payment terms and business requirements.", followups:["Open contracts","Post a contract","Talk to an agent"] },
  { keys:["showroom","dealership","dealer status","follow dealer","status ring"], answer:()=>"A showroom is the dealership's public LoadLink page. Following a dealership saves the relationship to your account. If that dealership has an active update, the status can appear with a gold ring; if there is no active update, there should be no gold ring.", followups:["Find dealerships","Why is a status missing?","Talk to an agent"] },
  { keys:["call","audio","microphone","connecting","iphone","android"], answer:()=>"Retry from the same LoadLink conversation after confirming microphone permission and a stable network. LoadLink should end failed calls instead of leaving Connecting forever, and the call outcome should appear in the chat timeline. If iPhone-to-Android still fails repeatedly, send Support the conversation and approximate call time so signalling can be checked.", followups:["Check microphone","Call history missing","Talk to an agent"] },
  { keys:["quote","light mode","quote invisible"], answer:()=>"Quotes are document-style content and should remain readable in both themes. If a quote is unreadable, switch theme once to confirm it is a rendering issue, then report the conversation so LoadLink can inspect that quote preview.", followups:["Open messages","Talk to an agent"] },
  { keys:["search","find","results","filter","wrong results"], answer:()=>"Use the homepage marketplace selector first, then type the real term and optional location. Jobs, Contracts, Vehicles, Drivers and Dealerships are ranked separately so a clear contract query should not return ordinary Jobs above Contracts.", followups:["Search jobs","Search contracts","Clear filters"] },
  { keys:["report","scam","fake","fraud","unsafe"], answer:()=>"Use LoadLink's Report control on the listing. It should open the custom LoadLink report sheet, not a browser/iOS prompt. Describe the issue without sharing passwords, OTPs or banking credentials.", followups:["Safety checklist","Talk to an agent"] },
  { keys:["cookie","cookies","privacy"], answer:()=>"LoadLink asks for cookie consent once, then remembers the choice. Use Cookie Preferences in the footer/settings if you want to change it later.", followups:["Privacy policy","Cookie preferences"] },
  { keys:["login","sign in","password","account"], answer:()=>"Use the account control to sign in. For a forgotten password, use Forgot password and follow the reset email. Logged-out users should not see personalised dealership/status/notification data.", followups:["Forgot password","Create account","Talk to an agent"] },
];

function routeHint(context: RequestContext) {
  const path = context.pathname || "/";
  if (path.startsWith("/messages")) return "You are currently in Messages.";
  if (path.startsWith("/contracts/post")) return "You are currently in the dedicated contract posting flow.";
  if (path.startsWith("/contracts")) return "You are currently in the Contracts marketplace.";
  if (path.startsWith("/jobs")) return "You are currently in Jobs.";
  if (path.startsWith("/dealership/")) return "You are currently viewing a public dealership showroom.";
  if (path.startsWith("/dealer")) return "You are currently in the private dealership workspace.";
  if (path.startsWith("/packages")) return "You are currently in Packages.";
  if (path.startsWith("/help")) return "You are currently in Help Centre.";
  return "";
}

function fallback(message: string, context: RequestContext) {
  const words = message.toLowerCase();
  let best: Faq | undefined;
  let score = 0;
  for (const item of faq) {
    const current = item.keys.reduce((n, key) => n + (words.includes(key) ? key.length : 0), 0);
    if (current > score) { score = current; best = item; }
  }
  if (best) return { answer: best.answer(context), followups: best.followups };
  const hint = routeHint(context);
  return {
    answer: `${hint ? `${hint} ` : ""}Tell me the action you tried, what happened, and what you expected LoadLink to do. I’ll give you the shortest next step or hand it to Support if it needs investigation.`.trim(),
    followups: ["Find something", "Post or manage something", "Fix this page", "Talk to an agent"],
  };
}

export async function POST(request: NextRequest) {
  const limited = serverRateLimit(request, "linkbot", 16, 60_000);
  if (limited) return limited;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 36_000) return NextResponse.json({ answer: "That request is too large.", followups: ["Ask a shorter question"] }, { status: 413 });

  const body = await request.json().catch(() => ({}));
  const message = String(body?.message || "").trim().slice(0, 1400);
  const history = Array.isArray(body?.history) ? body.history.slice(-10) : [];
  const rawContext = body?.context || {};
  const context: RequestContext = {
    pathname: String(rawContext.pathname || "/").slice(0, 300),
    search: String(rawContext.search || "").slice(0, 500),
    title: String(rawContext.title || "").slice(0, 200),
    signedIn: Boolean(rawContext.signedIn),
    theme: rawContext.theme === "dark" ? "dark" : "light",
  };

  if (!message) return NextResponse.json({ answer: "Tell me what you need help with on LoadLink.", followups: ["Find something", "Post or manage something", "Talk to an agent"] }, { status: 400 });

  const deterministic = fallback(message, context);
  const deterministicScore = faq.some((item) => item.keys.some((key) => message.toLowerCase().includes(key)));
  if (deterministicScore) return NextResponse.json({ ...deterministic, ai: false });

  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.OPENAI_LINKBOT_MODEL || "gpt-5-mini",
          instructions: WEBSITE_CONTEXT,
          input: [
            { role: "system", content: `Current LoadLink context: ${JSON.stringify(context)}` },
            ...history.map((m: any) => ({ role: m.from === "bot" ? "assistant" : "user", content: String(m.text || "") })),
            { role: "user", content: message },
          ],
          max_output_tokens: 420,
        }),
        signal: AbortSignal.timeout(14_000),
      });
      if (response.ok) {
        const data = await response.json();
        const answer = data.output_text || data.output?.flatMap((i: any) => i.content || []).map((p: any) => p.text || "").join(" ");
        if (answer) return NextResponse.json({ answer, followups: ["Ask another question", "Fix this page", "Talk to an agent"], ai: true });
      }
    } catch {}
  }

  return NextResponse.json({ ...deterministic, ai: false });
}
