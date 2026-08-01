export const SEARCH_STOP_WORDS = new Set([
  "a", "an", "and", "any", "are", "available", "around", "at", "for", "find", "from", "i", "im", "in", "inside", "is", "looking", "me", "near", "need", "of", "on", "within", "please", "show", "the", "to", "want", "with",
]);

const synonymGroups: string[][] = [
  ["job", "jobs", "work", "opportunity", "opportunities", "load", "loads"],
  ["contract", "contracts", "tender", "tenders", "recurring"],
  ["truck", "trucks", "vehicle", "vehicles", "rig", "fleet"],
  ["driver", "drivers", "ownerdriver", "owner-driver"],
  ["dealer", "dealership", "dealerships", "showroom"],
  ["hire", "rental", "rent"],
  ["gauteng", "johannesburg", "pretoria", "centurion", "midrand", "sandton", "soweto", "kempton", "boksburg", "benoni", "germiston", "alberton", "randburg", "roodepoort", "krugersdorp", "vereeniging", "vanderbijlpark"],
  ["kwazulu natal", "kwazulu-natal", "kzn", "durban", "pietermaritzburg", "richards bay", "pinetown", "umhlanga"],
  ["western cape", "cape town", "stellenbosch", "paarl", "george", "bellville"],
  ["eastern cape", "gqeberha", "port elizabeth", "east london", "mthatha", "komani"],
  ["mpumalanga", "mbombela", "nelspruit", "emalahleni", "witbank", "middelburg", "secunda"],
  ["limpopo", "polokwane", "tzaneen", "mokopane", "musina", "lephalale"],
  ["north west", "rustenburg", "klerksdorp", "potchefstroom", "mahikeng", "brits"],
  ["free state", "bloemfontein", "welkom", "bethlehem", "sasolburg"],
  ["northern cape", "kimberley", "upington", "kuruman", "springbok"],
];

export function normaliseSearch(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

export function searchTokens(value: string) {
  return normaliseSearch(value)
    .split(/\s+/)
    .filter((token) => token && !SEARCH_STOP_WORDS.has(token));
}

export function expandToken(token: string) {
  const group = synonymGroups.find((items) => items.some((item) => normaliseSearch(item).split(" ").includes(token) || normaliseSearch(item) === token));
  return group ? Array.from(new Set(group.flatMap((item) => normaliseSearch(item).split(" ")))) : [token];
}

export function tokenMatches(searchable: string, token: string) {
  const clean = normaliseSearch(searchable);
  return expandToken(token).some((candidate) => clean.includes(candidate));
}

export function flexibleMatch(searchable: string, query: string) {
  const tokens = searchTokens(query);
  if (!tokens.length) return true;
  const matched = tokens.filter((token) => tokenMatches(searchable, token)).length;
  return matched === tokens.length || (tokens.length >= 3 && matched >= Math.ceil(tokens.length * 0.67));
}

export function detectIntent(query: string): "job" | "contract" | "asset" | "driver" | "dealer" | null {
  const clean = normaliseSearch(query);
  if (/\b(dealer|dealership|showroom)\b/.test(clean)) return "dealer";
  if (/\b(contract|contracts|tender|recurring)\b/.test(clean)) return "contract";
  // Job wording takes priority over vehicle wording so “truck job in Gauteng”
  // correctly searches opportunities instead of the vehicle marketplace.
  if (/\b(job|jobs|work|opportunity|opportunities|load|loads)\b/.test(clean)) return "job";
  if (/\b(driver|drivers|owner driver)\b/.test(clean)) return "driver";
  if (/\b(truck|trucks|vehicle|vehicles|trailer|tipper|superlink|lowbed|tautliner|bakkie|mobile unit|food truck|mobile toilet|mobile fridge)\b/.test(clean)) return "asset";
  return null;
}

export function detectRegion(query: string) {
  const clean = normaliseSearch(query);
  const regions: Record<string, string[]> = {
    gauteng: ["johannesburg", "pretoria", "centurion", "midrand", "sandton", "soweto", "kempton park", "boksburg", "benoni", "germiston", "alberton", "randburg", "roodepoort", "krugersdorp", "vereeniging", "vanderbijlpark"],
    "kwazulu natal": ["durban", "pietermaritzburg", "richards bay", "pinetown", "umhlanga", "newcastle", "ladysmith"],
    "western cape": ["cape town", "bellville", "stellenbosch", "paarl", "worcester", "george", "mossel bay"],
    "eastern cape": ["gqeberha", "port elizabeth", "east london", "mthatha", "komani", "queenstown", "kariega"],
    mpumalanga: ["mbombela", "nelspruit", "emalahleni", "witbank", "middelburg", "secunda", "ermelo"],
    limpopo: ["polokwane", "tzaneen", "mokopane", "musina", "lephalale", "phalaborwa"],
    "north west": ["rustenburg", "klerksdorp", "potchefstroom", "mahikeng", "brits"],
    "free state": ["bloemfontein", "welkom", "bethlehem", "sasolburg", "kroonstad"],
    "northern cape": ["kimberley", "upington", "kuruman", "springbok", "de aar"],
  };
  return Object.entries(regions).find(([region]) => clean.includes(region)) || null;
}
