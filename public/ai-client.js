import {buildRecipeData} from './recipe-request.js';
const sameOrigin={credentials:'same-origin',mode:'same-origin',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer'};
export async function getAIStatus(request=fetch){
 const response=await request('/api/status',{...sameOrigin,method:'GET'});
 if(!response.ok)throw new Error('暂时无法读取服务端配置，请稍后再试。');return response.json();
}
export async function requestAIRecipes(input,request=fetch){
 if(input.aiConsent!==true)throw new Error('请先确认发送内容。');
 const data=buildRecipeData(input);
 const response=await request('/api/recipes',{...sameOrigin,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,aiConsent:true}),signal:AbortSignal.timeout(45000)});
 const answer=await response.json();
 if(!response.ok)throw new Error(typeof answer.error==='string'?answer.error.slice(0,300):'请求失败，可继续使用内置食谱。');
 if(answer.provider!=='DeepSeek'||!Array.isArray(answer.recipes))throw new Error('返回的模型来源或格式异常，请使用内置食谱。');
 return answer.recipes.slice(0,3);
}
