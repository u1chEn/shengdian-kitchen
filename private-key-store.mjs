// Server-only encrypted credentials. No plaintext credentials or user identity
// are stored in object names, logs, responses, or client storage.
const encoder=new TextEncoder(), decoder=new TextDecoder();
const reply=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const encode=bytes=>btoa(String.fromCharCode(...bytes));
const decode=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const identity=request=>request.headers.get('oai-authenticated-user-id')?.trim();
export function keyStorageAvailable(env){return Boolean(env.BUCKET&&env.SETTINGS_ENCRYPTION_KEY)}
async function keys(env){
 const material=decode(env.SETTINGS_ENCRYPTION_KEY);
 if(material.length!==32)throw Error('Unavailable');
 return {
  aes:await crypto.subtle.importKey('raw',material,'AES-GCM',false,['encrypt','decrypt']),
  hmac:await crypto.subtle.importKey('raw',material,{name:'HMAC',hash:'SHA-256'},false,['sign'])
 };
}
async function record(request,env){
 const id=identity(request);if(!id)throw Error('Unauthorized');
 const key=await keys(env);
 const hash=new Uint8Array(await crypto.subtle.sign('HMAC',key.hmac,encoder.encode('deepseek:'+id)));
 return {key,name:'private-api-keys/v1/'+Array.from(hash,x=>x.toString(16).padStart(2,'0')).join('')};
}
export async function getPersonalKey(request,env){
 if(!keyStorageAvailable(env)||!identity(request))return '';
 const {key,name}=await record(request,env),obj=await env.BUCKET.get(name);
 if(!obj)return '';
 if(obj.size>4096)throw Error('Unavailable');
 const data=JSON.parse(await obj.text());
 if(data.version!==1)throw Error('Unavailable');
 const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(data.iv),additionalData:encoder.encode(name)},key.aes,decode(data.ciphertext));
 return decoder.decode(plaintext);
}
export async function handleKeySettings(request,env){
 if(!identity(request))return reply(401,{error:'请先使用你的网站账号登录。'});
 if(!keyStorageAvailable(env))return reply(503,{error:'安全配置暂不可用，请稍后再试。'});
 const method=request.method;
 if(!['GET','PUT','DELETE'].includes(method))return reply(405,{error:'Method not allowed'});
 // All writes require a same-origin JSON fetch; no HTML form or cross-site write.
 if(method!=='GET'&&(request.headers.get('Origin')!==new URL(request.url).origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))return reply(403,{error:'请从本站配置页面操作。'});
 try{
  if(method==='GET')return reply(200,{configured:Boolean(await getPersonalKey(request,env)),storage:'server-encrypted'});
  const {key,name}=await record(request,env);
  if(method==='DELETE'){await env.BUCKET.delete(name);return reply(200,{configured:false})}
  if(!/^application\/json\b/i.test(request.headers.get('Content-Type')||''))return reply(415,{error:'JSON required'});
  const reader=request.body?.getReader();if(!reader)return reply(400,{error:'请输入密钥。'});
  let size=0,parts=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return reply(413,{error:'密钥格式无效。'})}parts.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}
  let data;try{data=JSON.parse(decoder.decode(bytes))}catch{return reply(400,{error:'密钥格式无效。'})}
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==1||typeof data.apiKey!=='string'||!/^sk-[A-Za-z0-9_-]{16,240}$/.test(data.apiKey.trim()))return reply(400,{error:'请输入 DeepSeek 平台创建的完整 API Key。'});
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(name)},key.aes,encoder.encode(data.apiKey.trim()));
  await env.BUCKET.put(name,JSON.stringify({version:1,iv:encode(iv),ciphertext:encode(new Uint8Array(ciphertext))}),{httpMetadata:{contentType:'application/json'}});
  return reply(200,{configured:true});
 }catch{return reply(503,{error:'未能完成密钥配置，请稍后再试。'})}
}
