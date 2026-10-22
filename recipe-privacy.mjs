import {buildRecipeData} from './public/recipe-request.js';
// Single-request projection; never reads account headers, cookies, chat or memory.
export const privateRecipeInput=buildRecipeData;
// Retained for compatibility. DeepSeek does not document OpenAI's store flag.
export function modelRequestBody(_data,model){return {model,store:false};}
