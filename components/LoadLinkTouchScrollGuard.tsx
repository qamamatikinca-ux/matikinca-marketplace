"use client";
import { useEffect } from "react";
const MENU='[data-loadlink-choice-sheet="true"],[data-loadlink-datalist-menu="true"],[role="listbox"]';
export default function LoadLinkTouchScrollGuard(){
  useEffect(()=>{let id=-1,x=0,y=0,moved=false,suppress=0;const inside=(t:EventTarget|null)=>t instanceof Element?t.closest(MENU):null;
    const down=(e:PointerEvent)=>{if(!inside(e.target))return;id=e.pointerId;x=e.clientX;y=e.clientY;moved=false;};
    const move=(e:PointerEvent)=>{if(e.pointerId!==id||!inside(e.target))return;if(Math.hypot(e.clientX-x,e.clientY-y)>9)moved=true;};
    const end=(e:PointerEvent)=>{if(e.pointerId!==id)return;if(moved)suppress=performance.now()+450;id=-1;};
    const scroll=(e:Event)=>{if(!inside(e.target))return;moved=true;suppress=performance.now()+450;};
    const click=(e:MouseEvent)=>{if(!inside(e.target)||performance.now()>=suppress)return;e.preventDefault();e.stopImmediatePropagation();};
    document.addEventListener("pointerdown",down,true);document.addEventListener("pointermove",move,true);document.addEventListener("pointerup",end,true);document.addEventListener("pointercancel",end,true);document.addEventListener("scroll",scroll,true);document.addEventListener("click",click,true);
    return()=>{document.removeEventListener("pointerdown",down,true);document.removeEventListener("pointermove",move,true);document.removeEventListener("pointerup",end,true);document.removeEventListener("pointercancel",end,true);document.removeEventListener("scroll",scroll,true);document.removeEventListener("click",click,true);};
  },[]);return null;
}
