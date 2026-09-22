import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEBUG_PORT=9361,dataDir=path.resolve('work','agent-claude-ui-data-'+Date.now());
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let failed=false,ws,id=0;const pending=new Map();
const check=(name,ok,detail='')=>{if(ok)console.log('PASS',name);else{console.log('FAIL',name,detail);failed=true;}};
const env={...process.env,CHEMISTRY_TEST:'1',CHEMISTRY_TEST_DATA:dataDir};delete env.ELECTRON_RUN_AS_NODE;
const proc=spawn(path.resolve('runtime','electron.exe'),[path.resolve('app'),`--remote-debugging-port=${DEBUG_PORT}`],{env,stdio:'ignore',windowsHide:true});
const evaluate=expression=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
try{
  let page;for(let i=0;i<120;i++){try{const list=await(await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();page=list.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1'));if(page)break;}catch{}await sleep(250);}if(!page)throw Error('No debug page');
  ws=new WebSocket(page.webSocketDebuggerUrl);ws.onmessage=event=>{const message=JSON.parse(event.data),item=pending.get(message.id);if(item){pending.delete(message.id);message.error?item.reject(Error(JSON.stringify(message.error))):item.resolve(message.result);}};await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  for(let i=0;i<120;i++){const result=await evaluate(`window.chemistry?window.chemistry.ready.then(()=>true):false`);if(result.result.value)break;await sleep(250);}
  const result=await evaluate(`(async()=>{document.querySelector('#agent-toggle').click();document.querySelector('#agent-settings').click();for(let i=0;i<40&&!document.querySelector('#agent-settings-dialog').open;i++)await new Promise(r=>setTimeout(r,50));const provider=document.querySelector('#agent-provider');provider.value='anthropic';provider.dispatchEvent(new Event('change',{bubbles:true}));const send=document.querySelector('#agent-send');return JSON.stringify({brand:document.querySelector('.brand').textContent.trim(),title:document.title,arrow:send.textContent.trim(),sendTitle:send.title,protocol:document.querySelector('#agent-protocol').value,baseUrl:document.querySelector('#agent-base-url').value,model:document.querySelector('#agent-model-input').value,note:document.querySelector('#agent-provider-note').textContent,thinkingDisabled:document.querySelector('#agent-thinking').disabled})})()`);
  const state=JSON.parse(result.result.value);
  check('Structlnk 品牌显示',state.brand.includes('Structlnk')&&!state.brand.includes('Chemistry')&&state.title.endsWith('· Structlnk'),JSON.stringify(state));
  check('发送按钮使用箭头',state.arrow==='➤'&&state.sendTitle==='发送',JSON.stringify(state));
  check('Claude 预设填写官方接口',state.protocol==='anthropic'&&state.baseUrl==='https://api.anthropic.com/v1'&&state.model==='claude-sonnet-4-6',JSON.stringify(state));
  check('Claude 设置说明与控件状态',state.note.includes('Anthropic')&&state.thinkingDisabled,JSON.stringify(state));
}catch(error){console.log('FAIL',error.stack||error.message);failed=true;}
finally{try{ws?.close();}catch{}try{proc.kill();}catch{}await sleep(700);try{proc.kill('SIGKILL');}catch{}await fs.rm(dataDir,{recursive:true,force:true});}
process.exit(failed?1:0);
