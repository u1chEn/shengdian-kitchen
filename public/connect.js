const $=s=>document.querySelector(s);
let busy=false,available=false;
async function api(method='GET',body){
 const response=await fetch('/api/settings/deepseek',{method,credentials:'same-origin',mode:'same-origin',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
 let data;try{data=await response.json()}catch{throw Error('无法读取配置状态，请刷新重试。')}
 if(!response.ok)throw Error(data.error||'未能完成配置。');return data;
}
function message(text,error=false){$('#result').textContent=text;$('#result').classList.toggle('error',error)}
function configured(value){$('#connection-state').textContent=value?'密钥已保存 · 尚需实际推荐测试':'尚未连接';$('#delete-key').hidden=!value}
async function refresh(){try{const data=await api();configured(data.configured);available=true;$('#save-key').disabled=false}catch(error){$('#connection-state').textContent='暂不可配置';message(error.message,true)}}
$('#key-form').onsubmit=async event=>{
 event.preventDefault();if(busy||!available)return;
 let apiKey=$('#api-key').value.trim();$('#api-key').value='';
 if(!/^sk-[A-Za-z0-9_-]{16,240}$/.test(apiKey)){message('请输入 DeepSeek 平台创建的完整 API Key。',true);apiKey='';return}
 busy=true;$('#save-key').disabled=true;$('#delete-key').disabled=true;message('正在加密保存…');
 try{await api('PUT',{apiKey});configured(true);message('已保存并清空输入框，未调用模型。现在可以返回冰箱，选择食材并确认生成。')}
 catch(error){message(error.message,true)}
 finally{apiKey='';busy=false;$('#save-key').disabled=false;$('#delete-key').disabled=false}
};
$('#delete-key').onclick=async()=>{
 if(busy)return;busy=true;$('#save-key').disabled=true;$('#delete-key').disabled=true;
 try{await api('DELETE');configured(false);message('你的密钥已删除，仍可使用内置食谱。')}
 catch(error){message(error.message,true)}
 finally{busy=false;$('#save-key').disabled=false;$('#delete-key').disabled=false}
};
window.addEventListener('pagehide',()=>{$('#api-key').value=''});
refresh();
