/* Logo inference runs off the UI thread. Images stay on the user's device. */
let session;
self.onmessage=async event=>{
 try{
  if(!self.ort){self.postMessage({phase:'Preparing logo cleaner…'});importScripts('/models/logo-v1/ort.wasm.min.js');ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=new URL('/models/logo-v1/',self.location.origin).href;}
  if(!session){const response=await fetch('/models/logo-v1/u2netp.onnx',{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Cleaner could not load');session=await ort.InferenceSession.create(await response.arrayBuffer(),{executionProviders:['wasm'],graphOptimizationLevel:'all'});}
  self.postMessage({phase:'Tracing the logo outline…'});
  const tensor=new ort.Tensor('float32',event.data.tensor,[1,3,320,320]);
  const result=await session.run({[session.inputNames[0]]:tensor});
  const output=result[session.outputNames[0]],mask=new Float32Array(output.data);
  tensor.dispose();Object.values(result).forEach(value=>value.dispose());
  self.postMessage({mask},[mask.buffer]);
 }catch(error){self.postMessage({error:error instanceof Error?error.message:'Automatic tracing could not finish'});}
};
