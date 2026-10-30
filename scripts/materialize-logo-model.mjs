import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory='public/models/logo-v1';
const hash='309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8';
await mkdir(directory,{recursive:true});
let model;try{model=await readFile(`${directory}/u2netp.onnx`);}catch{}
if(!model||createHash('sha256').update(model).digest('hex')!==hash){
 const response=await fetch('https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',{signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw Error('Logo model download failed');
 model=Buffer.from(await response.arrayBuffer());
 if(createHash('sha256').update(model).digest('hex')!==hash)throw Error('Logo model checksum failed');
 await writeFile(`${directory}/u2netp.onnx`,model);
}
for(const file of ['ort.wasm.min.js','ort-wasm-simd-threaded.wasm','ort-wasm-simd-threaded.mjs'])await copyFile(`node_modules/onnxruntime-web/dist/${file}`,`${directory}/${file}`);
await copyFile('licenses/ONNXRuntime-LICENSE.txt',`${directory}/ONNX-LICENSE.txt`);
await copyFile('licenses/U2Net-LICENSE.txt',`${directory}/U2Net-LICENSE.txt`);
console.log('Materialized verified on-device logo model and pinned WASM runtime.');
