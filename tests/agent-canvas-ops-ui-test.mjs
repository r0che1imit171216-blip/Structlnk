import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEBUG_PORT=9361,API_PORT=9362,dataDir=path.resolve('work','agent-canvas-ops-ui-data-'+Date.now());
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let captured=null,failed=false,ws,id=0;const pending=new Map();
const check=(name,ok,detail='')=>{if(ok)console.log('PASS',name);else{console.log('FAIL',name,detail);failed=true;}};
const empty={source:null,text:null,arrowType:null,at:null,from:null,to:null,center:null,atomIds:[],bondIds:[],textIds:[],arrowIds:[],dx:null,dy:null,angle:null,axis:null,value:null,atomId:null,label:null,charge:null,bondId:null,bondType:null};
const operation=(op,fields={})=>({op,...empty,...fields});
const server=createServer((req,res)=>{let text='';req.on('data',chunk=>text+=chunk);req.on('end',()=>{const body=JSON.parse(text),user=JSON.parse(body.messages[1].content),map=user.canvas.structureMap;captured=user;const atomIds=map.atoms.map(x=>x.id),bondId=map.bonds[0].id,result={message:'把第一个碳改为带正电的氮，调整结构并在右侧加入苯、条件文字和反应箭头。',warnings:[],mode:'canvas_ops',source:null,ket:null,operations:[operation('set_atom',{atomId:atomIds[0],label:'N',charge:1}),operation('set_bond',{bondId,bondType:2}),operation('move_objects',{atomIds:[atomIds[1]],dx:.35,dy:.2}),operation('rotate_objects',{atomIds,angle:8}),operation('add_structure',{source:'c1ccccc1'}),operation('add_text',{text:'Pd/C'}),operation('add_arrow',{arrowType:'reaction'})],highlight:null};res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]}));});});
await new Promise((resolve,reject)=>server.listen(API_PORT,'127.0.0.1',error=>error?reject(error):resolve()));
const env={...process.env,CHEMISTRY_TEST:'1',CHEMISTRY_TEST_DATA:dataDir};delete env.ELECTRON_RUN_AS_NODE;
const proc=spawn(path.resolve('runtime','electron.exe'),[path.resolve('app'),`--remote-debugging-port=${DEBUG_PORT}`],{env,stdio:'ignore',windowsHide:true});
const evaluate=expression=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
try{
  let page;for(let i=0;i<120;i++){try{const list=await(await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();page=list.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1'));if(page)break;}catch{}await sleep(250);}if(!page)throw Error('No debug page');
  ws=new WebSocket(page.webSocketDebuggerUrl);ws.onmessage=event=>{const message=JSON.parse(event.data),item=pending.get(message.id);if(item){pending.delete(message.id);message.error?item.reject(Error(JSON.stringify(message.error))):item.resolve(message.result);}};await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  for(let i=0;i<120;i++){const result=await evaluate(`window.chemistry?window.chemistry.ready.then(()=>true):false`);if(result.result.value)break;await sleep(250);}
  await evaluate(`window.desktop.agentConfigSave({provider:'local',protocol:'chat',baseUrl:'http://127.0.0.1:${API_PORT}/v1',model:'canvas-ops-test',thinking:false,apiKey:'',clearKey:true})`);
  await evaluate(`window.chemistry.engine.addFragment('CCO').then(()=>window.chemistry.sync())`);
  let result=await evaluate(`window.chemistry.agentContext().then(c=>JSON.stringify({stats:c.stats,maxX:Math.max(...c.structureMap.atoms.map(a=>a.location[0]))}))`),before=JSON.parse(result.result.value);
  check('测试画布已准备',before.stats.atoms===3&&before.stats.bonds===2,JSON.stringify(before));
  result=await evaluate(`(async()=>{document.querySelector('#agent-toggle').click();document.querySelector('#agent-prompt').value='修改结构，并在空白处加入苯、Pd/C 和反应箭头';document.querySelector('#agent-send').click();for(let i=0;i<160&&document.querySelector('#agent-plan').classList.contains('hidden');i++)await new Promise(r=>setTimeout(r,50));const p=window.chemistry.getProject(),summary=document.querySelector('#agent-plan-summary').textContent;return JSON.stringify({summary,stats:(${JSON.stringify(null)}||0),ket:p.ket,applyDisabled:document.querySelector('#agent-apply').disabled})})()`);let pendingState=JSON.parse(result.result.value),pendingKet=JSON.parse(pendingState.ket);
  const pendingAtoms=Object.values(pendingKet).filter(x=>x?.type==='molecule').reduce((n,m)=>n+(m.atoms?.length||0),0);
  check('方案生成后等待用户批准',pendingState.summary.includes('右侧加入苯')&&!pendingState.applyDisabled&&pendingAtoms===3,pendingState.summary);
  result=await evaluate(`(async()=>{document.querySelector('#agent-apply').click();for(let i=0;i<160;i++){const c=await window.chemistry.agentContext();if(c.stats.atoms===9&&c.stats.texts===1&&c.stats.arrows===1)return JSON.stringify({stats:c.stats,map:c.structureMap,atom:{label:window.chemistry.engine.editor.struct().atoms.get(c.structureMap.atoms[0].id)?.label,charge:window.chemistry.engine.editor.struct().atoms.get(c.structureMap.atoms[0].id)?.charge},bondType:window.chemistry.engine.editor.struct().bonds.get(c.structureMap.bonds[0].id)?.type,undoEnabled:!document.querySelector('#undo').disabled});await new Promise(r=>setTimeout(r,50));}return JSON.stringify({timeout:true,error:[...document.querySelectorAll('.agent-message.error')].at(-1)?.textContent||'',project:window.chemistry.getProject()})})()`);if(typeof result.result.value!=='string'||!result.result.value.startsWith('{'))throw Error('Canvas operation result: '+JSON.stringify(result));const state=JSON.parse(result.result.value);
  check('批量操作加入可编辑结构、文字和箭头',state.stats?.atoms===9&&state.stats?.bonds===8&&state.stats?.texts===1&&state.stats?.arrows===1,JSON.stringify(state.stats||state));
  check('原子和键属性按 ID 修改',state.atom?.label==='N'&&state.atom?.charge===1&&state.bondType===2,JSON.stringify({atom:state.atom,bondType:state.bondType}));
  check('新增结构自动放到右侧空白处',Math.max(...state.map.atoms.map(a=>a.location[0]))>before.maxX+2,JSON.stringify({before:before.maxX,after:Math.max(...state.map.atoms.map(a=>a.location[0]))}));
  check('整批 Agent 操作生成可撤销记录',state.undoEnabled===true,String(state.undoEnabled));
  check('模型请求包含画布对象 ID',captured?.canvas?.structureMap?.atoms?.length===3&&captured?.canvas?.structureMap?.bonds?.length===2,JSON.stringify(captured?.canvas?.structureMap));
  result=await evaluate(`window.chemistry.undo().then(()=>window.chemistry.agentContext()).then(c=>JSON.stringify(c.stats))`);const undone=JSON.parse(result.result.value);
  check('一次撤销恢复整批操作',undone.atoms===3&&undone.bonds===2&&undone.texts===0&&undone.arrows===0,JSON.stringify(undone));
  result=await evaluate(`(async()=>{const c=await window.chemistry.agentContext(),blank={source:null,text:null,arrowType:null,at:null,from:null,to:null,center:null,atomIds:[],bondIds:[],textIds:[],arrowIds:[],dx:null,dy:null,angle:null,axis:null,value:null,atomId:null,label:null,charge:null,bondId:null,bondType:null},op={...blank,op:'align_objects',atomIds:c.structureMap.atoms.map(a=>a.id),axis:'y',value:1.25};await window.chemistry.applyAgentPlan({message:'对齐',warnings:[],mode:'canvas_ops',source:null,ket:null,operations:[op],highlight:null});const after=await window.chemistry.agentContext();return JSON.stringify(after.structureMap.atoms.map(a=>a.location[1]))})()`);const aligned=JSON.parse(result.result.value);
  check('Agent 对齐操作修改真实原子坐标',aligned.length===3&&Math.max(...aligned)-Math.min(...aligned)<.02,JSON.stringify(aligned));
  await evaluate(`window.chemistry.undo()`);
}catch(error){console.log('FAIL',error.stack||error.message);failed=true;}
finally{try{ws?.close();}catch{}try{proc.kill();}catch{}await sleep(700);try{proc.kill('SIGKILL');}catch{}await new Promise(resolve=>server.close(resolve));await fs.rm(dataDir,{recursive:true,force:true});}
process.exit(failed?1:0);
