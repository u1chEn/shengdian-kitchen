import {ingredients,tools,seasonings} from './public/recipes.js';
const names=new Set(ingredients.map(([,name])=>name));
const list=(value,max,allowed)=>Array.isArray(value)&&value.length<=max&&new Set(value).size===value.length&&value.every(x=>typeof x==='string'&&allowed.has(x));
export function validInput(d){
 return Boolean(d&&typeof d==='object'&&!Array.isArray(d)&&Object.keys(d).every(k=>['foods','tools','seasonings','time','servings','avoid','priority','aiConsent'].includes(k))&&list(d.foods,30,names)&&d.foods.length&&list(d.tools,6,new Set(tools))&&d.tools.length&&list(d.seasonings,6,new Set(seasonings))&&[15,30,60,90].includes(d.time)&&[1,2,3].includes(d.servings)&&typeof d.avoid==='string'&&d.avoid.length<=100&&(d.priority===undefined||d.priority===''||names.has(d.priority))&&(d.aiConsent===undefined||typeof d.aiConsent==='boolean'));
}
