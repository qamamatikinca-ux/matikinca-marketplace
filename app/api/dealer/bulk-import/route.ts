import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";

function parseCsv(text: string) {
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) { const c = text[i]; if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; } else if (c === "," && !quoted) { row.push(value); value = ""; } else if ((c === "\n" || c === "\r") && !quoted) { if (c === "\r" && text[i + 1] === "\n") i++; row.push(value); value = ""; if (row.some((v) => v.trim())) rows.push(row); row = []; } else value += c; }
  row.push(value); if (row.some((v) => v.trim())) rows.push(row); return rows;
}
export async function POST(request: NextRequest) {
  try { const client = dealerServerClient(request); await requireDealerContext(client); const body = await request.json(); const csv = String(body.csv || ""); if (csv.length > 2_000_000) throw new Error("CSV is too large for this import."); const rows = parseCsv(csv); if (rows.length < 2) throw new Error("CSV has no stock rows."); const header = rows[0].map((v) => v.trim().toLowerCase()); const required = ["title", "year", "brand", "model", "vehicle_type", "price", "city"]; for (const key of required) if (!header.includes(key)) throw new Error(`CSV is missing ${key}.`); const mapped = rows.slice(1, 501).map((values, index) => { const record: Record<string, string | number> = Object.fromEntries(header.map((key, i) => [key, values[i]?.trim() || ""])); record._row = index + 2; return record; }); const { data, error } = await client.rpc("loadlink_dealer_bulk_import", { p_filename: String(body.filename || "stock.csv"), p_rows: mapped }); if (error) throw error; return Response.json(data || { total: mapped.length, ready: 0, attention: 0, invalid: mapped.length }); } catch (error) { return apiError(error); }
}
