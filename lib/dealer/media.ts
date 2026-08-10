export type CheckedUpload = { mime: string; bytes: Buffer; extension: string };

function starts(bytes: Buffer, signature: number[]) { return signature.every((value, index) => bytes[index] === value); }
function ascii(bytes: Buffer, start: number, length: number) { return bytes.subarray(start, start + length).toString("ascii"); }

export function checkedBuffer(bytes: Buffer, claimedMime: string, allowed: readonly string[], maxBytes: number): CheckedUpload {
  const claimed = String(claimedMime || "").toLowerCase();
  if (!bytes.length || bytes.length > maxBytes) throw new Error(`File must be ${Math.floor(maxBytes / 1024 / 1024)} MB or less.`);
  let actual = ""; let extension = "";
  if (starts(bytes, [0xff,0xd8,0xff])) { actual="image/jpeg"; extension="jpg"; }
  else if (starts(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) { actual="image/png"; extension="png"; }
  else if (ascii(bytes,0,4)==="RIFF" && ascii(bytes,8,4)==="WEBP") { actual="image/webp"; extension="webp"; }
  else if (ascii(bytes,0,4)==="%PDF") { actual="application/pdf"; extension="pdf"; }
  else if (bytes.length>12 && ascii(bytes,4,4)==="ftyp") {
    const brand = ascii(bytes,8,4);
    actual = claimed === "video/quicktime" || brand === "qt  " ? "video/quicktime" : "video/mp4";
    extension = actual === "video/quicktime" ? "mov" : "mp4";
  }
  else if (starts(bytes,[0x1a,0x45,0xdf,0xa3])) { actual="video/webm"; extension="webm"; }
  else throw new Error("The uploaded file signature is not supported.");
  if (!allowed.includes(actual)) throw new Error("This file type is not allowed here.");
  const equivalentVideo = (claimed === "video/mp4" && actual === "video/quicktime") || (claimed === "video/quicktime" && actual === "video/mp4");
  if (claimed && claimed !== actual && !equivalentVideo) throw new Error("The uploaded file type does not match its contents.");
  return { mime: actual, bytes, extension };
}

export function checkedDataUrl(value: string, allowed: readonly string[], maxBytes: number): CheckedUpload {
  const match = /^data:([^;]+);base64,(.+)$/.exec(value || "");
  if (!match) throw new Error("Invalid file upload.");
  return checkedBuffer(Buffer.from(match[2], "base64"), match[1], allowed, maxBytes);
}

function readUInt64BE(buffer: Buffer, offset: number) {
  if (offset + 8 > buffer.length) return 0;
  const high = buffer.readUInt32BE(offset); const low = buffer.readUInt32BE(offset + 4);
  return high * 4294967296 + low;
}

function mp4DurationSeconds(bytes: Buffer) {
  for (let offset = 0; offset + 32 <= bytes.length;) {
    let size = bytes.readUInt32BE(offset);
    const type = ascii(bytes, offset + 4, 4);
    let header = 8;
    if (size === 1 && offset + 16 <= bytes.length) { size = readUInt64BE(bytes, offset + 8); header = 16; }
    if (!size || size < header || offset + size > bytes.length) { offset += 1; continue; }
    if (type === "moov") {
      const end = offset + size;
      for (let child = offset + header; child + 32 <= end;) {
        let childSize = bytes.readUInt32BE(child); const childType = ascii(bytes, child + 4, 4); let childHeader = 8;
        if (childSize === 1 && child + 16 <= end) { childSize = readUInt64BE(bytes, child + 8); childHeader = 16; }
        if (!childSize || childSize < childHeader || child + childSize > end) { child += 1; continue; }
        if (childType === "mvhd") {
          const base = child + childHeader; const version = bytes[base];
          if (version === 1 && base + 32 <= end) { const timescale = bytes.readUInt32BE(base + 20); const duration = readUInt64BE(bytes, base + 24); return timescale ? duration / timescale : 0; }
          if (base + 20 <= end) { const timescale = bytes.readUInt32BE(base + 12); const duration = bytes.readUInt32BE(base + 16); return timescale ? duration / timescale : 0; }
        }
        child += childSize;
      }
    }
    offset += size;
  }
  return 0;
}

function readEbmlVint(bytes: Buffer, offset: number) {
  if (offset >= bytes.length) return null;
  const first = bytes[offset]; let mask = 0x80; let length = 1;
  while (length <= 8 && !(first & mask)) { mask >>= 1; length++; }
  if (length > 8 || offset + length > bytes.length) return null;
  let value = first & (mask - 1);
  for (let i=1;i<length;i++) value = value * 256 + bytes[offset+i];
  return { value, length };
}

function webmDurationSeconds(bytes: Buffer) {
  const durationId = Buffer.from([0x44,0x89]); const scaleId = Buffer.from([0x2a,0xd7,0xb1]);
  let scale = 1_000_000; let duration = 0;
  const scalePos = bytes.indexOf(scaleId);
  if (scalePos >= 0) {
    const vint = readEbmlVint(bytes, scalePos + scaleId.length);
    if (vint && vint.value > 0 && vint.value <= 8) {
      const start = scalePos + scaleId.length + vint.length; let value = 0;
      for (let i=0;i<vint.value && start+i<bytes.length;i++) value = value * 256 + bytes[start+i];
      if (value > 0) scale = value;
    }
  }
  const pos = bytes.indexOf(durationId);
  if (pos >= 0) {
    const vint = readEbmlVint(bytes, pos + durationId.length);
    if (vint && (vint.value === 4 || vint.value === 8)) {
      const start = pos + durationId.length + vint.length;
      if (start + vint.value <= bytes.length) duration = vint.value === 4 ? bytes.readFloatBE(start) : bytes.readDoubleBE(start);
    }
  }
  return Number.isFinite(duration) && duration > 0 ? duration * scale / 1_000_000_000 : 0;
}

export function videoDurationSeconds(upload: CheckedUpload) {
  if (upload.mime === "video/webm") return webmDurationSeconds(upload.bytes);
  if (upload.mime === "video/mp4" || upload.mime === "video/quicktime") return mp4DurationSeconds(upload.bytes);
  return 0;
}
