import {t} from './i18n.mjs';

const $=s=>document.querySelector(s);
const MAX_IMAGE_BYTES=10*1024*1024,MAX_IMAGE_SIDE=8192,IMAGE_TYPES=new Set(['image/jpeg','image/png','image/gif','image/webp']);

function readDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(Error(t('无法读取图片。','Could not read the image.')));reader.readAsDataURL(file);});}
function inspectImage(dataUrl){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(Error(t('无法解析图片内容。','Could not decode the image.')));image.src=dataUrl;});}
async function loadImageAttachment(file){
  if(!file||!IMAGE_TYPES.has(String(file.type).toLowerCase()))throw Error(t('仅支持 JPEG、PNG、GIF 或 WebP 图片。','Only JPEG, PNG, GIF, or WebP images are supported.'));
  if(!file.size||file.size>MAX_IMAGE_BYTES)throw Error(t('图片大小必须在 10 MB 以内。','The image must be 10 MB or smaller.'));
  const dataUrl=await readDataUrl(file),dimensions=await inspectImage(dataUrl);
  if(!dimensions.width||!dimensions.height||dimensions.width>MAX_IMAGE_SIDE||dimensions.height>MAX_IMAGE_SIDE)throw Error(t('图片最长边不能超过 8192 像素。','The longest image side cannot exceed 8192 pixels.'));
  return {name:String(file.name||'image').slice(0,200),mimeType:file.type.toLowerCase(),size:file.size,width:dimensions.width,height:dimensions.height,dataUrl};
}

function message(role,text){
  const item=document.createElement('div');item.className=`agent-message ${role}`;item.textContent=text;$('#agent-chat').append(item);item.scrollIntoView({block:'end'});return item;
}

