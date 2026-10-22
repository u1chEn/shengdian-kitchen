import {catalog} from './public/catalog.js';
import {getKnownFoods,seasonings as knownSeasonings,tools as knownTools} from './public/recipes.js';
// Treat model output as untrusted. Build a fresh browser-safe object after validation.
const text=(s,max)=>typeof s==='string'&&s.trim().length>0&&s.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s);
const uniqueSubset=(xs,allowed,max)=>Array.isArray(xs)&&xs.length<=max&&new Set(xs).size===xs.length&&xs.every(x=>allowed.includes(x));
const amounts=(xs,names,units)=>Array.isArray(xs)&&xs.length===names.length&&new Set(xs.map(x=>x?.name)).size===names.length&&xs.every(x=>x&&names.includes(x.name)&&Number.isFinite(x.value)&&x.value>0&&x.value<=3000&&units.includes(x.unit)&&(x.detail===undefined||typeof x.detail==='string'&&x.detail.length<=100));
export function normalizeModelRecipe(r,input,index){
 if(!r||!text(r.name,40)||!uniqueSubset(r.foods,input.foods,12)||!r.foods.length||!uniqueSubset(r.tools,input.tools,1)||r.tools.length!==1||!uniqueSubset(r.seasonings,input.seasonings,6)||!Number.isInteger(r.time)||r.time<1||r.time>input.time||!Array.isArray(r.steps)||r.steps.length<3||r.steps.length>8||!r.steps.every(s=>text(s,350)))return null;
 const excluded=getKnownFoods([input.avoid]);if(r.foods.some(f=>excluded.includes(f)))return null;
 if(!amounts(r.amounts,r.foods,['克','毫升','个','片'])||!amounts(r.seasoningAmounts,r.seasonings,['克','毫升']))return null;
 if(r.note!==undefined&&(typeof r.note!=='string'||r.note.length>350))return null;
 const prose=[r.name,...r.steps,r.note||'',...r.amounts.map(a=>a.detail||'')].join(' ');
 if(getKnownFoods([prose]).some(f=>!r.foods.includes(f)))return null;
 // Catch undeclared known seasoning/equipment requirements in prose as well.
 if(knownSeasonings.some(s=>!r.seasonings.includes(s)&&new RegExp(s==='油'?'(?<!酱)油':s).test(prose)))return null;
 if(knownTools.some(t=>prose.includes(t)&&!r.tools.includes(t)))return null;
 const same=catalog.find(c=>c.name===r.name&&c.foods.slice().sort().join('|')===r.foods.slice().sort().join('|'));
 const copyAmount=a=>({name:a.name,value:a.value,unit:a.unit,detail:a.detail||''});
 return {id:`ai-${index}`,name:r.name.trim(),foods:r.foods.slice(),tools:r.tools.slice(),seasonings:r.seasonings.slice(),time:r.time,baseTime:r.time,baseServings:input.servings,amounts:r.amounts.map(copyAmount),seasoningAmounts:r.seasoningAmounts.map(copyAmount),steps:r.steps.map(s=>s.trim()),note:r.note||'',kind:'AI 推荐',source:'ai',servings:input.servings,illustrationId:same?.id||null,portionNote:'AI 给出的所选人数参考量，请按现有存量确认。',equipmentNote:'AI 做法未经人工逐道核实，请核对配料、厨具与实际熟度。'};
}
