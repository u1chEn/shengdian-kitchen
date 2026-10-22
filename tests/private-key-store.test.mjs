import test from 'node:test';
import assert from 'node:assert/strict';
import {getPersonalKey,handleKeySettings} from '../private-key-store.mjs';
import {handleRecipeRequest} from '../worker-api.mjs';
const fakeKey='sk-unit-test-only-not-a-real-deepseek-key';
function setup(){
 const objects=new Map();
 const env={SETTINGS_ENCRYPTION_KEY:btoa('x'.repeat(32)),DEEPSEEK_API_KEY:'must-never-fallback-to-owners-key',BUCKET:{
  async get(name){const value=objects.get(name);return value?{size:value.length,text:async()=>value}:null},
  async put(name,value){objects.set(name,value)},async delete(name){objects.delete(name)}
 }};
 return {objects,env};
}
function req(method='GET',body,id='owner-test-id',headers={}){
 return new Request('https://kitchen.test/api/settings/deepseek',{method,headers:{...(id?{'oai-authenticated-user-id':id}:{}),Origin:'https://kitchen.test','Content-Type':'application/json',...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
}
test('saved key is ciphertext, bound to identity, never returned; replace and delete work',async()=>{
 const {env,objects}=setup();
 let r=await handleKeySettings(req('PUT',{apiKey:fakeKey}),env);assert.equal(r.status,200);assert.deepEqual(await r.json(),{configured:true});
 const [[name,value]]=objects;assert.ok(!name.includes('owner-test-id'));assert.ok(!value.includes(fakeKey));assert.ok(!value.includes('owner-test-id'));
 assert.equal(await getPersonalKey(req(),env),fakeKey);
 assert.equal(await getPersonalKey(req('GET',undefined,'another-user'),env),'');
 r=await handleKeySettings(req(),env);assert.deepEqual(await r.json(),{configured:true,storage:'server-encrypted'});assert.equal(r.headers.get('cache-control'),'no-store');
 await handleKeySettings(req('PUT',{apiKey:fakeKey+'-replacement'}),env);assert.equal(objects.size,1);assert.equal(await getPersonalKey(req(),env),fakeKey+'-replacement');
 await handleKeySettings(req('DELETE'),env);assert.equal(objects.size,0);assert.equal(await getPersonalKey(req(),env),'');
});
test('identity, same-origin, strict body validation, and size bounds guard writes',async()=>{
 const {env,objects}=setup();
 for(const [request,status]of [
  [req('PUT',{apiKey:fakeKey},null),401],
  [req('PUT',{apiKey:fakeKey},'owner-test-id',{Origin:'https://evil.test'}),403],
  [req('PUT',{apiKey:fakeKey},'owner-test-id',{Origin:''}),403],
  [req('DELETE',undefined,'owner-test-id',{'Sec-Fetch-Site':'cross-site'}),403],
  [req('PUT',{apiKey:fakeKey},'owner-test-id',{'Content-Type':'text/plain'}),415],
  [req('PUT',{apiKey:fakeKey,messages:['private']}),400],
  [req('PUT',{apiKey:'private personal text'}),400],
  [req('PUT','x'.repeat(1025)),413],
  [req('PUT','{broken'),400]
 ]){const r=await handleKeySettings(request,env);assert.equal(r.status,status);assert.ok(!(await r.text()).includes(fakeKey))}
 assert.equal(objects.size,0);
});
test('ciphertext authentication rejects tampering, record swaps, and changed wrapping key',async()=>{
 const {env,objects}=setup();
 await handleKeySettings(req('PUT',{apiKey:fakeKey}),env);
 const ownerRecord=[...objects.entries()][0];
 await handleKeySettings(req('PUT',{apiKey:fakeKey+'-other'},'another-user'),env);
 const otherRecord=[...objects.entries()][1];
 objects.set(ownerRecord[0],otherRecord[1]);await assert.rejects(getPersonalKey(req(),env));
 objects.set(ownerRecord[0],ownerRecord[1]);assert.equal(await getPersonalKey(req(),{...env,SETTINGS_ENCRYPTION_KEY:btoa('z'.repeat(32))}),'');
 const broken=JSON.parse(ownerRecord[1]);broken.ciphertext='AAAA';objects.set(ownerRecord[0],JSON.stringify(broken));await assert.rejects(getPersonalKey(req(),env));
});
test('settings save/status/delete never contact model; no key means no owner billing fallback',async()=>{
 const {env}=setup();let calls=0;const fetcher=async()=>{calls++;throw Error('Should not call')};
 await handleRecipeRequest(req('PUT',{apiKey:fakeKey}),env,fetcher);
 let r=await handleRecipeRequest(new Request('https://kitchen.test/api/status',{headers:{'oai-authenticated-user-id':'owner-test-id'}}),env,fetcher);assert.equal((await r.json()).ai,true);
 r=await handleRecipeRequest(new Request('https://kitchen.test/api/status',{headers:{'oai-authenticated-user-id':'another-user'}}),env,fetcher);assert.equal((await r.json()).ai,false);
 r=await handleRecipeRequest(new Request('https://kitchen.test/api/recipes',{method:'POST',headers:{Origin:'https://kitchen.test','Content-Type':'application/json','oai-authenticated-user-id':'another-user'},body:'{}'}),env,fetcher);assert.equal(r.status,503);
 await handleRecipeRequest(req('DELETE'),env,fetcher);assert.equal(calls,0);
 r=await handleRecipeRequest(new Request('https://kitchen.test/api/status'),{...env,SETTINGS_ENCRYPTION_KEY:''},fetcher);assert.equal(r.status,503);
});
test('personal key only reaches fixed DeepSeek Authorization, without visitor identity',async()=>{
 const {env}=setup();await handleKeySettings(req('PUT',{apiKey:fakeKey}),env);let sent;
 const request=new Request('https://kitchen.test/api/recipes',{method:'POST',headers:{Origin:'https://kitchen.test','Content-Type':'application/json','oai-authenticated-user-id':'owner-test-id',Cookie:'private-cookie'},body:JSON.stringify({foods:['鸡蛋'],tools:['炒锅'],seasonings:['油','盐'],time:30,servings:1,avoid:'',priority:'',aiConsent:true})});
 const r=await handleRecipeRequest(request,env,async(url,options)=>{sent={url,options};return Response.json({choices:[{finish_reason:'stop',message:{content:'{"recipes":[]}'}}]})});
 assert.equal(r.status,200);assert.equal(sent.url,'https://api.deepseek.com/chat/completions');assert.equal(sent.options.headers.Authorization,'Bearer '+fakeKey);
 assert.deepEqual(Object.keys(sent.options.headers).sort(),['Authorization','Content-Type']);assert.ok(!sent.options.body.includes(fakeKey));assert.ok(!sent.options.body.includes('owner-test-id'));assert.ok(!sent.options.body.includes('private-cookie'));assert.ok(!(await r.text()).includes(fakeKey));
});
