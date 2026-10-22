import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../public/catalog.js';
import {recipeDetails,recipeText,recipeTime} from '../public/cooking-guide.js';
import {recommend,recommendationStatus} from '../public/recipes.js';
const find=id=>catalog.find(r=>r.id===`local-${id}`);
test('all 110 cooking guides cover exactly their required ingredients and seasonings',()=>{
 for(const r of catalog){
  assert.deepEqual(r.amounts.map(a=>a.name),r.foods,r.name);
  assert.deepEqual(r.seasoningAmounts.map(a=>a.name),r.seasonings,r.name);
  for(const a of [...r.amounts,...r.seasoningAmounts])assert.ok(a.value>0&&a.unit,r.name);
  assert.ok(r.equipmentNote&&r.portionNote,r.name);
  assert.ok(r.steps.length>=4&&r.steps.length<=8,r.name);
  assert.ok(!r.steps.some(s=>s.includes('按本菜需要')||s.includes('火腿肠切小丁或剥粒')||s.includes('红薯洗净切块或段；南瓜')));
 }
});
test('one and three portions scale food, water and copied quantities consistently without changing recipe data',()=>{
 const r=find(44),before=JSON.stringify(r),one=recipeDetails(r,1),three=recipeDetails(r,3);
 assert.equal(one.amounts.find(a=>a.name==='鸡蛋').value,1);
 assert.equal(three.amounts.find(a=>a.name==='鸡蛋').value,3);
 assert.equal(three.amounts.find(a=>a.name==='挂面').value,240);
 assert.match(three.water,/1500/);
 assert.match(recipeText(r,3),/鸡蛋 3 个/);
 assert.match(recipeText(r,3),/挂面 240 克/);
 assert.equal(JSON.stringify(r),before);
 assert.equal(recipeDetails(r,NaN).servings,1);
 assert.equal(recipeDetails(r,99).servings,3);
});
test('time filters account for extra batches, and three portions can explicitly extend to 90 minutes',()=>{
 const r=find(80),input={foods:r.foods,tools:r.tools,seasonings:r.seasonings,servings:3,time:60,avoid:''};
 assert.equal(recipeTime(r,1),40);assert.equal(recipeTime(r,3),68);
 assert.ok(!recommend(input).some(x=>x.id===r.id));
 assert.ok(recommend({...input,time:90}).some(x=>x.id===r.id&&x.time===68));
 assert.equal(recommendationStatus(input).actions[0].time,90);
});
test('rice, custard and microwave methods retain their specific water and equipment instructions',()=>{
 assert.match(recipeDetails(find(83),3).water,/刻度/);
 assert.match(recipeDetails(find(109),3).water,/1.5倍/);
 assert.match(find(61).steps.join(''),/浅碗/);
 assert.match(find(61).steps.join(''),/静置2分钟/);
 assert.match(find(35).steps.join(''),/煮约10分钟/);
 assert.match(find(103).steps.join(''),/75℃/);
 assert.ok(!find(90).steps.join('').includes('南瓜'));
});

test('extra-time explanation uses the same recipe as its displayed minimum',()=>{
 const s=recommendationStatus({foods:['大米','鸡蛋'],tools:['电饭煲'],seasonings:[],servings:1,time:15,avoid:''});
 assert.match(s.reason,/电饭煲蒸蛋/);assert.match(s.reason,/30分钟/);
});
