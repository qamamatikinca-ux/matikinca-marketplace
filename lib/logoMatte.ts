export function logoTensor(rgba: Uint8ClampedArray) {
 const count=rgba.length/4, tensor=new Float32Array(count*3);
 let max=1;for(let i=0;i<rgba.length;i+=4)max=Math.max(max,rgba[i],rgba[i+1],rgba[i+2]);
 const mean=[.485,.456,.406],std=[.229,.224,.225];
 for(let i=0;i<count;i++)for(let c=0;c<3;c++)tensor[c*count+i]=(rgba[i*4+c]/max-mean[c])/std[c];
 return tensor;
}
export function edgeLogoMask(data: Uint8ClampedArray,width:number,height:number): Uint8ClampedArray|null {
 const samples:number[]=[];
 for(let x=0;x<width;x++){samples.push(x,(height-1)*width+x);}for(let y=1;y<height-1;y++){samples.push(y*width,y*width+width-1);}
 const bins=new Map<number,number[]>();
 for(const i of samples){const key=(data[i*4]>>4)*256+(data[i*4+1]>>4)*16+(data[i*4+2]>>4);const bin=bins.get(key)||[];bin.push(i);bins.set(key,bin);}
 const dominant=[...bins.values()].sort((a,b)=>b.length-a.length)[0];if(!dominant||dominant.length<samples.length*.6)return null;
 const bg=[0,1,2].map(c=>dominant.reduce((sum,i)=>sum+data[i*4+c],0)/dominant.length);
 const alpha=new Uint8ClampedArray(width*height).fill(255),seen=new Uint8Array(width*height),queue=new Int32Array(width*height);let head=0,tail=0;
 const add=(i:number)=>{if(seen[i])return;seen[i]=1;const distance=Math.hypot(data[i*4]-bg[0],data[i*4+1]-bg[1],data[i*4+2]-bg[2]);if(distance>42)return;alpha[i]=Math.round(255*Math.max(0,(distance-15)/27));queue[tail++]=i;};
 samples.forEach(add);
 while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);if(x)add(i-1);if(x<width-1)add(i+1);if(y)add(i-width);if(y<height-1)add(i+width);}
 return alpha;
}
export function applyLogoMask(original: Uint8ClampedArray,mask:ArrayLike<number>,width:number,height:number): Uint8ClampedArray {
 if(mask.length!==320*320)throw Error('The logo outline was incomplete.');
 let min=Infinity,max=-Infinity;for(let i=0;i<mask.length;i++){if(!Number.isFinite(mask[i]))throw Error('The logo outline was invalid.');min=Math.min(min,mask[i]);max=Math.max(max,mask[i]);}
 if(max-min<.0001)throw Error('No clear logo outline found. Refine the preview or use the original.');
 const edge=edgeLogoMask(original,width,height),result=new Uint8ClampedArray(original);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x,m=mask[Math.min(319,Math.floor(y/height*320))*320+Math.min(319,Math.floor(x/width*320))];const alpha=edge?edge[i]/255:Math.max(0,Math.min(1,(m-min)/(max-min)));result[i*4+3]=Math.round(original[i*4+3]*alpha);}
 return result;
}
