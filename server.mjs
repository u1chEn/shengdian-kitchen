import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {handleRecipeRequest} from './worker-api.mjs';
import {createLimiter} from './model-config.mjs';
export {validInput} from './recipe-input.mjs';
const root=resolve(fileURLToPath(new URL('./public/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
export function createServer({modelFetch=fetch,env=process.env}={}){
 const limiter=createLimiter();
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
   if(url.pathname.startsWith('/api/')){
    const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);
    const parts=[];let size=0;
    if(!['GET','HEAD'].includes(req.method)){for await(const chunk of req){size+=chunk.length;if(size>8192){res.writeHead(413,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Input too large'}));return}parts.push(chunk)}}
    const request=new Request(url,{method:req.method,headers,...(parts.length?{body:Buffer.concat(parts)}:{})});
    const result=await handleRecipeRequest(request,env,modelFetch,{limiter});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
   }
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
   let path;try{path=decodeURIComponent(url.pathname)}catch{res.writeHead(400);res.end();return}
   const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep)&&file!==root){res.writeHead(403);res.end();return}
   try{const content=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content)}catch{res.writeHead(404);res.end('Not found')}
  }catch{if(!res.headersSent){res.writeHead(500,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Unexpected server error'}))}else res.end()}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||3000);createServer().listen(port,'0.0.0.0',()=>console.log(`剩点什么 → http://localhost:${port}（默认内置食谱，AI 需单独确认）`));
}
