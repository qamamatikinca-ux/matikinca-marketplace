/** Contract scope is distinct from the vehicle or mobile unit needed. */
export const CONTRACT_TYPES = [
  "General freight & distribution",
  "Mining & bulk haulage",
  "Construction & plant transport",
  "Agriculture & livestock",
  "Refrigerated & cold chain",
  "Courier & last-mile delivery",
  "Heavy haulage & abnormal loads",
  "Fuel, chemicals & hazardous goods",
  "Events & mobile services",
  "Municipal & waste services",
  "Public-sector tenders",
  "Other transport services",
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

export function contractTypeFromDescription(value: string | null | undefined): string {
  const match = String(value || "").match(/^Contract type:\s*([^\r\n]+)/im);
  return match?.[1]?.trim() || "";
}
