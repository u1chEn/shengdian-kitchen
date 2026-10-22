import {buildRecipeData} from './recipe-request.js';
import {getAIStatus,requestAIRecipes} from './ai-client.js';
import {recipeDetails,recipeText} from './cooking-guide.js';
import {applyFoodSprite} from './food-sprites.js';
import {ingredients,ingredientPages,recipes,recommend,recommendationStatus,canonical,getKnownFoods,tools,seasonings} from './recipes.js';
import {dishArt} from './paper-art.js';import {kitchenIcon} from './kitchen-icons.js';
const $=s=>document.querySelector(s),node=(tag,cls='',text)=>{const e=document.createElement(tag);e.className=cls;if(text!==undefined)e.textContent=text;return e};
const state={selected:new Set(),custom:[],tools:new Set(['炒锅','电煮锅']),seasonings:new Set(['盐','酱油','油']),priority:'',recipes:[],page:0,fridgePage:0,snapshot:null,aiDraft:null,aiReady:false,aiBusy:false};
const label=n=>n==='挂面'?'面条':n==='米饭'?'熟米饭':n;
const foods=()=>[...ingredients.filter(([id])=>state.selected.has(id)).map(([,n])=>n),...state.custom];
const input=()=>({foods:foods(),tools:[...state.tools],seasonings:[...state.seasonings],priority:state.priority,time:Number($('#time').value),servings:Number($('#servings').value),avoid:$('#avoid').value.trim()});
const toggle=(s,v)=>s.has(v)?s.delete(v):s.add(v);
const sprite=id=>{const e=node('span','food-sprite'),i=ingredients.findIndex(([x])=>x===id);e.setAttribute('aria-hidden','true');applyFoodSprite(e,i);return e};
function render(){
 const grid=$('#ingredients');grid.replaceChildren();for(const[id,name]of ingredientPages[state.fridgePage].items){const b=node('button','ingredient'+(state.selected.has(id)?' selected':''));b.type='button';b.setAttribute('aria-label',label(name));b.setAttribute('aria-pressed',state.selected.has(id));b.append(sprite(id),node('span','food-label',label(name)));b.onclick=()=>{toggle(state.selected,id);if(!foods().includes(state.priority))state.priority='';$('#message').textContent='';render()};grid.append(b)}
 $('#fridge-page-label').textContent=`${state.fridgePage+1} / ${ingredientPages.length} · ${ingredientPages[state.fridgePage].title}`;$('#fridge-prev').disabled=state.fridgePage===0;$('#fridge-next').disabled=state.fridgePage===ingredientPages.length-1;
 const door=$('#door-items');door.replaceChildren();for(const name of ['盐','酱油']){const b=node('button','door-item'+(state.seasonings.has(name)?' active':''));b.type='button';b.setAttribute('aria-label',`调料：${name}`);b.setAttribute('aria-pressed',state.seasonings.has(name));b.append(node('span','label',name));b.onclick=()=>{toggle(state.seasonings,name);render()};door.append(b)}
 const list=$('#custom-list');list.replaceChildren();for(const name of foods()){const b=node('button','custom-item',label(name)+' ×');b.type='button';b.setAttribute('aria-label','移除'+label(name));b.onclick=()=>{const pair=ingredients.find(([,n])=>n===name);if(pair)state.selected.delete(pair[0]);state.custom=state.custom.filter(n=>n!==name);if(name===state.priority)state.priority='';render()};list.append(b)}
 $('#selection-count').textContent=foods().length?`已选 ${foods().length} 种 · 跨页保留`:'还没选食材';$('#tools-summary').textContent='厨具：'+([...state.tools].join('、')||'未选择');$('#confirm').disabled=!foods().length||!state.tools.size;
 const priority=$('#priority');priority.replaceChildren();priority.hidden=!foods().length;if(foods().length){priority.append(node('span','','优先用掉（可选）'));for(const n of foods()){const b=node('button',state.priority===n?'active':'',label(n));b.type='button';b.setAttribute('aria-pressed',state.priority===n);b.onclick=()=>{state.priority=state.priority===n?'':n;render()};priority.append(b)}}
 for(const [id,all,chosen]of [['tools',tools,state.tools],['seasonings',seasonings,state.seasonings]]){const root=$('#'+id);root.replaceChildren();for(const n of all){const b=node('button','chip'+(chosen.has(n)?' active':''));b.type='button';b.setAttribute('aria-pressed',chosen.has(n));b.append(kitchenIcon(n),node('span','',n));b.onclick=()=>{toggle(chosen,n);render()};root.append(b)}}
}
function show(screen){for(const s of ['fridge','choices','book'])$('#'+s+'-screen').hidden=s!==screen;document.body.classList.toggle('reading',screen==='book');$('#screen-label').textContent=screen==='fridge'?'选食材':screen==='choices'?'挑一道菜':'看做法';window.scrollTo({top:0,behavior:'instant'})}
function confirm(){const current=input(),results=recommend(current);if(!results.length){const info=recommendationStatus(current);$('#message').replaceChildren(node('span','',info.reason));for(const a of info.actions){const b=node('button','retry-action',a.label);b.onclick=()=>{$('#time').value=String(a.time);confirm()};$('#message').append(b)}return}presentRecipes(current,results)}
function presentRecipes(current,results){state.snapshot=current;state.recipes=results;state.page=0;$('#choice-count').textContent=results[0]?.source==='ai'?`DeepSeek 给出 ${results.length} 道参考做法`:`找到 ${results.length} 道可做的菜`;$('#choice-selected').textContent='已选：'+current.foods.map(label).join('、')+'。每道菜只用需要的部分，不必全部用上。';const root=$('#recipe-cards');root.replaceChildren();results.forEach((r,i)=>{const b=node('button','recipe-card');b.type='button';b.setAttribute('aria-label','查看'+r.name+'做法');b.append(dishArt(r),node('span','recipe-kind',r.source==='ai'?'DeepSeek':r.kind),node('h2','',r.name),node('p','card-meta',`${r.time} 分钟 · ${r.tools[0]}`),node('p','card-foods','用到：'+r.foods.map(label).join('、')));if(r.note.includes('蒸架'))b.append(node('small','card-condition','需配套蒸架/蒸篮'));b.onclick=()=>{state.page=i;renderBook();show('book')};root.append(b)});show('choices');$('#choice-title').focus({preventScroll:true})}
function renderBook(){const r=state.recipes[state.page],current=state.snapshot,details=recipeDetails({...r,time:r.baseTime??r.time},current.servings);$('#recipe-name').textContent=r.name;$('#dish-art').replaceChildren(dishArt(r));$('#recipe-time').textContent=`约 ${r.time} 分钟 · ${current.servings} 人 · ${r.tools.join(' / ')}`;const unused=getKnownFoods(current.foods).filter(f=>!r.foods.includes(f));$('#recipe-reason').textContent=`只用 ${r.foods.length} 种现有食材`+(unused.length?`；${unused.map(label).join('、')}可以留着做别的。`:'，种类齐全，份量请按现有存量确认。');$('#recipe-foods').replaceChildren(...details.amounts.map(a=>{const li=node('li');li.append(node('span','quantity-name',label(a.name)),node('span','quantity-value',`${a.value} ${a.unit}`));if(a.detail)li.append(node('small','quantity-detail',a.detail));return li}));$('#recipe-water').textContent=details.water?'用水：'+details.water:'';$('#recipe-portions').textContent=details.portionNote;$('#recipe-equipment').textContent=(details.seasonings.map(a=>a.text).join('、')||'不需调料')+' · '+r.tools.join(' / ');$('#recipe-steps').replaceChildren(...r.steps.map(t=>node('li','',t)));$('#recipe-note').textContent=[r.note,details.equipmentNote,details.batchNote,'菜品插画仅供示意，配料以清单为准。'].filter(Boolean).join(' ');$('#page-count').textContent=`${state.page+1} / ${state.recipes.length} · ${r.source==='ai'?'DeepSeek 推荐':'内置食谱'}`;$('#next').disabled=state.recipes.length<2;$('#next').textContent=state.recipes.length<2?'本次只有这一道':'换一道 →';$('#copy').textContent='复制做法'}
$('#fridge-prev').onclick=()=>{if(state.fridgePage>0){state.fridgePage--;render()}};$('#fridge-next').onclick=()=>{if(state.fridgePage<ingredientPages.length-1){state.fridgePage++;render()}};
$('#custom-form').onsubmit=e=>{e.preventDefault();const values=$('#custom').value.split(/[，,、;；\n]+/).map(v=>v.trim()).filter(Boolean);if(foods().length+values.length>30){$('#message').textContent='一次最多选 30 种食材。';return}for(const value of values){const known=getKnownFoods([value]);if(known.length){for(const n of known){const found=ingredients.find(([,x])=>x===n);if(found)state.selected.add(found[0])}}else if(!state.custom.includes(value))state.custom.push(value)}$('#custom').value='';render()};
$('#confirm').onclick=confirm;$('#back').onclick=()=>show('choices');$('#choices-back').onclick=()=>{show('fridge');render()};$('#next').onclick=()=>{state.page=(state.page+1)%state.recipes.length;renderBook()};$('#header-settings').onclick=$('#settings-open').onclick=()=>$('#settings-dialog').showModal();$('#settings-done').onclick=()=>{if(!state.tools.size){$('#settings-error').textContent='请至少选择一种实际拥有的厨具。';return}$('#settings-error').textContent='';$('#settings-dialog').close();const reviewing=!$('#choices-screen').hidden||!$('#book-screen').hidden;render();if(reviewing){show('fridge');confirm()}};$('#mode-info').onclick=()=>$('#info-dialog').showModal();$('#catalog-open').onclick=()=>$('#catalog-dialog').showModal();$('#example').onclick=()=>{state.selected=new Set(['egg','tomato','noodles']);state.custom=[];state.fridgePage=0;state.tools=new Set(['炒锅','电煮锅']);state.seasonings=new Set(['盐','油','酱油']);$('#time').value='30';$('#avoid').value='';render()};
$('#copy').onclick=async()=>{const r=state.recipes[state.page];try{await navigator.clipboard.writeText(recipeText({...r,time:r.baseTime??r.time},state.snapshot.servings));$('#copy').textContent='已复制 ✓'}catch{$('#copy-text').value=recipeText({...r,time:r.baseTime??r.time},state.snapshot.servings);$('#copy-dialog').showModal();$('#copy-text').focus();$('#copy-text').select()}};
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d){const b=d.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)d.close()}});
$('#catalog-summary').textContent=`${ingredients.length} 种食材 · ${recipes.length} 道内置菜谱 · ${ingredientPages.length} 页冰箱`;const catalogRoot=$('#catalog-content');for(const t of tools){const section=node('section');section.append(node('h3','',t));const list=node('ul');for(const r of recipes.filter(r=>r.tools[0]===t))list.append(node('li','',r.name+' · '+r.time+'分钟'));section.append(list);catalogRoot.append(section)}render();

