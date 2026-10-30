"use client";

import LoadLinkIcon from "@/components/LoadLinkIcon";

export default function DocumentUpload({ label, required = false, fileName, disabled = false, accept = "application/pdf,image/jpeg,image/png", hint = "Choose PDF, JPG or PNG", status, progress, onFile }: {
 label: string; required?: boolean; fileName?: string; disabled?: boolean; accept?: string; hint?: string; status?: string; progress?: number; onFile: (file: File | null) => void;
}) {
 return <label className={`ll-document-upload relative flex min-h-24 items-center gap-3 overflow-hidden rounded-2xl border p-4 focus-within:border-[#f6b800] ${disabled ? "opacity-60" : "cursor-pointer hover:border-[#f6b800]"}`}>
  <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${fileName ? "bg-[#f6b800] text-black" : "border border-current/20 opacity-50"}`}><LoadLinkIcon name={fileName ? "check" : "paperclip"} size={17} /></span>
  <span className="min-w-0 flex-1"><strong className="block text-sm font-bold">{label}</strong><span className="mt-1 block truncate text-xs leading-5 opacity-65">{status || fileName || hint}</span></span>
  <span className="shrink-0 text-right"><span className={`block text-[9px] font-bold uppercase tracking-wide ${fileName ? "text-[#b88600]" : "opacity-50"}`}>{fileName ? "Added" : required ? "Required" : "Optional"}</span><span className="mt-1 block text-xs font-semibold">{status ? "Uploading" : fileName ? "Replace" : "Add"}</span></span>
  <input disabled={disabled} required={required && !fileName} type="file" aria-label={label} accept={accept} onChange={event => { const file = event.currentTarget.files?.[0] || null; if (file) { event.currentTarget.value = ""; onFile(file); } }} className="sr-only" />
  {progress !== undefined ? <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-current/10"><span className="block h-full bg-[#f6b800] transition-[width] duration-150" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></span> : null}
 </label>;
}
