import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEBUG_PORT=9353,API_PORT=9354,dataDir=path.resolve('work','agent-image-ui-data-'+Date.now());
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let captured=null,failed=false,ws,id=0;const pending=new Map();
const check=(name,ok,detail='')=>{if(ok)console.log('PASS',name);else{console.log('FAIL',name,detail);failed=true;}};
const server=createServer((req,res)=>{let text='';req.on('data',chunk=>text+=chunk);req.on('end',()=>{captured=JSON.parse(text);const content=JSON.stringify({message:'已识别图片，测试不修改画布。',warnings:[],mode:'no_change',source:null,ket:null,highlight:null});res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({choices:[{message:{content}}]}));});});
await new Promise((resolve,reject)=>server.listen(API_PORT,'127.0.0.1',error=>error?reject(error):resolve()));
const env={...process.env,CHEMISTRY_TEST:'1',CHEMISTRY_TEST_DATA:dataDir};delete env.ELECTRON_RUN_AS_NODE;
const proc=spawn(path.resolve('runtime','electron.exe'),[path.resolve('app'),`--remote-debugging-port=${DEBUG_PORT}`],{env,stdio:'ignore',windowsHide:true});
const evaluate=expression=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
try{
  let page;for(let i=0;i<120;i++){try{const list=await(await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();page=list.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1'));if(page)break;}catch{}await sleep(250);}if(!page)throw Error('No debug page');
  ws=new WebSocket(page.webSocketDebuggerUrl);ws.onmessage=event=>{const message=JSON.parse(event.data),item=pending.get(message.id);if(item){pending.delete(message.id);message.error?item.reject(Error(JSON.stringify(message.error))):item.resolve(message.result);}};await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  for(let i=0;i<120;i++){const result=await evaluate(`window.chemistry?window.chemistry.ready.then(()=>true):false`);if(result.result.value)break;await sleep(250);}
  await evaluate(`window.desktop.agentConfigSave({provider:'local',protocol:'chat',baseUrl:'http://127.0.0.1:${API_PORT}/v1',model:'vision-test',thinking:false,apiKey:'',clearKey:true})`);
  let result=await evaluate(`(async()=>{document.querySelector('#agent-toggle').click();const base64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const file=new File([bytes],'molecule.png',{type:'image/png'}),transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelector('#agent-image-input');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));for(let i=0;i<40&&document.querySelector('#agent-image-preview').classList.contains('hidden');i++)await new Promise(r=>setTimeout(r,50));return JSON.stringify({button:document.querySelector('#agent-image-button').textContent.trim(),preview:!document.querySelector('#agent-image-preview').classList.contains('hidden'),name:document.querySelector('#agent-image-name').textContent,src:document.querySelector('#agent-image-thumbnail').src.startsWith('data:image/png;base64,')})})()`);
  let state=JSON.parse(result.result.value);check('Agent 图片入口与本地预览',state.button.includes('图片')&&state.preview&&state.name==='molecule.png'&&state.src,JSON.stringify(state));
  result=await evaluate(`(async()=>{document.querySelector('#agent-prompt').value='识别图片中的结构';document.querySelector('#agent-send').click();for(let i=0;i<120&&!document.querySelector('#agent-image-preview').classList.contains('hidden');i++)await new Promise(r=>setTimeout(r,50));return JSON.stringify({cleared:document.querySelector('#agent-image-preview').classList.contains('hidden'),approvalHidden:document.querySelector('#agent-plan').classList.contains('hidden'),reply:[...document.querySelectorAll('.agent-message.assistant')].at(-1)?.textContent||''})})()`);
  state=JSON.parse(result.result.value);check('普通答复不请求画布批准',state.cleared&&state.approvalHidden&&state.reply.includes('识别图片'),JSON.stringify(state));
  check('Chat 图片负载结构',Array.isArray(captured?.messages?.[1]?.content)&&captured.messages[1].content[0].type==='text'&&captured.messages[1].content[1].type==='image_url'&&captured.messages[1].content[1].image_url.url.startsWith('data:image/png;base64,'),JSON.stringify(captured?.messages?.[1]?.content?.map(x=>x.type)));
}catch(error){console.log('FAIL',error.stack||error.message);failed=true;}
finally{try{ws?.close();}catch{}try{proc.kill();}catch{}await sleep(700);try{proc.kill('SIGKILL');}catch{}await new Promise(resolve=>server.close(resolve));await fs.rm(dataDir,{recursive:true,force:true});}
process.exit(failed?1:0);
