import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {handleRecipeRequest} from '../worker-api.mjs';
import {createLimiter,modelConfig} from '../model-config.mjs';
import {createServer} from '../server.mjs';
import {buildRecipeData} from '../public/recipe-request.js';
import {requestAIRecipes} from '../public/ai-client.js';
const env={AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'unit-test-only-key-not-a-real-credential'};
const data={foods:['鸡蛋','番茄'],tools:['炒锅'],seasonings:['油','盐'],time:30,servings:1,avoid:'',priority:'番茄',aiConsent:true};
const recipe={name:'番茄炒蛋',foods:['番茄','鸡蛋'],tools:['炒锅'],seasonings:['油','盐'],time:15,amounts:[{name:'番茄',value:150,unit:'克'},{name:'鸡蛋',value:2,unit:'个'}],seasoningAmounts:[{name:'油',value:5,unit:'毫升'},{name:'盐',value:1,unit:'克'}],steps:['番茄切块，鸡蛋打散。','炒锅加油，中火炒熟番茄后加入鸡蛋。','加入盐，炒至鸡蛋完全凝固、整体热透。'],note:'参考用量，按存量调整。'};
const response=(recipes=[recipe],finish='stop')=>Response.json({choices:[{finish_reason:finish,message:{content:JSON.stringify({recipes})}}]});
const request=(body=data,headers={})=>new Request('https://kitchen.test/api/recipes',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://kitchen.test',...headers},body:JSON.stringify(body)});
const run=(req,fetcher,config=env)=>handleRecipeRequest(req,config,fetcher,{limiter:createLimiter()});
test('DeepSeek receives exactly the previewed cooking facts and two messages, never visitor headers',async()=>{
 let sent;
 const fetcher=async(url,options)=>{sent={url,options,body:JSON.parse(options.body)};return response()};
 const req=request(data,{Cookie:'session=private-test-value',Authorization:'Bearer visitor-test-token','oai-authenticated-user-email':'visitor@example.test','oai-authenticated-user-id':'private-user-test','X-Forwarded-For':'192.0.2.10',Referer:'https://private.test/chat'});
 const r=await run(req,fetcher);assert.equal(r.status,200);
 assert.equal(sent.url,'https://api.deepseek.com/chat/completions');assert.equal(sent.options.redirect,'error');
 assert.deepEqual(Object.keys(sent.options.headers).sort(),['Authorization','Content-Type']);
 assert.equal(sent.options.headers.Authorization,`Bearer ${env.DEEPSEEK_API_KEY}`);
 assert.equal(sent.body.messages.length,2);assert.deepEqual(sent.body.messages.map(x=>x.role),['system','user']);
 assert.deepEqual(JSON.parse(sent.body.messages[1].content),buildRecipeData(data));
 assert.ok(!sent.options.body.includes('private-test'));assert.ok(!sent.options.body.includes('example.test'));
 assert.equal(sent.body.model,'deepseek-flash');assert.deepEqual(sent.body.thinking,{type:'disabled'});assert.equal(sent.body.max_tokens,2400);
 for(const key of ['store','tools','user','metadata','previous_response_id'])assert.ok(!(key in sent.body));
 const out=await r.json();assert.equal(out.provider,'DeepSeek');assert.equal(out.recipes[0].source,'ai');assert.equal(out.recipes[0].illustrationId,'local-1');
 assert.ok(!JSON.stringify(out).includes(env.DEEPSEEK_API_KEY));
});
test('unknown keys, raw private descriptions, unsupported foods, health text and missing consent make no model call',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return response()};
 for(const body of [{...data,messages:[{role:'user',content:'private conversation'}]},{...data,memory:'private memory'},{...data,apiKey:'private key'},{...data,foods:['鸡蛋 联系visitor@example.test']},{...data,avoid:'我的手机号 13800000000'},{...data,avoid:'花生过敏'},{...data,aiConsent:false},{...data,aiConsent:undefined}]){
  assert.equal((await run(request(body),fetcher)).status,400);
 }
 assert.equal(calls,0);
});
test('client projection strips all non-cooking input and refuses to POST before consent',async()=>{
 const raw={...data,foods:['两个鸡蛋 姓名测试','150克西红柿'],history:'private conversation',email:'visitor@example.test',apiKey:'not-for-browser'};
 const projected=buildRecipeData(raw);assert.deepEqual(projected.foods,['鸡蛋','番茄']);
 assert.ok(!JSON.stringify(projected).includes('private'));assert.ok(!JSON.stringify(projected).includes('example.test'));
 let calls=0;
 await assert.rejects(()=>requestAIRecipes({...raw,aiConsent:false},async()=>{calls++}),/确认/);assert.equal(calls,0);
 await requestAIRecipes(raw,async(url,options)=>{calls++;assert.equal(url,'/api/recipes');assert.deepEqual(JSON.parse(options.body),{...projected,aiConsent:true});assert.equal(options.mode,'same-origin');assert.equal(options.referrerPolicy,'no-referrer');return Response.json({provider:'DeepSeek',recipes:[]})});
 assert.equal(calls,1);
});
test('cross-origin, wrong content type and oversized requests are rejected before model calls',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return response()};
 assert.equal((await run(request(data,{Origin:'https://other.test'}),fetcher)).status,403);
 assert.equal((await run(request(data,{'Content-Type':'text/plain'}),fetcher)).status,415);
 const large=new Request('https://kitchen.test/api/recipes',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(8193)});
 assert.equal((await run(large,fetcher)).status,413);assert.equal(calls,0);
});
test('no key means no call; provider must be selected explicitly and never silently falls back',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return response()};
 assert.equal((await run(request(),fetcher,{})).status,503);
 assert.equal((await run(request(),fetcher,{OPENAI_API_KEY:'unit-test-openai-only'})).status,503);
 const status=await(await handleRecipeRequest(new Request('https://kitchen.test/api/status'))).json();assert.equal(status.ai,false);assert.equal(status.provider,'DeepSeek');
 assert.equal(modelConfig({AI_PROVIDER:'openai',OPENAI_API_KEY:'unit-test-openai-only'}).provider,'OpenAI');
 assert.equal(calls,0);
});
test('upstream errors, incomplete JSON and injected ingredients never expose raw provider content or retry',async()=>{
 let calls=0;
 let r=await run(request(),async()=>{calls++;return new Response(`private diagnostics ${env.DEEPSEEK_API_KEY}`,{status:401})});
 assert.equal(r.status,502);assert.ok(!(await r.text()).includes(env.DEEPSEEK_API_KEY));assert.equal(calls,1);
 r=await run(request(),async()=>response([recipe],'length'));assert.equal(r.status,502);
 r=await run(request(),async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'not JSON'}}]}));assert.equal(r.status,502);
 const bad={...recipe,steps:[...recipe.steps.slice(0,2),'加入葱和蒜，再用微波炉热透。']};
 r=await run(request(),async()=>response([bad]));assert.deepEqual((await r.json()).recipes,[]);
 r=await run(request({...data,avoid:'鸡蛋'}),async()=>response());assert.deepEqual((await r.json()).recipes,[]);
});
test('new dishes retain amounts for the requested people and do not borrow unrelated dish art',async()=>{
 const dish={...recipe,name:'番茄鸡蛋焖菜',amounts:[{name:'番茄',value:450,unit:'克'},{name:'鸡蛋',value:6,unit:'个'}]};
 const r=await run(request({...data,servings:3}),async()=>response([dish]));const out=(await r.json()).recipes[0];
 assert.equal(out.baseServings,3);assert.equal(out.amounts[0].value,450);assert.equal(out.illustrationId,null);
});
test('one active request and per-instance request cap bound repeated calls',async()=>{
 let now=0;const limiter=createLimiter({now:()=>now,max:2});
 const first=limiter.acquire();assert.equal(limiter.acquire(),null);first();
 const second=limiter.acquire();assert.ok(second);second();assert.equal(limiter.acquire(),null);
 now=60001;assert.ok(limiter.acquire());
});
test('local server uses the same privacy-filtered DeepSeek implementation',async()=>{
 let sent;const server=createServer({env,modelFetch:async(url,options)=>{sent={url,options};return response()}});server.listen(0,'127.0.0.1');await once(server,'listening');
 try{const root=`http://127.0.0.1:${server.address().port}`;
  const r=await fetch(root+'/api/recipes',{method:'POST',headers:{'Content-Type':'application/json',Origin:root,Cookie:'private-local-cookie'},body:JSON.stringify(data)});
  assert.equal(r.status,200);assert.equal((await r.json()).provider,'DeepSeek');assert.ok(!JSON.stringify(sent.options.headers).includes('private-local-cookie'));
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