async function openAI(){
 if(state.aiBusy)return;
 let data;try{data=buildRecipeData(input())}catch(error){$('#message').textContent=error.message;show('fridge');return}
 const draft={data};state.aiDraft=draft;state.aiReady=false;
 $('#ai-consent').checked=false;$('#ai-generate').disabled=true;$('#ai-status').textContent='正在检查服务端配置……';
 const preview=$('#ai-preview');preview.replaceChildren();
 for(const [title,value]of [['食材',data.foods.map(label).join('、')],['厨具',data.tools.join('、')],['调料',data.seasonings.join('、')||'无'],['人数与时间',`${data.servings} 人 · ${data.time} 分钟内`],['不吃的食材',data.avoid||'无'],['优先用掉',data.priority||'未指定']])preview.append(node('dt','',title),node('dd','',value));
 $('#ai-dialog').showModal();
 try{const status=await getAIStatus();if(state.aiDraft!==draft||!$('#ai-dialog').open)return;
  state.aiReady=status.ai===true&&status.provider==='DeepSeek';
  $('#ai-status').textContent=status.provider!=='DeepSeek'?'服务端当前不是 DeepSeek 配置，请先切换服务端供应商。':state.aiReady?'DeepSeek 已配置。勾选确认后，才会发出本次请求。':'你尚未连接 DeepSeek。点击上方配置链接保存密钥，或继续使用内置食谱。';
 }catch{if(state.aiDraft===draft)$('#ai-status').textContent='暂时无法检查配置，未发送做饭数据。'}
 $('#ai-generate').disabled=!state.aiReady||!$('#ai-consent').checked;
}
$('#ai-open').onclick=$('#choice-ai-open').onclick=openAI;
$('#ai-consent').onchange=()=>{$('#ai-generate').disabled=!state.aiReady||!$('#ai-consent').checked||state.aiBusy};
$('#ai-generate').onclick=async()=>{
 if(!state.aiReady||state.aiBusy||!$('#ai-consent').checked||!state.aiDraft)return;
 const draft=state.aiDraft;state.aiBusy=true;$('#ai-generate').disabled=true;$('#ai-status').textContent='DeepSeek 正在想做法……';
 try{
  const results=await requestAIRecipes({...draft.data,aiConsent:true});
  if(state.aiDraft!==draft||!$('#ai-dialog').open)return;
  if(!results.length){$('#ai-status').textContent='本次没有通过配料和厨具检查的结果，可继续使用内置食谱。';return}
  $('#ai-dialog').close();presentRecipes(draft.data,results);
 }catch(error){if(state.aiDraft===draft)$('#ai-status').textContent=error.name==='TimeoutError'?'请求超时，未自动重试。你可以继续使用内置食谱。':error.message}
 finally{state.aiBusy=false;$('#ai-generate').disabled=!state.aiReady||!$('#ai-consent').checked}
};
$('#ai-dialog').addEventListener('close',()=>{state.aiDraft=null;state.aiReady=false;$('#ai-consent').checked=false});
