import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEBUG_PORT=9365,dataDir=path.resolve('work','acs-geometry-data-'+Date.now());
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let failed=false,ws,id=0;const pending=new Map();
const check=(name,ok,detail='')=>{if(ok)console.log('PASS',name);else{console.log('FAIL',name,detail);failed=true;}};
const env={...process.env,CHEMISTRY_TEST:'1',CHEMISTRY_TEST_DATA:dataDir};delete env.ELECTRON_RUN_AS_NODE;
const proc=spawn(path.resolve('runtime','electron.exe'),[path.resolve('app'),`--remote-debugging-port=${DEBUG_PORT}`],{env,stdio:'ignore',windowsHide:true});
const evaluate=expression=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
try{
  let page;for(let i=0;i<120;i++){try{const list=await(await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();page=list.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1'));if(page)break;}catch{}await sleep(250);}if(!page)throw Error('No debug page');
  ws=new WebSocket(page.webSocketDebuggerUrl);ws.onmessage=event=>{const message=JSON.parse(event.data),item=pending.get(message.id);if(item){pending.delete(message.id);message.error?item.reject(Error(JSON.stringify(message.error))):item.resolve(message.result);}};await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  for(let i=0;i<120;i++){const result=await evaluate(`window.chemistry?window.chemistry.ready.then(()=>true):false`);if(result.result.value)break;await sleep(250);}
  const result=await evaluate(`(async()=>{const e=window.chemistry.engine;await e.addFragment('CCO');await window.chemistry.sync();document.querySelector('#drawing-style').value='acs1996';document.querySelector('#drawing-style').dispatchEvent(new Event('change',{bubbles:true}));for(let i=0;i<100&&!document.querySelector('#busy-overlay').classList.contains('hidden');i++)await new Promise(r=>setTimeout(r,25));await new Promise(r=>setTimeout(r,150));const ket=JSON.parse(await e.getKet()),ref=ket.root.nodes.find(n=>n.$ref)?.$ref,mol=ket[ref],before=mol.atoms.map(a=>[...a.location]);mol.atoms[2].location[0]+=1.35;mol.atoms[2].location[1]+=0.65;await e.setMolecule(JSON.stringify(ket),{preserveCanvasPosition:true});await window.chemistry.sync();const saved=JSON.parse(window.chemistry.getProject().ket),savedMol=saved[saved.root.nodes.find(n=>n.$ref).$ref],after=savedMol.atoms.map(a=>[...a.location]);return JSON.stringify({style:window.chemistry.getProject().drawingStyle,summary:document.querySelector('#style-summary').textContent,before,after})})()`);
  const state=JSON.parse(result.result.value),moved=Math.abs(state.after[2][0]-state.before[2][0])>1&&Math.abs(state.after[2][1]-state.before[2][1])>.5;
  check('ACS 兼容样式保留手动原子坐标',state.style==='acs1996'&&moved,JSON.stringify(state));
  check('ACS 样式提示可手动疏排',state.summary.includes('拖动原子'),state.summary);
}catch(error){console.log('FAIL',error.stack||error.message);failed=true;}
finally{try{ws?.close();}catch{}try{proc.kill();}catch{}await sleep(700);try{proc.kill('SIGKILL');}catch{}await fs.rm(dataDir,{recursive:true,force:true});}
process.exit(failed?1:0);
