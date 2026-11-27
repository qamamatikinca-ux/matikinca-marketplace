/** Suggest an expected contract end date only for unambiguous durations.
 * The poster can edit or clear this date; we never treat it as completion proof. */
export function suggestContractEndDate(startDate: string, duration: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return "";
  const parsed = new Date(`${startDate}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== startDate) return "";
  const match = duration.trim().match(/^(\d{1,3})\s*(day|days|week|weeks|month|months|year|years)$/i);
  if (!match) return "";
  const value = Number(match[1]);
  if (!Number.isInteger(value) || value < 1 || value > 120) return "";
  const unit = match[2].toLowerCase();
  let result: Date;
  if (unit.startsWith("day") || unit.startsWith("week")) {
    const days = value * (unit.startsWith("week") ? 7 : 1);
    if (days > 3653) return "";
    result = new Date(parsed.getTime() + days * 86400000);
  } else {
    const months = value * (unit.startsWith("year") ? 12 : 1);
    if (months > 120) return "";
    const targetYear = parsed.getUTCFullYear();
    const targetMonth = parsed.getUTCMonth() + months;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    result = new Date(Date.UTC(targetYear, targetMonth, Math.min(parsed.getUTCDate(), lastDay), 12));
  }
  return Number.isNaN(result.getTime()) ? "" : result.toISOString().slice(0, 10);
}
