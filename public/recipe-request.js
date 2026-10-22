import {getKnownFoods,canonical,tools as allowedTools,seasonings as allowedSeasonings} from './recipes.js';
// Used by the preview AND the server. Never serialize the form or page wholesale.
export function buildRecipeData(input){
 const foods=getKnownFoods(input.foods||[]);
 if(!foods.length||foods.length>30)throw new Error('请选择已收录的食材。');
 const rawAvoid=canonical(input.avoid||'');
 if(/过敏|花生|坚果|海鲜|乳制|麸质|小麦|大豆|糖尿病|孕|疾病/.test(rawAvoid))throw new Error('复杂过敏或健康描述暂不发送，请仅填写明确不吃的食材。');
 const excluded=getKnownFoods([rawAvoid]);
 const rest=excluded.reduce((s,f)=>s.split(f).join(''),rawAvoid).replace(/不使用|不吃|不要|不放|忌口|避免|排除|和|及|与|[：:,，、;；。\s]/g,'');
 if(rest)throw new Error('忌口栏只能填写不吃的食材；其他文字不会发送。');
 const tools=[...new Set(input.tools||[])].filter(t=>allowedTools.includes(t));
 const seasonings=[...new Set(input.seasonings||[])].filter(s=>allowedSeasonings.includes(s));
 if(!tools.length||![15,30,60,90].includes(input.time)||![1,2,3].includes(input.servings))throw new Error('请检查厨具、人数和时间设置。');
 const priority=getKnownFoods([input.priority||'']).find(f=>foods.includes(f))||'';
 return {foods,tools,seasonings,time:input.time,servings:input.servings,avoid:excluded.join('、'),priority};
}
