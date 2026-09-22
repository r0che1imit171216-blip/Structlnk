import {spawn} from 'node:child_process';
import path from 'node:path';

const port=9352,dataDir=path.resolve('work','highlight-data-'+Date.now());
const env={...process.env,CHEMISTRY_TEST:'1',CHEMISTRY_TEST_DATA:dataDir};delete env.ELECTRON_RUN_AS_NODE;
const proc=spawn(path.resolve('runtime','electron.exe'),[path.resolve('app'),`--remote-debugging-port=${port}`],{env,stdio:'ignore',windowsHide:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws,id=0,failed=false;const pending=new Map();
const check=(name,ok,detail='')=>{if(ok)console.log('PASS',name);else{console.log('FAIL',name,detail);failed=true;}};
const evaluate=expression=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
try{
  let page;for(let i=0;i<120;i++){try{const list=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();page=list.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1'));if(page)break;}catch{}await sleep(250);}if(!page)throw Error('No debug page');
  ws=new WebSocket(page.webSocketDebuggerUrl);ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  for(let i=0;i<120;i++){const r=await evaluate(`window.chemistry?window.chemistry.ready.then(()=>true):false`);if(r.result.value)break;await sleep(250);}
  let r=await evaluate(`JSON.stringify({button:document.querySelector('#highlight-colors')?.textContent.trim(),presets:document.querySelectorAll('#highlight-presets [data-color]').length,picker:document.querySelector('#highlight-color')?.type})`),state=JSON.parse(r.result.value);
  check('自定义配色入口与取色器',state.button==='配色'&&state.presets===16&&state.picker==='color',JSON.stringify(state));
  r=await evaluate(`(async()=>{const e=window.chemistry.engine;await e.addFragment('c1ccccc1');await window.chemistry.sync();const s=e.editor.struct();e.editor.selection({atoms:[...s.atoms.keys()].slice(0,2),bonds:[...s.bonds.keys()].slice(0,1)});document.querySelector('#highlight-colors').click();document.querySelector('#highlight-color').value='#7b2cbf';document.querySelector('#highlight-apply').click();for(let i=0;i<80&&!document.querySelector('#busy-overlay').classList.contains('hidden');i++)await new Promise(r=>setTimeout(r,50));await new Promise(r=>setTimeout(r,200));return JSON.stringify({highlights:window.chemistry.getHighlights(),saved:window.chemistry.getProject().highlights,dialog:document.querySelector('#highlight-dialog').open,firstId:window.chemistry.state().activeId})})()`);state=JSON.parse(r.result.value);
  check('任意颜色应用到选区',state.highlights.length===1&&state.highlights[0].color==='#7B2CBF'&&state.highlights[0].atoms.length===2&&state.highlights[0].bonds.length===1&&!state.dialog,JSON.stringify(state));
  check('配色写入项目数据',JSON.stringify(state.highlights)===JSON.stringify(state.saved),JSON.stringify(state));
  const firstId=state.firstId;
  r=await evaluate(`(async()=>{await window.chemistry.newDocument();await window.chemistry.activateDoc(${JSON.stringify(firstId)});await new Promise(r=>setTimeout(r,150));return JSON.stringify({highlights:window.chemistry.getHighlights(),saved:window.chemistry.getProject().highlights})})()`);state=JSON.parse(r.result.value);
  check('切换画布后恢复配色',state.highlights.length===1&&state.highlights[0].color==='#7B2CBF'&&JSON.stringify(state.highlights)===JSON.stringify(state.saved),JSON.stringify(state));
  r=await evaluate(`(async()=>{await window.chemistry.undo();await new Promise(r=>setTimeout(r,100));const afterUndo=window.chemistry.getHighlights(),savedUndo=window.chemistry.getProject().highlights;await window.chemistry.redo();await new Promise(r=>setTimeout(r,150));return JSON.stringify({afterUndo,savedUndo,afterRedo:window.chemistry.getHighlights(),savedRedo:window.chemistry.getProject().highlights})})()`);state=JSON.parse(r.result.value);
  check('配色支持撤销重做',state.afterUndo.length===0&&state.afterRedo.length===1&&state.afterRedo[0].color==='#7B2CBF',JSON.stringify(state));
  r=await evaluate(`window.chemistry.clearHighlights().then(()=>window.chemistry.getHighlights().length)`);
  check('清除全部配色',r.result.value===0,String(r.result.value));
}catch(error){console.log('FAIL',error.stack||error.message);failed=true;}
finally{try{ws?.close();}catch{}try{proc.kill();}catch{}await sleep(600);try{proc.kill('SIGKILL');}catch{}}
process.exit(failed?1:0);
