// Fixed destinations prevent arbitrary forwarding of credentials or recipe data.
export function modelConfig(env={}){
 const provider=String(env.AI_PROVIDER||'deepseek').toLowerCase();
 if(provider==='deepseek')return {provider:'DeepSeek',key:String(env.DEEPSEEK_API_KEY||'').trim(),model:env.DEEPSEEK_MODEL||'deepseek-flash',endpoint:'https://api.deepseek.com/chat/completions'};
 if(provider==='openai')return {provider:'OpenAI',key:String(env.OPENAI_API_KEY||env.AI_API_KEY||'').trim(),model:env.OPENAI_MODEL||env.AI_MODEL||'gpt-4.1-mini',endpoint:'https://api.openai.com/v1/chat/completions'};
 throw new Error('Unsupported provider');
}
export function createLimiter({now=Date.now,max=6,windowMs=60000}={}){
 let start=now(),count=0,active=false;
 return {acquire(){const time=now();if(time-start>=windowMs){start=time;count=0}if(active||count>=max)return null;active=true;count++;let released=false;return ()=>{if(!released){released=true;active=false}};}};
}
