import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {catalog} from '../public/catalog.js';
import {dishIllustrations} from '../public/dish-illustrations.js';

test('every recipe has a corresponding valid finished-dish sprite',async()=>{
  assert.equal(Object.keys(dishIllustrations).length,catalog.length);
  for(const recipe of catalog){
    const art=dishIllustrations[recipe.id];
    assert.ok(art,recipe.name);
    assert.equal(art.name,recipe.name);
    await access(new URL('../public/'+art.src,import.meta.url));
    const [x,y,w,h]=art.box;
    assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=art.width&&y+h<=art.height,recipe.name);
  }
  assert.equal(new Set(Object.values(dishIllustrations).map(a=>a.src+':'+a.box.join(','))).size,catalog.length);
});
test('both UI surfaces render recipe illustrations without raw pantry art',async()=>{
  const ui=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const renderer=await readFile(new URL('../public/paper-art.js',import.meta.url),'utf8');
  assert.equal(ui.match(/dishArt\(r\)/g).length,2);
  assert.ok(!renderer.includes('food-atlas'));
  assert.ok(!renderer.includes('applyFoodSprite'));
});
