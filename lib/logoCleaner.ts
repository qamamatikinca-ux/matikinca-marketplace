import { applyLogoMask, logoTensor } from "./logoMatte";
export async function openLogo(file:File) {
 if(file.size>12*1024*1024||!["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("Choose a JPG, PNG or WEBP logo up to 12 MB.");
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;try { await image.decode(); } catch { throw Error("The logo image could not open. Try another JPG, PNG or WEBP copy."); }
  const scale=Math.min(1,1000/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw Error("Image tools are unavailable in this browser.");ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return {canvas,image:ctx.getImageData(0,0,canvas.width,canvas.height)};
 }finally{URL.revokeObjectURL(url);}
}
export async function traceLogo(canvas:HTMLCanvasElement,image:ImageData,onPhase:(value:string)=>void,signal?:AbortSignal) {
 for(let i=3;i<image.data.length;i+=4)if(image.data[i]<250)return image;
 const resized=document.createElement("canvas");resized.width=320;resized.height=320;
 const ctx=resized.getContext("2d",{willReadFrequently:true});if(!ctx)throw Error("Image tools are unavailable.");ctx.drawImage(canvas,0,0,320,320);
 const tensor=logoTensor(ctx.getImageData(0,0,320,320).data);
 if(signal?.aborted)throw Error("Cancelled");
 const worker=new Worker("/workers/logo-matte.js");
 let timer: ReturnType<typeof setTimeout> | undefined;
 let cancel: (()=>void) | undefined;
 try{
  const mask=await new Promise<Float32Array>((resolve,reject)=>{
   cancel=()=>{worker.terminate();reject(Error("Cancelled"));};
   signal?.addEventListener("abort",cancel,{once:true});
   timer=setTimeout(()=>reject(Error("Automatic removal took too long. Refine the preview or retry.")),45000);
   worker.onerror=()=>{clearTimeout(timer);reject(Error("Automatic removal could not start. Refine the preview or retry."));};
   worker.onmessage=event=>{if(event.data.phase)onPhase(event.data.phase);else{clearTimeout(timer);if(event.data.error)reject(Error("Automatic removal could not finish. Refine the preview or retry."));else resolve(event.data.mask);}};
   worker.postMessage({tensor},[tensor.buffer]);
  });
  const output = new Uint8ClampedArray(applyLogoMask(image.data,mask,image.width,image.height));
  let visible=0;for(let i=3;i<output.length;i+=4)if(output[i]>30)visible++;
  if(visible<image.width*image.height*.002)throw Error("No clear logo outline found.");
  return new ImageData(output,image.width,image.height);
 }finally{clearTimeout(timer);if(cancel)signal?.removeEventListener("abort",cancel);worker.terminate();}
}
