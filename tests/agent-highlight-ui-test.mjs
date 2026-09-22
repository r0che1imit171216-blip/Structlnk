import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEBUG_PORT=9355,API_PORT=9356,dataDir=path.resolve('work','agent-highlight-ui-data-'+Date.now());
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let captured=null,failed=false,ws,id=0;const pending=new Map();
const check=(name,ok,detail='')=>{if(ok)console.log('PASS',name);else{console.log('FAIL',name,detail);failed=true;}};
const server=createServer((req,res)=>{let text='';req.on('data',chunk=>text+=chunk);req.on('end',()=>{const body=JSON.parse(text),user=JSON.parse(body.messages[1].content);captured=user;const map=user.canvas.structureMap,result={message:'给苯环添加浅黄色背景。',warnings:[],mode:'set_highlight',source:null,ket:null,highlight:{color:'#F4D35E',target:'ids',atoms:map.atoms.map(x=>x.id),bonds:map.bonds.map(x=>x.id)}};res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]}));});});
await new Promise((resolve,reject)=>server.listen(API_PORT,'127.0.0.1',error=>error?reject(error):resolve()));
const env={...process.env,CHEMISTRY_TEST:'1',CHEMISTRY_TEST_DATA:dataDir};delete env.ELECTRON_RUN_AS_NODE;
const proc=spawn(path.resolve('runtime','electron.exe'),[path.resolve('app'),`--remote-debugging-port=${DEBUG_PORT}`],{env,stdio:'ignore',windowsHide:true});
const evaluate=expression=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
try{
  let page;for(let i=0;i<120;i++){try{const list=await(await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();page=list.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1'));if(page)break;}catch{}await sleep(250);}if(!page)throw Error('No debug page');
  ws=new WebSocket(page.webSocketDebuggerUrl);ws.onmessage=event=>{const message=JSON.parse(event.data),item=pending.get(message.id);if(item){pending.delete(message.id);message.error?item.reject(Error(JSON.stringify(message.error))):item.resolve(message.result);}};await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  for(let i=0;i<120;i++){const result=await evaluate(`window.chemistry?window.chemistry.ready.then(()=>true):false`);if(result.result.value)break;await sleep(250);}
  await evaluate(`window.desktop.agentConfigSave({provider:'local',protocol:'chat',baseUrl:'http://127.0.0.1:${API_PORT}/v1',model:'highlight-test',thinking:false,apiKey:'',clearKey:true})`);
  await evaluate(`window.chemistry.engine.addFragment('c1ccccc1').then(()=>window.chemistry.sync())`);
  let result=await evaluate(`window.chemistry.agentContext().then(c=>JSON.stringify({atoms:c.structureMap.atoms.length,bonds:c.structureMap.bonds.length,highlights:c.highlights.length}))`),state=JSON.parse(result.result.value);
  check('Agent 获得苯环对象映射',state.atoms===6&&state.bonds===6&&state.highlights===0,JSON.stringify(state));
  result=await evaluate(`(async()=>{document.querySelector('#agent-toggle').click();document.querySelector('#agent-prompt').value='给苯环上一个浅黄色背景色';document.querySelector('#agent-send').click();for(let i=0;i<120&&document.querySelector('#agent-plan').classList.contains('hidden');i++)await new Promise(r=>setTimeout(r,50));const summary=document.querySelector('#agent-plan-summary').textContent;document.querySelector('#agent-apply').click();for(let i=0;i<120&&window.chemistry.getHighlights().length===0;i++)await new Promise(r=>setTimeout(r,50));return JSON.stringify({summary,highlights:window.chemistry.getHighlights(),saved:window.chemistry.getProject().highlights})})()`);state=JSON.parse(result.result.value);
  const item=state.highlights[0];check('自然语言配色方案应用到苯环',state.summary.includes('浅黄色')&&item?.color==='#F4D35E'&&item.atoms.length===6&&item.bonds.length===6,JSON.stringify(state));
  check('Agent 配色写入项目数据',JSON.stringify(state.highlights)===JSON.stringify(state.saved),JSON.stringify(state));
  check('请求包含完整对象映射',captured?.canvas?.structureMap?.atoms?.length===6&&captured?.canvas?.structureMap?.bonds?.length===6,JSON.stringify(captured?.canvas?.structureMap));
  result=await evaluate(`window.chemistry.undo().then(()=>window.chemistry.getHighlights().length)`);check('Agent 配色支持撤销',result.result.value===0,String(result.result.value));
}catch(error){console.log('FAIL',error.stack||error.message);failed=true;}
finally{try{ws?.close();}catch{}try{proc.kill();}catch{}await sleep(700);try{proc.kill('SIGKILL');}catch{}await new Promise(resolve=>server.close(resolve));await fs.rm(dataDir,{recursive:true,force:true});}
process.exit(failed?1:0);
