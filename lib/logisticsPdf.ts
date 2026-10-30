export function pdfFromPages(images:Uint8Array[]){
 const encoder=new TextEncoder(),parts:Uint8Array[]=[],offsets:number[]=[0];let length=0;
 const push=(value:string|Uint8Array)=>{const bytes=typeof value==="string"?encoder.encode(value):value;parts.push(bytes);length+=bytes.length;};
 const object=(id:number,body:()=>void)=>{offsets[id]=length;push(`${id} 0 obj\n`);body();push("\nendobj\n");};
 push("%PDF-1.4\n%âãÏÓ\n");object(1,()=>push("<< /Type /Catalog /Pages 2 0 R >>"));object(2,()=>push(`<< /Type /Pages /Kids [${images.map((_,i)=>`${3+i*3} 0 R`).join(" ")}] /Count ${images.length} >>`));
 images.forEach((image,index)=>{const id=3+index*3;object(id,()=>push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`));object(id+1,()=>{push(`<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`);push(image);push("\nendstream");});const content=encoder.encode("q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n");object(id+2,()=>{push(`<< /Length ${content.length} >>\nstream\n`);push(content);push("endstream");});});
 const count=images.length*3+3,xref=length;push(`xref\n0 ${count}\n0000000000 65535 f \n`);for(let i=1;i<count;i++)push(`${String(offsets[i]).padStart(10,"0")} 00000 n \n`);push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);const result=new Uint8Array(length);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
}
