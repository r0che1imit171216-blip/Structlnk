import {spawn} from 'node:child_process';
import path from 'node:path';

const PORT=9344,dataDir=path.resolve('work','clipboard-data-'+Date.now());
const exe=path.resolve('runtime','electron.exe'),appDir=path.resolve('app');
const sample='C:/Program Files/PerkinElmerInformatics/ChemOffice2022/ChemDraw/Html/benzene.cdx';
const env={...process.env,CHEMISTRY_TEST:'1',CHEMISTRY_TEST_DATA:dataDir,CHEMISTRY_TEST_CLIPBOARD_CDX_FILE:sample};delete env.ELECTRON_RUN_AS_NODE;
const proc=spawn(exe,[appDir,`--remote-debugging-port=${PORT}`],{env,stdio:'ignore',windowsHide:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws,id=0,failed=false;const pending=new Map();
const check=(name,ok,detail='')=>{if(ok)console.log('PASS',name);else{console.log('FAIL',name,detail);failed=true;}};
async function command(method,params={}){const n=++id;return new Promise((resolve,reject)=>{pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
async function evaluate(expression){return command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});}
try{
  let page;for(let i=0;i<120;i++){try{const list=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();page=list.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1'));if(page)break;}catch{}await sleep(250);}if(!page)throw Error('No debug page');
  ws=new WebSocket(page.webSocketDebuggerUrl);ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  for(let i=0;i<120;i++){const r=await evaluate(`window.chemistry?window.chemistry.ready.then(()=>true):false`);if(r.result.value)break;await sleep(250);}
  let r=await evaluate(`JSON.stringify({button:!!document.querySelector('#paste-chemdraw'),menu:[...document.querySelectorAll('#canvas-context-menu [data-canvas-action]')].map(x=>x.dataset.canvasAction)})`),state=JSON.parse(r.result.value);
  check('右键复制粘贴已合并为一组',!state.button&&JSON.stringify(state.menu)===JSON.stringify(['copy','paste']),JSON.stringify(state));
  r=await evaluate(`(()=>{const doc=document.querySelector('#ketcher-frame').contentDocument;doc.body.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:80,clientY:80}));return !document.querySelector('#canvas-context-menu').classList.contains('hidden')})()`);
  for(let i=0;i<50;i++){r=await evaluate(`(()=>{const outer=document.querySelector('#canvas-context-menu'),native=document.querySelector('#ketcher-frame').contentDocument.querySelector('[data-structlnk-context-actions]'),root=!outer.classList.contains('hidden')?outer:native;return JSON.stringify({open:!!root,copy:root?.querySelector('[data-canvas-action="copy"]')?.disabled,paste:root?.querySelector('[data-canvas-action="paste"]')?.disabled})})()`);state=JSON.parse(r.result.value);if(state.open&&state.copy&&!state.paste)break;await sleep(25);}
  check('空画布右键状态正确',state.open&&state.copy&&!state.paste,JSON.stringify(state));
  r=await evaluate(`(()=>{const doc=document.querySelector('#ketcher-frame').contentDocument;doc.body.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true,cancelable:true,button:0}));return document.querySelector('#canvas-context-menu').classList.contains('hidden')})()`);
  check('画布其他位置左键关闭菜单',r.result.value===true,String(r.result.value));
  await evaluate(`(async()=>{const e=window.chemistry.engine;await e.addFragment('CCO');e.editor.selection({atoms:[0,1,2],bonds:[0,1]});const doc=document.querySelector('#ketcher-frame').contentDocument,menu=doc.createElement('div');menu.setAttribute('role','menu');menu.style.cssText='position:fixed;width:220px;height:160px;left:80px;top:80px';doc.body.append(menu);doc.body.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:80,clientY:80}));return true})()`);await sleep(350);
  for(let i=0;i<50;i++){r=await evaluate(`(()=>{const doc=document.querySelector('#ketcher-frame').contentDocument,actions=doc.querySelector('[data-structlnk-context-actions]');return JSON.stringify({merged:!!actions,outerHidden:document.querySelector('#canvas-context-menu').classList.contains('hidden'),items:actions?[...actions.querySelectorAll('[data-canvas-action]')].map(x=>({action:x.dataset.canvasAction,disabled:x.disabled})):[]})})()`);state=JSON.parse(r.result.value);if(state.merged&&state.items.length===2&&!state.items[0].disabled&&!state.items[1].disabled)break;await sleep(25);}
  check('复制粘贴合并进对象菜单',state.merged&&state.outerHidden&&state.items.length===2&&!state.items[0].disabled&&!state.items[1].disabled,JSON.stringify(state));
  await evaluate(`document.querySelector('#ketcher-frame').contentDocument.querySelector('[data-structlnk-context-actions] [data-canvas-action="copy"]').click();true`);
  for(let i=0;i<80;i++){r=await evaluate(`window.desktop.readChemDrawClipboard().then(file=>JSON.stringify({kind:file.kind,name:file.name||'',size:file.content?.length||0}))`);state=JSON.parse(r.result.value);if(state.kind==='ket')break;await sleep(25);}
  check('画布选区写入系统剪贴板',state.kind==='ket'&&state.size>0,JSON.stringify(state));
  await evaluate(`(()=>{const doc=document.querySelector('#ketcher-frame').contentDocument;doc.querySelector('[role="menu"]')?.remove();const menu=doc.createElement('div');menu.setAttribute('role','menu');menu.style.cssText='position:fixed;width:220px;height:160px;left:80px;top:80px';doc.body.append(menu);doc.body.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:80,clientY:80}));return true})()`);await sleep(350);
  for(let i=0;i<80;i++){r=await evaluate(`(()=>{const button=document.querySelector('#ketcher-frame').contentDocument.querySelector('[data-structlnk-context-actions] [data-canvas-action="paste"]');return !!button&&!button.disabled})()`);if(r.result.value)break;await sleep(25);}
  check('画布内复制后粘贴命令亮起',r.result.value===true,String(r.result.value));
  await evaluate(`document.querySelector('#ketcher-frame').contentDocument.querySelector('[data-structlnk-context-actions] [data-canvas-action="paste"]').click();true`);
  for(let i=0;i<120;i++){r=await evaluate(`window.chemistry.agentContext().then(c=>JSON.stringify({docs:window.chemistry.state().count,atoms:c.stats.atoms,bonds:c.stats.bonds}))`);state=JSON.parse(r.result.value);if(state.atoms===6&&state.bonds===4)break;await sleep(25);}
  check('画布内容可复制并粘贴回画布',state.docs===1&&state.atoms===6&&state.bonds===4,JSON.stringify(state));
  r=await evaluate(`window.desktop.readChemDrawClipboard().then(file=>file.content||'')`);const previousClipboard=r.result.value;
  await evaluate(`(async()=>{const e=window.chemistry.engine;await e.setMolecule('CCCC');e.editor.selection({atoms:[1,2],bonds:[1]});return true})()`);
  await evaluate(`window.chemistry.canvasShortcut('copy')`);
  for(let i=0;i<120;i++){r=await evaluate(`window.desktop.readChemDrawClipboard().then(file=>JSON.stringify({kind:file.kind,content:file.content||''}))`);state=JSON.parse(r.result.value);if(state.kind==='ket'&&state.content!==previousClipboard)break;await sleep(25);}
  check('框选子结构后 Ctrl+C 写入新选区',state.kind==='ket'&&state.content!==previousClipboard,JSON.stringify({kind:state.kind,size:state.content?.length||0}));
  await evaluate(`window.chemistry.canvasShortcut('paste')`);
  for(let i=0;i<160;i++){r=await evaluate(`window.chemistry.engine.getKet().then(source=>{const ket=JSON.parse(source),molecules=ket.root.nodes.map(node=>node.$ref?ket[node.$ref]:node).filter(node=>node?.type==='molecule');return JSON.stringify({atoms:molecules.reduce((n,m)=>n+(m.atoms?.length||0),0),bonds:molecules.reduce((n,m)=>n+(m.bonds?.length||0),0),toast:document.querySelector('#toast').textContent})})`);state=JSON.parse(r.result.value);if(state.atoms===6&&state.bonds===4)break;await sleep(25);}
  check('Ctrl+V 将框选子结构粘贴回画布',state.atoms===6&&state.bonds===4,JSON.stringify(state));
  r=await evaluate(`(()=>{const selection=window.chemistry.engine.editor.selection()||{};return JSON.stringify({atoms:selection.atoms?.length||0,bonds:selection.bonds?.length||0})})()`);state=JSON.parse(r.result.value);
  check('粘贴对象保持组合选中状态',state.atoms===2&&state.bonds===1,JSON.stringify(state));
  r=await evaluate(`window.chemistry.agentContext().then(c=>{const ket=JSON.parse(c.ket),molecules=ket.root.nodes.map(node=>ket[node.$ref]).filter(node=>node?.type==='molecule'),original=molecules[0]?.atoms||[],pasted=molecules[1]?.atoms||[],originalMaxX=Math.max(...original.map(a=>a.location[0])),pastedMinX=Math.min(...pasted.map(a=>a.location[0]));return JSON.stringify({molecules:molecules.length,blankGap:pastedMinX-originalMaxX})})`);state=JSON.parse(r.result.value);
  check('粘贴副本放入画布空白处',state.molecules===2&&state.blankGap>1,JSON.stringify(state));
  r=await evaluate(`(()=>{const iframe=document.querySelector('#ketcher-frame'),frame=iframe.getBoundingClientRect(),canvas=window.chemistry.engine.editor.render?.paper?.canvas?.getBoundingClientRect();return JSON.stringify({found:!!canvas,x:frame.left+(canvas?.right||0)-12,y:frame.top+(canvas?.bottom||0)-12})})()`);const point=JSON.parse(r.result.value);if(!point.found)throw Error('未找到画布点击区域');
  await command('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});await command('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});await sleep(150);
  r=await evaluate(`JSON.stringify(window.chemistry.engine.editor.selection()||{})`);state=JSON.parse(r.result.value);
  check('点击画布后取消粘贴组合',(state.atoms?.length||0)+(state.bonds?.length||0)===0,JSON.stringify(state));
}catch(error){console.log('FAIL',error.stack||error.message);failed=true;}
finally{try{ws?.close();}catch{}try{proc.kill();}catch{}await sleep(600);try{proc.kill('SIGKILL');}catch{}}
process.exit(failed?1:0);