function setPending(plan){
  const panel=$('#agent-plan');
  if(!plan){panel.classList.add('hidden');panel.dataset.mode='';return;}
  panel.dataset.mode=plan.mode;$('#agent-plan-summary').textContent=plan.message;
  $('#agent-plan-warnings').replaceChildren(...(plan.warnings||[]).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  $('#agent-apply').disabled=plan.mode==='no_change';panel.classList.remove('hidden');
}

function configLabel(config){
  if(!config?.configured)return t('尚未配置模型','Model not configured');
  const provider={openai:'OpenAI',anthropic:'Claude',deepseek:'DeepSeek',local:t('本地','Local'),custom:t('自定义','Custom')}[config.provider]||t('自定义','Custom');
  return `${config.model} · ${provider}`;
}

const PROVIDER_PRESETS={
  openai:{protocol:'responses',baseUrl:'https://api.openai.com/v1',model:''},
  anthropic:{protocol:'anthropic',baseUrl:'https://api.anthropic.com/v1',model:'claude-sonnet-4-6'},
  deepseek:{protocol:'chat',baseUrl:'https://api.deepseek.com',model:'deepseek-flash'},
  local:{protocol:'chat',baseUrl:'http://127.0.0.1:11434/v1',model:''}
};

function providerNote(provider){
  if(provider==='anthropic')return t('使用 Anthropic 官方 Messages API；支持 Claude 图片理解和结构化输出。','Uses the official Anthropic Messages API with Claude vision and structured outputs.');
  if(provider==='deepseek')return t('使用 DeepSeek 官方 OpenAI 兼容接口；deepseek-flash 支持图片识别。','Uses the official DeepSeek OpenAI-compatible API; deepseek-flash supports image recognition.');
  return t('选择服务商预设后仍可修改地址、协议和模型 ID。','You can edit the URL, protocol, and model ID after selecting a provider preset.');
}

function syncProviderControls(provider){
  $('#agent-provider-note').textContent=providerNote(provider);
  $('#agent-thinking').disabled=provider!=='deepseek';
  if(provider!=='deepseek')$('#agent-thinking').checked=false;
}

export function initCanvasAgent({getContext,applyPlan}){
  let pending=null,requesting=false,attachment=null;
  function renderAttachment(){
    const preview=$('#agent-image-preview');preview.classList.toggle('hidden',!attachment);
    if(!attachment){$('#agent-image-thumbnail').removeAttribute('src');return;}
    $('#agent-image-thumbnail').src=attachment.dataUrl;$('#agent-image-name').textContent=attachment.name;
    $('#agent-image-meta').textContent=t(`${attachment.width} × ${attachment.height} 像素 · ${(attachment.size/1024/1024).toFixed(1)} MB`,`${attachment.width} × ${attachment.height} px · ${(attachment.size/1024/1024).toFixed(1)} MB`);
  }
  function clearAttachment(){attachment=null;$('#agent-image-input').value='';renderAttachment();}
  const open=()=>{document.body.classList.add('agent-open');refreshConfig();};
  const close=()=>document.body.classList.remove('agent-open');
  async function refreshConfig(){
    try{const config=await window.desktop.agentConfigGet();$('#agent-model').textContent=configLabel(config);return config;}
    catch(e){$('#agent-model').textContent=t('配置读取失败','Could not read settings');throw e;}
  }
  async function openSettings(){
    const c=await refreshConfig();$('#agent-provider').value=c.provider||'custom';$('#agent-protocol').value=c.protocol||'responses';$('#agent-base-url').value=c.baseUrl||'https://api.openai.com/v1';$('#agent-model-input').value=c.model||'';$('#agent-thinking').checked=Boolean(c.thinking);$('#agent-api-key').value='';$('#agent-clear-key').checked=false;syncProviderControls(c.provider);$('#agent-key-status').textContent=c.hasKey?t('已保存加密密钥；API 地址不变时留空可继续使用。','An encrypted key is saved; leave this blank to keep it when the API URL is unchanged.'):t('尚未保存密钥；本地无鉴权接口可以留空。','No key is saved; leave it blank for a local API without authentication.');$('#agent-settings-dialog').showModal();
  }
  async function saveSettings(){
    const button=$('#agent-settings-save');button.disabled=true;
    try{
      const result=await window.desktop.agentConfigSave({provider:$('#agent-provider').value,protocol:$('#agent-protocol').value,baseUrl:$('#agent-base-url').value.trim(),model:$('#agent-model-input').value.trim(),thinking:$('#agent-thinking').checked,apiKey:$('#agent-api-key').value,clearKey:$('#agent-clear-key').checked});
      $('#agent-settings-dialog').close();$('#agent-model').textContent=configLabel(result);message('system',t('API 设置已保存。','API settings saved.'));
    }catch(e){$('#agent-key-status').textContent=e.message||String(e);}
    finally{button.disabled=false;}
  }
  async function send(){
    const typed=$('#agent-prompt').value.trim();if((!typed&&!attachment)||requesting)return;
    const image=attachment,prompt=typed||t('识别图片中的化学结构，并转换为可编辑的画布内容。','Recognize the chemical structure in the image and convert it to editable canvas content.');
    requesting=true;$('#agent-send').disabled=true;$('#agent-prompt').disabled=true;$('#agent-image-button').disabled=true;$('#agent-image-remove').disabled=true;setPending(null);pending=null;message('user',prompt+(image?`\n📎 ${image.name}`:''));const wait=message('assistant',t(image?'正在读取画布和图片并等待回复…':'正在读取画布并等待回复…',image?'Reading the canvas and image and waiting for a response…':'Reading the canvas and waiting for a response…'));const started=Date.now();let lastUi=0;
    const off=window.desktop.agentProgress?.(p=>{const now=Date.now();if(now-lastUi<800)return;lastUi=now;wait.textContent=t(`正在等待回复… 已等待 ${Math.round(p.elapsedMs/1000)} 秒 · 已接收 ${(p.chars/1024).toFixed(1)} KB`,`Waiting for a response… ${Math.round(p.elapsedMs/1000)} s elapsed · ${(p.chars/1024).toFixed(1)} KB received`);});
    try{
      const context=await getContext();let contextText=t(`${context.stats.atoms} 个原子 · ${context.stats.bonds} 条键 · ${context.stats.texts} 处文字`,`${context.stats.atoms} atoms · ${context.stats.bonds} bonds · ${context.stats.texts} texts`);const selection=context.selection;const count=selection?(selection.atoms?.length||0)+(selection.bonds?.length||0)+(selection.texts?.length||0)+(selection.arrows?.length||0):0;if(count)contextText+=t(` · 已框选 ${count} 个对象`,` · ${count} objects selected`);
      $('#agent-context').textContent=contextText;
      const plan=await window.desktop.agentRequest({...context,instruction:prompt,image});
      wait.textContent=plan.message+(plan.mode==='no_change'&&plan.warnings?.length?'\n'+plan.warnings.map(item=>'⚠ '+item).join('\n'):'');
      if(plan.mode==='no_change'){pending=null;setPending(null);}else{pending=plan;setPending(plan);}
      $('#agent-prompt').value='';clearAttachment();$('#agent-context').textContent+=t(` · 用时 ${((Date.now()-started)/1000).toFixed(1)} 秒`,` · ${((Date.now()-started)/1000).toFixed(1)} s`);
    }catch(e){wait.remove();message('error',e.message||String(e));}
    finally{off?.();requesting=false;$('#agent-send').disabled=false;$('#agent-prompt').disabled=false;$('#agent-image-button').disabled=false;$('#agent-image-remove').disabled=false;$('#agent-prompt').focus();}
  }
  async function apply(){
    if(!pending||pending.mode==='no_change')return;
    $('#agent-apply').disabled=true;
    try{await applyPlan(pending);message('system',t('修改已经应用到画布，可使用顶部撤销恢复。','Changes were applied to the canvas. Use Undo at the top to restore the previous state.'));pending=null;setPending(null);}
    catch(e){message('error',t('无法应用修改：','Could not apply changes: ')+(e.message||String(e)));$('#agent-apply').disabled=false;}
  }
  $('#agent-toggle').onclick=open;$('#agent-close').onclick=close;$('#agent-settings').onclick=()=>openSettings().catch(e=>message('error',e.message||String(e)));$('#agent-settings-save').onclick=saveSettings;$('#agent-provider').onchange=()=>{const provider=$('#agent-provider').value,preset=PROVIDER_PRESETS[provider];if(preset){$('#agent-protocol').value=preset.protocol;$('#agent-base-url').value=preset.baseUrl;$('#agent-model-input').value=preset.model;}syncProviderControls(provider);};$('#agent-send').onclick=send;$('#agent-apply').onclick=apply;$('#agent-discard').onclick=()=>{pending=null;setPending(null);message('system',t('已放弃这份修改方案。','Change plan discarded.'));};
  $('#agent-image-button').onclick=()=>$('#agent-image-input').click();$('#agent-image-remove').onclick=clearAttachment;$('#agent-image-input').onchange=async()=>{const file=$('#agent-image-input').files?.[0];if(!file)return;try{attachment=await loadImageAttachment(file);renderAttachment();$('#agent-prompt').focus();}catch(e){clearAttachment();message('error',e.message||String(e));}};
  $('#agent-prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send();}});
  refreshConfig().catch(()=>{});
  window.addEventListener('chemistry-language-change',()=>{refreshConfig().catch(()=>{});renderAttachment();});
  return {open,send,applyPlan:async plan=>{pending=plan;setPending(plan);return apply();}};
}
