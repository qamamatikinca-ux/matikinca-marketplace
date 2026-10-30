export type DocumentSection = { title: string; text: string };
export function documentSections(body: string, documentType: string): DocumentSection[] {
 let text = body.replace(/\r\n/g, "\n").trim();
 const first = text.split("\n")[0];
 if (first?.toLowerCase().replace(/[^a-z0-9]/g, "") === documentType.toLowerCase().replace(/[^a-z0-9]/g, "")) text = text.slice(first.length).trim();
 return text.split(/\n\s*\n/).filter(Boolean).map((block, index) => {
  const lines = block.split("\n");
  const hasHeading = lines.length > 1 && /^[A-Za-z][A-Za-z /&-]{1,60}$/.test(lines[0]);
  return { title: hasHeading ? lines.shift()! : index === 0 ? "Details" : "Notes", text: lines.map(line => /:\s*$/.test(line) ? `${line.trim()} Not provided` : line).join("\n") };
 });
}
