function formatNumber(value: string) {
  const cleaned = value.replace(/\s+/g, "").replace(/,/g, "");
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return value.trim();
  return new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
  })
    .format(numeric)
    .replace(/\u00a0/g, " ");
}

export function formatListingRate(value?: string | null) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "R —";

  // Keep genuine non-rand currencies unchanged.
  if (/[€£$]/.test(raw)) return raw;

  const firstDigit = raw.search(/\d/);
  if (firstDigit === -1) {
    if (/negotiable/i.test(raw)) return "Rate negotiable";
    if (/quote|contact/i.test(raw)) return raw;
    return raw;
  }

  const prefix = raw.slice(0, firstDigit);
  const remainder = raw.slice(firstDigit);
  const numberMatch = remainder.match(/^([\d\s,.]+)(.*)$/);
  if (!numberMatch) return raw;

  const number = formatNumber(numberMatch[1]);
  let suffix = numberMatch[2]
    .replace(/^\s*(?:zar|r)\s*/i, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();

  const isFrom = /\bfrom\b/i.test(prefix);
  const suffixText = suffix ? (suffix.startsWith("/") ? suffix : ` ${suffix}`) : "";
  return `${isFrom ? "From " : ""}R${number}${suffixText}`;
}
