const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
function setup(){
 const timers=[]; let authCallback; let rows={profiles:{data:{avatar_url:'portrait.jpg',full_name:'Driver'}},driver_profiles:{data:{id:'driver1',status:'pending'}},dealership_profiles:{data:null}};
 const sb={auth:{onAuthStateChange(fn){authCallback=fn},getUser:async()=>({data:{user:{id:'one'}},error:null})},from(table){return {select(){return this},eq(){return this},maybeSingle(){return Promise.resolve(rows[table])}}}};
 const module={exports:{}};
 const requireMock=name=>name==='react'?{useSyncExternalStore:(_sub,get)=>get()}:{isSupabaseConfigured:true,supabase:sb};
 new Function('require','module','exports','window',ts.transpileModule(fs.readFileSync('lib/loadLinkAccountStore.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(requireMock,module,module.exports,{setTimeout:fn=>timers.push(fn),addEventListener(){}});
 const api=module.exports;api.useLoadLinkAccount();
 return {api,auth(user){authCallback('SIGNED_IN',user?{user}:null);timers.shift()()},fail(){rows={profiles:{error:{}},driver_profiles:{error:{}},dealership_profiles:{error:{}}}}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('same-account refresh keeps portrait visible and retains it on a query error',async()=>{
 const s=setup();s.auth({id:'one'});await settle();assert.equal(s.api.useLoadLinkAccount().profile.avatar_url,'portrait.jpg');
 s.fail();s.auth({id:'one'});assert.equal(s.api.useLoadLinkAccount().ready,true);assert.equal(s.api.useLoadLinkAccount().profile.avatar_url,'portrait.jpg');await settle();assert.equal(s.api.useLoadLinkAccount().profile.avatar_url,'portrait.jpg');
});
test('sign out clears profile and another account never inherits its portrait',async()=>{
 const s=setup();s.auth({id:'one'});await settle();s.auth(null);assert.equal(s.api.useLoadLinkAccount().user,null);assert.equal(s.api.useLoadLinkAccount().profile.avatar_url,'');s.fail();s.auth({id:'two'});await settle();assert.equal(s.api.useLoadLinkAccount().profile.avatar_url,'');
});
