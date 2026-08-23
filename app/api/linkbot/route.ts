import { NextRequest, NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

const WEBSITE_CONTEXT = `You are LinkBot, the in-product LoadLink support assistant for a South African logistics marketplace.

Your job is to solve the user's LoadLink problem with the fewest useful steps. Use the supplied page context when it helps. Distinguish clearly between Jobs, Contracts, Vehicles & Mobile Units, Dealership showrooms, Dealer Centre, Messages, Packages, Verification and account support.

Core rules:
- Never invent account, payment, verification, listing, dealer or moderation status. If the client says the user is signed out, do not describe signed-in-only information as if it belongs to them.
- Prefer exact LoadLink routes and actions. Jobs are short/ordinary work opportunities. Contracts are recurring, project or longer-term opportunities and should include company, duration, frequency, service/vehicle needs, location, commercial terms and deadline details.
- Dealer Status is a 24-hour dealership update. Followers should see fresh dealer statuses in the dealership/status rail and Messages.
- Standard accounts have a 50-message daily allowance. Pro and Dealer include higher/unlimited messaging according to the current plan rules shown in-product.
- Do not tell users to use generic browser workarounds before checking the LoadLink-specific action they are trying to complete.
- For troubleshooting, give: what to check now -> exact LoadLink action -> what evidence to send support if it still fails.
- For safety, never ask for passwords, OTPs, banking PINs or private identity documents in chat.
- If a request needs account-specific data that was not supplied, say what the user should open/check rather than guessing.
- Keep answers concise, natural and specific. Usually 2-6 short sentences or a small set of steps. Ask one clarifying question only when it is genuinely required.
- If the user wants a person, explain that LinkBot can hand the issue to LoadLink Support and tell them to include the affected page/listing and what they expected to happen.

Useful routes: /jobs, /jobs/list, /contracts, /jobs/list?type=contract, /list-your-vehicle, /vehicles, /following, /messages, /packages, /packages/guide, /dealer, /notifications, /help, /account/verification.`;

type Faq = { keys: string[]; answer: string; followups: string[] };
const faq: Faq[] = [
  { keys: ["agent","human","person","support","complaint"], answer: "I can keep troubleshooting, or hand this to LoadLink Support. For a useful handover, include the page or listing involved, what you tapped, what you expected, and what actually happened.", followups: ["Keep helping me","Talk to an agent"] },
  { keys: ["verify","verification","id","passport","otp","badge"], answer: "Open Account Verification and complete the required phone and identity steps shown there. LoadLink only shows the verified badge after approval, and LinkBot cannot infer your current review status from this chat.", followups: ["Why is my OTP not arriving?","Open verification","Talk to an agent"] },
  { keys: ["otp","sms","code"], answer: "Check the South African number carefully, request one fresh code, and wait for that code before requesting another. If it still does not arrive, send Support the verification page, your device type and the approximate time you requested the code — never send the OTP itself.", followups: ["Open verification","Talk to an agent"] },
  { keys: ["post job","list job","create job","need vehicle"], answer: "Open Jobs and choose Post a job. Add the vehicle or mobile unit needed, the exact date, location, job title, rate or budget, clear work details and a valid contact number, then review before submitting.", followups: ["What makes a good job post?","Open Jobs","Talk to an agent"] },
  { keys: ["contract","post contract"], answer: "Open Contracts and choose Post contract. The contract flow should capture the company, service or vehicle requirement, start date, location, duration/frequency, commercial terms, scope and contact details before review.", followups: ["Open Contracts","What should a contract include?","Talk to an agent"] },
  { keys: ["truck","trailer","mobile toilet","mobile fridge","food truck","mobile kitchen","asset","vehicle"], answer: "Open Vehicles & Mobile Units. Choose List vehicle or List mobile unit for your own stock, or View available vehicles & units to browse the marketplace.", followups: ["List a vehicle","Browse vehicles","How many photos?"] },
  { keys: ["dealer status","dealership status","status update","following dealer"], answer: "Dealer Status updates are tied to dealerships you follow and stay live for 24 hours. Fresh dealer updates should appear as one circular profile per dealership in the status rail and in Messages; opening the status marks that latest update as seen.", followups: ["Find dealerships","Open Messages","Talk to an agent"] },
  { keys: ["dealer centre","dealership centre","showroom","dealer plan"], answer: "Dealer Centre is the operating workspace for an approved Dealer account: showroom, stock, statuses, leads, messages, team tools and dealer analytics. Plan management stays separate under Packages so billing actions do not clutter the dealership workspace.", followups: ["Open Dealer Centre","Manage plan","Find dealerships"] },
  { keys: ["search","find","results","filter"], answer: "Search with the thing and location together — for example “side tipper Rustenburg” or “mobile fridge Johannesburg”. If results look wrong, clear filters first, then narrow by the exact city, vehicle type or listing title.", followups: ["Browse Jobs","Browse vehicles","Find dealerships"] },
  { keys: ["missing","not showing","disappear","deleted"], answer: "Open the correct portal, clear filters, and search the exact title. If the post was rejected or deleted it should no longer behave like a live listing; if you own it, check My Posts for its current state and reason.", followups: ["Open My Posts","Clear filters","Talk to an agent"] },
  { keys: ["message","chat","typing","last seen","50"], answer: "Use Message on a listing or dealership to open the LoadLink chat. Call activity belongs inside the chat timeline, while the composer should stay unobstructed; Standard accounts also show their daily message allowance.", followups: ["Open Messages","Why can’t I message?","Talk to an agent"] },
  { keys: ["call","audio","microphone","android","iphone","ios"], answer: "LoadLink calls use browser WebRTC audio with echo cancellation, noise suppression and automatic gain control. Allow microphone access on both devices and keep the chat open; if a call cannot connect across different networks, send Support both device/browser types and whether either device was on mobile data or Wi-Fi.", followups: ["Open Messages","Microphone not working","Talk to an agent"] },
  { keys: ["analytics","views","viewer","graph"], answer: "Detailed listing analytics are a Pro/Dealer feature. Public view totals may still appear on listings, while deeper traffic and performance information stays behind the relevant plan entitlement.", followups: ["View packages","Improve a listing","Talk to an agent"] },
  { keys: ["package","packages","pro","dealer","manual","plan guide"], answer: "Manual is pay-as-you-go vehicle advertising, Pro is for regular owner-operators, and Dealer adds the dealership showroom and operating workspace. Use Plan Guide only if you want one recommendation; use Manage plan for billing or subscription changes.", followups: ["Open Packages","Open Plan Guide","Manage plan"] },
  { keys: ["photo","image","cover","quality"], answer: "Use a sharp, recent primary image and make sure the vehicle or unit fills the frame without being cropped awkwardly. LoadLink should preserve the intended image area and fall back cleanly instead of collapsing the card if an image fails.", followups: ["List a vehicle","Change cover photo","Talk to an agent"] },
  { keys: ["report","scam","fake","fraud","unsafe"], answer: "Use Report on the listing or conversation and describe what happened. Do not share OTPs, passwords, banking PINs or identity documents with another user; independently confirm the person/company and commercial terms before work starts.", followups: ["Safety checklist","Talk to an agent"] },
  { keys: ["login","sign in","password","account"], answer: "Open Login from the account control. For a forgotten password, use Forgot password and follow the reset email; if the session keeps disappearing, tell Support the device/browser and the page that signs you out.", followups: ["Forgot password","Create an account","Talk to an agent"] },
];

function fallback(message: string, pathname: string) {
  const words = message.toLowerCase();
  let best: Faq | undefined;
  let score = 0;
  for (const item of faq) {
    const current = item.keys.reduce((n, key) => n + (words.includes(key) ? Math.max(2, key.split(" ").length * 3) : 0), 0);
    if (current > score) { score = current; best = item; }
  }
  if (best) return best;
  const pageHint = pathname && pathname !== "/" ? ` You are currently on ${pathname}.` : "";
  return { answer: `Tell me the LoadLink action you are trying to complete and what went wrong.${pageHint} I’ll narrow it down to the exact next step instead of guessing.`, followups: ["Post a listing","Find something","Fix a problem","Talk to an agent"] };
}

export async function POST(request: NextRequest) {
  const limited = serverRateLimit(request, "linkbot", 16, 60_000);
  if (limited) return limited;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 40_000) return NextResponse.json({ answer: "That request is too large.", followups: ["Ask a shorter question"] }, { status: 413 });

  const body = await request.json().catch(() => ({}));
  const message = String(body?.message || "").trim().slice(0, 1600);
  const history = Array.isArray(body?.history) ? body.history.slice(-16) : [];
  const context = body?.context && typeof body.context === "object" ? body.context : {};
  const pathname = String(context?.pathname || "").slice(0, 180);
  const theme = context?.theme === "dark" ? "dark" : "light";
  const signedIn = context?.signedIn === true ? "signed in" : context?.signedIn === false ? "signed out" : "unknown";
  if (!message) return NextResponse.json({ answer: "Ask me anything about using LoadLink.", followups: ["Find something","Post a listing","Talk to an agent"] }, { status: 400 });

  const contextLine = `Current client context: page=${pathname || "/"}; theme=${theme}; authentication=${signedIn}. Do not infer anything else about the user's account.`;
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.OPENAI_LINKBOT_MODEL || "gpt-5-mini",
          instructions: `${WEBSITE_CONTEXT}\n\n${contextLine}`,
          input: [
            ...history.map((m: { from?: string; text?: string }) => ({ role: m.from === "bot" ? "assistant" : "user", content: String(m.text || "").slice(0, 1200) })),
            { role: "user", content: message },
          ],
          max_output_tokens: 620,
        }),
        signal: AbortSignal.timeout(16_000),
      });
      if (response.ok) {
        const data = await response.json();
        const answer = data.output_text || data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).map((part: { text?: string }) => part.text || "").join(" ");
        if (answer) return NextResponse.json({ answer, followups: ["Ask another question","Talk to an agent"], ai: true });
      }
    } catch {}
  }

  const result = fallback(message, pathname);
  return NextResponse.json({ ...result, ai: false });
}
