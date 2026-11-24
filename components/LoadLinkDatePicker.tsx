"use client";
import {useMemo,useState} from "react";
import LoadLinkIcon from "@/components/LoadLinkIcon";

function toLocalDate(value:string){
 const [year,month,day]=value.split("-").map(Number);
 return new Date(year,Math.max(0,month-1),day||1);
}
function dateValue(date:Date){
 const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,"0"),day=String(date.getDate()).padStart(2,"0");
 return `${year}-${month}-${day}`;
}
export default function LoadLinkDatePicker({value,onChange,min,darkMode,ariaLabel}:{value:string;onChange:(value:string)=>void;min?:string;darkMode:boolean;ariaLabel:string}){
 const minValue=min||"0000-01-01";
 const [open,setOpen]=useState(false);
 const [selected,setSelected]=useState(value||"");
 const [month,setMonth]=useState(()=>{const start=value?toLocalDate(value):new Date();return new Date(start.getFullYear(),start.getMonth(),1)});
 const days=useMemo(()=>{
  const first=new Date(month.getFullYear(),month.getMonth(),1);
  const leading=(first.getDay()+6)%7;
  const count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  return Array.from({length:leading+count},(_,index)=>index<leading?null:new Date(month.getFullYear(),month.getMonth(),index-leading+1));
 },[month]);
 const text=value?new Intl.DateTimeFormat("en-ZA",{day:"numeric",month:"long",year:"numeric"}).format(toLocalDate(value)):"Choose a date";
 const panel=darkMode?"border-white/15 bg-[#111] text-white":"border-black/10 bg-white text-black";
 const soft=darkMode?"border-white/15 bg-white/[.04]":"border-black/10 bg-[#fafafa]";
 function toggle(){
  if(open){setOpen(false);return}
  const next=value||dateValue(new Date());
  setSelected(next);
  const d=toLocalDate(next);
  setMonth(new Date(d.getFullYear(),d.getMonth(),1));
  setOpen(true);
 }
 function confirm(){
  if(!selected||selected<minValue)return;
  onChange(selected);
  setOpen(false);
 }
 return <div className="min-w-0" data-loadlink-inline-date-picker="true">
  <button type="button" aria-label={ariaLabel} aria-expanded={open} onClick={toggle} className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-[14px] border px-4 text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#f6b800] ${panel}`}>
   <span className="min-w-0 truncate">{text}</span>
   <LoadLinkIcon name="calendar" size={18} className="shrink-0 text-[#bc8a00]"/>
  </button>
  {open?<section aria-label={ariaLabel} className={`mt-3 w-full min-w-0 rounded-[18px] border p-3 sm:p-4 ${panel}`}>
   <div className="flex items-center justify-between gap-2">
    <button type="button" aria-label="Previous month" onClick={()=>setMonth(current=>new Date(current.getFullYear(),current.getMonth()-1,1))} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${soft}`}><LoadLinkIcon name="chevronLeft" size={17}/></button>
    <h3 className="text-center text-sm font-black">{new Intl.DateTimeFormat("en-ZA",{month:"long",year:"numeric"}).format(month)}</h3>
    <button type="button" aria-label="Next month" onClick={()=>setMonth(current=>new Date(current.getFullYear(),current.getMonth()+1,1))} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${soft}`}><LoadLinkIcon name="chevronRight" size={17}/></button>
   </div>
   <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase opacity-50">
    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day=><span className="py-1.5" key={day}>{day}</span>)}
   </div>
   <div className="grid grid-cols-7 gap-1">
    {days.map((day,index)=>{
      if(!day)return <span key={`empty-${index}`} className="h-10"/>;
      const next=dateValue(day);
      return <button key={next} type="button" disabled={next<minValue} aria-pressed={selected===next}
       onClick={()=>setSelected(next)}
       className={`h-10 min-w-0 rounded-lg text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#f6b800] disabled:cursor-not-allowed disabled:opacity-20 ${selected===next?"bg-[#f6b800] text-black":darkMode?"bg-white/[.04] hover:bg-white/[.10]":"bg-[#f6f6f6] hover:bg-[#eee]"}`}>{day.getDate()}</button>;
    })}
   </div>
   <div className="mt-3 flex gap-2 border-t border-current/10 pt-3">
    <button type="button" onClick={()=>{const now=dateValue(new Date());setSelected(now);setMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1))}} className={`min-h-11 flex-1 rounded-xl border px-2 text-xs font-bold ${soft}`}>Today</button>
    <button type="button" disabled={!selected||selected<minValue} onClick={confirm} className="min-h-11 flex-[1.5] rounded-xl bg-[#f6b800] px-3 text-xs font-black text-black disabled:opacity-40">Use this date</button>
   </div>
  </section>:null}
 </div>;
}
