import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const PORT=9357,dataDir=path.resolve('work','dock-rename-data-'+Date.now());
const env={...process.env,CHEMISTRY_TEST:'1',CHEMISTRY_TEST_DATA:dataDir};delete env.ELECTRON_RUN_AS_NODE;
const proc=spawn(path.resolve('runtime','electron.exe'),[path.resolve('app'),`--remote-debugging-port=${PORT}`],{env,stdio:'ignore',windowsHide:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let ws,id=0,failed=false;const pending=new Map();
const check=(name,ok,detail='')=>{if(ok)console.log('PASS',name);else{console.log('FAIL',name,detail);failed=true;}};
const evaluate=expression=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
try{
  let page;for(let i=0;i<120;i++){try{const list=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();page=list.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1'));if(page)break;}catch{}await sleep(250);}if(!page)throw Error('No debug page');
  ws=new WebSocket(page.webSocketDebuggerUrl);ws.onmessage=event=>{const message=JSON.parse(event.data),item=pending.get(message.id);if(item){pending.delete(message.id);message.error||message.result?.exceptionDetails?item.reject(Error(JSON.stringify(message.error||message.result.exceptionDetails))):item.resolve(message.result);}};await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  for(let i=0;i<120;i++){const result=await evaluate(`window.chemistry?window.chemistry.ready.then(()=>true):false`);if(result.result.value)break;await sleep(250);}
  for(let i=0;i<120;i++){const result=await evaluate(`document.querySelector('#engine-loading')?.classList.contains('hidden')&&document.querySelectorAll('.doc-tile').length>0`);if(result.result.value)break;await sleep(100);}
  let result=await evaluate(`JSON.stringify({tiles:document.querySelectorAll('.doc-tile').length,edit:document.querySelector('.doc-tile-edit')?.title,name:document.querySelector('.doc-tile-name')?.textContent.trim(),topMinimize:!!document.querySelector('#doc-minimize')})`),state=JSON.parse(result.result.value);
  check('顶部不再显示最小化按钮',state.topMinimize===false,JSON.stringify(state));
  check('默认画布名称使用英文',state.name==='Untitled Drawing',JSON.stringify(state));
  check('底部窗口提供重命名入口',state.tiles===1&&state.edit==='重命名画布',JSON.stringify(state));
  result=await evaluate(`(async()=>{let input;for(let i=0;i<20&&!input;i++){document.querySelector('.doc-tile-edit')?.click();await new Promise(r=>setTimeout(r,50));input=document.querySelector('.doc-tile-rename');}const opened=!!input;input.value='苯环反应';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));for(let i=0;i<80&&document.querySelector('.doc-tile-rename');i++)await new Promise(r=>setTimeout(r,50));await new Promise(r=>setTimeout(r,200));return JSON.stringify({opened,project:window.chemistry.getProject().name,top:document.querySelector('#project-name').value,tile:document.querySelector('.doc-tile-name').textContent.trim()})})()`);state=JSON.parse(result.result.value);
  check('底部窗口直接重命名当前画布',state.opened&&state.project==='苯环反应'&&state.top==='苯环反应'&&state.tile.includes('苯环反应'),JSON.stringify(state));
  result=await evaluate(`window.chemistry.undo().then(()=>window.chemistry.getProject().name)`);check('重命名支持撤销',result.result.value==='Untitled Drawing',String(result.result.value));
  result=await evaluate(`(async()=>{await window.chemistry.redo();const id=await window.chemistry.newDocument();await window.chemistry.minimizeActive();let input;for(let i=0;i<20&&!input;i++){document.querySelectorAll('.doc-tile')[1]?.querySelector('.doc-tile-edit')?.click();await new Promise(r=>setTimeout(r,50));input=document.querySelectorAll('.doc-tile')[1]?.querySelector('.doc-tile-rename');}input.value='催化循环';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));for(let i=0;i<80&&document.querySelector('.doc-tile-rename');i++)await new Promise(r=>setTimeout(r,50));await new Promise(r=>setTimeout(r,200));const state=window.chemistry.state(),doc=state.docs.find(d=>d.id===id),recovery=await window.desktop.recover(),saved=JSON.parse(recovery.contents[id]);return JSON.stringify({name:doc.name,minimized:doc.minimized,activeId:state.activeId,saved:saved.name})})()`);state=JSON.parse(result.result.value);
  check('最小化画布可重命名且不被还原',state.name==='催化循环'&&state.minimized&&state.activeId===null,JSON.stringify(state));
  check('重命名写入自动恢复项目',state.saved==='催化循环',JSON.stringify(state));
  result=await evaluate(`(async()=>{const name=document.querySelectorAll('.doc-tile')[1]?.querySelector('.doc-tile-name');name.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));await new Promise(r=>setTimeout(r,50));const input=document.querySelectorAll('.doc-tile')[1]?.querySelector('.doc-tile-rename');input.value='不应保存';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await new Promise(r=>setTimeout(r,50));return window.chemistry.state().docs[1].name})()`);check('双击名称进入编辑且 Esc 取消',result.result.value==='催化循环',String(result.result.value));
}catch(error){console.log('FAIL',error.stack||error.message);failed=true;}
finally{try{ws?.close();}catch{}try{proc.kill();}catch{}await sleep(700);try{proc.kill('SIGKILL');}catch{}await fs.rm(dataDir,{recursive:true,force:true});}
process.exit(failed?1:0);
