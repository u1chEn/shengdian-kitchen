// One source of truth for on-screen quantities, copy text and catalog exports.
export function normalizeServings(value){return Math.max(1,Math.min(3,Math.round(Number(value)||1)))}
const formatNumber=n=>Number(n.toFixed(1)).toString();
export function recipeTime(recipe,servings=1){
 const people=normalizeServings(servings),batch=recipe.batch;
 const count=batch?Math.ceil(people/batch.servings):1;
 return recipe.time+(count-1)*(batch?.minutes||0);
}
export function recipeDetails(recipe,servings=1){
 const people=normalizeServings(servings),scale=people/(recipe.baseServings||1);
 const amounts=items=>(items||[]).map(a=>({...a,value:Number((a.value*scale).toFixed(1)),text:`${a.name} ${formatNumber(a.value*scale)} ${a.unit}`,detail:a.detail||''}));
 const water=recipe.water;
 return {
  servings:people,time:recipeTime(recipe,people),amounts:amounts(recipe.amounts),seasonings:amounts(recipe.seasoningAmounts),
  water:water?(water.value?`清水 ${formatNumber(water.value*scale)} ${water.unit}（${water.detail}）`:water.detail):'',
  batchNote:recipe.source==='ai'?'用量和时间由 AI 给出，请按现有存量、设备和熟度核对。':people>1?'用量已按人数换算；步骤中的加热时间按每批计，食材铺不开时分批做。':'加热时间按单份、常见家用设备估算，请以实际熟度为准。',
  portionNote:recipe.portionNote||'',equipmentNote:recipe.equipmentNote||'',steps:recipe.steps
 };
}
export function recipeText(recipe,servings=1){
 const d=recipeDetails(recipe,servings);
 return [recipe.name,`约${d.time}分钟 · ${d.servings}人参考量`,'食材：'+d.amounts.map(a=>a.text+(a.detail?`（${a.detail}）`:'')).join('、'),'调料：'+(d.seasonings.map(a=>a.text).join('、')||'无'),d.water?'用水：'+d.water:'','厨具：'+recipe.tools.join('/'),d.steps.map((s,i)=>`${i+1}. ${s}`).join('\n'),recipe.note,d.equipmentNote,d.batchNote,d.portionNote].filter(Boolean).join('\n');
}
