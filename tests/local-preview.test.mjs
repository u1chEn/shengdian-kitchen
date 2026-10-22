import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {catalog} from '../public/catalog.js';
import {createServer} from '../server.mjs';
test('dependency-free preview serves the app, images and exported recipe data with valid types',async()=>{
 const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const root=`http://127.0.0.1:${server.address().port}`;
  for(const [path,type] of [['/','text/html'],['/assets/dishes-1.png','image/png'],['/recipe-catalog.json','application/json']]){
   const r=await fetch(root+path);assert.equal(r.status,200);assert.ok(r.headers.get('content-type').startsWith(type));await r.arrayBuffer();
  }
  const data=await(await fetch(root+'/recipe-catalog.json')).json();assert.equal(data.recipes.length,110);assert.equal(data.recipes[0].amounts[0].name,'番茄');assert.deepEqual(data.recipes,catalog);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
