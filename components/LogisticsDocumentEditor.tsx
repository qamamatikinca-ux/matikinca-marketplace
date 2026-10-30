"use client";
import { useMemo, useState } from "react";
type Row={index:number;label:string;section:string;checkbox:boolean;multiline:boolean};
export default function LogisticsDocumentEditor({value,template,title,darkMode,onChange}:{value:string;template:string;title:string;darkMode:boolean;onChange:(value:string)=>void}){
 const [textMode,setTextMode]=useState(false);
 const rows=useMemo(()=>{
  const lines=template.split("\n"),rows:Row[]=[];let section="";
  const last=lines.findLastIndex(line=>Boolean(line.trim()));
  lines.forEach((line,index)=>{
   const check=line.match(/^\s*\[[ xX]\]\s+(.+)$/),field=line.match(/^([^:]{1,70}):\s*(.*)$/);
   if(check||field)rows.push({index,label:check?check[1]:field![1],section,checkbox:Boolean(check),multiline:index===last&&!check});
   else if(line.trim()&&index>0&&/^(?:\s*\n)*$/.test(lines[index-1]||"")&&lines[index+1]?.includes(":"))section=line.trim();
  });return rows;
 },[template]);
 const lines=value.split("\n");
 const compatible=rows.every(row=>row.checkbox?/^\s*\[[ xX]\]/.test(lines[row.index]||""):(lines[row.index]||"").startsWith(`${row.label}:`));
 const structured=rows.length>0&&compatible;
 const input=`mt-2 w-full rounded-xl border px-4 py-3 text-sm font-medium leading-6 outline-none focus:border-[#f6b800] ${darkMode?"border-white/15 bg-white/[.025] text-white":"border-black/12 bg-[#faf9f5] text-black"}`;
 function update(row:Row,next:string|boolean){const changed=[...lines];if(row.checkbox)changed[row.index]=`[${next?"x":" "}] ${row.label}`;else if(row.multiline){changed.splice(row.index,changed.length-row.index,`${row.label}: ${next}`);}else changed[row.index]=`${row.label}: ${String(next).replace(/\n/g," ")}`;onChange(changed.join("\n"));}
 return <div className="min-w-0"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-bold">{title} details</h3>{structured?<button type="button" onClick={()=>setTextMode(!textMode)} className="rounded-full border border-current/20 px-3 py-2 text-[11px] font-semibold">{textMode?"Use fields":"Edit as text"}</button>:null}</div>{!structured||textMode?<textarea aria-label={`${title} details`} value={value} onChange={event=>onChange(event.target.value)} maxLength={12000} rows={12} className={`${input} min-h-72 resize-y`} />:<div className="grid gap-4">{rows.map((row,index)=><div key={row.index}>{row.section&&rows[index-1]?.section!==row.section?<h4 className="mb-3 border-t border-current/10 pt-4 text-sm font-bold">{row.section}</h4>:null}{row.checkbox?<label className="flex cursor-pointer items-center gap-3 rounded-xl border border-current/10 px-4 py-3 text-sm"><input type="checkbox" checked={/\[[xX]\]/.test(lines[row.index])} onChange={event=>update(row,event.target.checked)} className="h-5 w-5 shrink-0 accent-[#f6b800]" />{row.label}</label>:<label className="block text-xs font-bold">{row.label}{row.multiline?<textarea rows={3} value={lines.slice(row.index).join("\n").slice(row.label.length+1).trimStart()} onChange={event=>update(row,event.target.value)} maxLength={4000} className={`${input} min-h-24 resize-y`} />:<input value={(lines[row.index]||"").slice(row.label.length+1).trimStart()} onChange={event=>update(row,event.target.value)} inputMode={/cell|phone/i.test(row.label)?"tel":undefined} maxLength={700} className={input} />}</label>}</div>)}</div>}</div>;
}
