const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(file,overrides={},globals={}){
 const mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',...Object.keys(globals),code)(name=>name in overrides?overrides[name]:require(name),mod,mod.exports,...Object.values(globals));return mod.exports;
}
const profile={id:'profile-one',user_id:'owner-one',full_name:'Test Driver',status:'pending',licence_code:'EC',years_experience:4,vehicle_types:['Trucks','Tankers'],route_experience:['Johannesburg to Durban'],languages:['English'],email:'fixture@example.test',phone:'0820000000'};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup({status='pending',photo='missing',name='Test Driver'}={}){
 let account={user:{id:'owner-one',is_anonymous:false}},state,dependencies,cleanup,runEffect;
 let imageResolve,requests=[];
 const imagePending=new Promise(resolve=>imageResolve=resolve);
 const hooks={useState(initial){if(state===undefined)state=initial;return[state,next=>state=typeof next==='function'?next(state):next]},useCallback(fn){return fn},useEffect(fn,deps){if(!dependencies||deps.some((v,i)=>v!==dependencies[i])){cleanup?.();dependencies=deps;runEffect=()=>cleanup=fn();}}};
 const events=new EventTarget();
 const fetchFixture=async(url)=>{requests.push(url);if(url.includes('portrait=1')){if(photo==='pending')return imagePending;if(photo==='error')throw Error('Image network failed');return new Response(null,{status:404})}return Response.json({profile:{...profile,status,full_name:name},documents:photo==='missing'?[]:[{document_type:'portrait'}]});};
 const hook=load('lib/useOwnDriverProfile.ts',{'react':hooks,'@/lib/loadLinkAccountStore':{useLoadLinkAccount:()=>account},'@/lib/supabaseClient':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:account.user?.id},access_token:'fixture-token'}}})}}}},{window:events,fetch:fetchFixture}).useOwnDriverProfile;
 function render(){const result=hook();const effect=runEffect;runEffect=null;effect?.();return result;}
 const presentation=load('lib/driverProfilePresentation.ts');
 const component=load('components/OwnDriverProfileCard.tsx',{'@/lib/useOwnDriverProfile':{useOwnDriverProfile:render},'@/lib/driverProfilePresentation':presentation,'@/components/LoadLinkImage':{default:props=>React.createElement('img',props),__esModule:true},'@/components/LoadLinkIcon':{default:()=>null,__esModule:true},'next/link':{default:({children,...props})=>React.createElement('a',props,children),__esModule:true},'./OwnDriverProfileCard.module.css':{}}).default;
 return {render,markup:()=>renderToStaticMarkup(React.createElement(component,{darkMode:false})),changeUser(user){account={user}},imageResolve,requests};
}
test('the banner renders saved profile details while its portrait is still loading',async()=>{
 const h=setup({photo:'pending'});h.render();await settle();
 assert.equal(h.render().profile.full_name,'Test Driver');
 assert.match(h.markup(),/Waiting for verification/);assert.match(h.markup(),/Test Driver/);assert.match(h.markup(),/Only visible to you/);
 h.imageResolve(new Response(null,{status:404}));await settle();assert.match(h.markup(),/Test Driver/);
});
test('missing or failed portraits cannot remove a driver application banner',async()=>{
 for(const photo of ['missing','error']){const h=setup({photo});h.render();await settle();assert.match(h.markup(),/Waiting for verification/);assert.match(h.markup(),/Johannesburg to Durban/);assert.match(h.markup(),/fixture@example.test/);}
});
test('submitted, reviewed and incomplete applications remain visible with the correct status',async()=>{
 for(const [status,label] of [['draft','Finish your profile'],['submitted','Waiting for verification'],['under_review','Waiting for verification'],['pending_review','Waiting for verification'],['rejected','Changes required'],['approved','Approved']]){
  const h=setup({status,name:status==='draft'?'':'Test Driver'});h.render();await settle();assert.match(h.markup(),new RegExp(label));assert.match(h.markup(),/Your driver profile/);
 }
});
test('signing out or switching accounts hides the previous driver banner immediately',async()=>{
 const h=setup();h.render();await settle();assert.match(h.markup(),/Test Driver/);
 h.changeUser(null);assert.equal(h.markup(),'');
 h.changeUser({id:'owner-two',is_anonymous:false});assert.equal(h.markup(),'');await settle();assert.doesNotMatch(h.markup(),/Test Driver|fixture@example.test/);
});
