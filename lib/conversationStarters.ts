export type PostContext = { id?: string; title?: string | null; listing_kind?: string | null; description?: string | null; city?: string | null; rate?: string | null };

/** Use persisted post fields only. Unknown types receive neutral questions. */
export function conversationStarters(post: PostContext | null, title: string, owner = false): string[] {
  const subject = `“${String(post?.title || title || "this post").trim()}”`;
  const explicit = String(post?.listing_kind || "").toLowerCase();
  const legacy = String(post?.description || "").match(/^Listing type:\s*(Contract|Job|Vehicle|Driver)\s*$/im)?.[1]?.toLowerCase();
  const kind = ["job", "contract", "vehicle", "driver"].includes(explicit) ? explicit : legacy;
  if (owner) return [
    `Thanks for enquiring about ${subject} on LoadLink. What would you like to know about this post?`,
    `Regarding ${subject}, please confirm your requirements and preferred next step.`,
    `Regarding ${subject}, what dates would suit you to discuss the advertised terms?`,
  ];
  const location = post?.city?.trim() ? ` in ${post.city.trim()}` : "";
  if (kind === "driver") return [
    `Hi, I saw your driver profile ${subject} on LoadLink. Are you currently available for driving work?`,
    `Regarding your driver profile ${subject}, which routes and vehicle types are you available for?`,
    `Regarding your driver profile ${subject}, when could you start and what working arrangements are you looking for?`,
  ];
  if (kind === "job") return [
    `Hi, I’m enquiring about the job ${subject}${location} on LoadLink. Is it still open?`,
    `Regarding the job ${subject}, please confirm the collection and delivery details, load requirements and start date.`,
    `Regarding the job ${subject}, please confirm the advertised rate, payment terms and required documents.`,
  ];
  if (kind === "contract") return [
    `Hi, I’m enquiring about the contract ${subject}${location} on LoadLink. Are applications still open?`,
    `Regarding the contract ${subject}, please confirm the duration, start date and required vehicles or capacity.`,
    `Regarding the contract ${subject}, please confirm the application process, required documents and payment terms.`,
  ];
  if (kind === "vehicle") return [
    `Hi, I saw ${subject}${location} on LoadLink. Is this vehicle or unit still available on the advertised terms?`,
    `Regarding ${subject}, please confirm its current condition, specifications and when it can be viewed.`,
    `Regarding ${subject}, please confirm the advertised price or rate and what it includes.`,
  ];
  return [
    `Hi, I’m enquiring about ${subject} on LoadLink. Is this post still current?`,
    `Regarding ${subject}, please confirm the advertised terms and availability.`,
    `Regarding ${subject}, what information do you need from me to proceed?`,
  ];
}
