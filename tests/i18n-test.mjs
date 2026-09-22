import {spawn} from 'node:child_process';
import path from 'node:path';

const dataDir=path.resolve('work','i18n-data-'+Date.now());
const exe=path.resolve('runtime','electron.exe'),appDir=path.resolve('app');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let failed=false;
function check(name,condition,detail=''){if(condition)console.log('PASS',name);else{console.log('FAIL',name,detail);failed=true;}}

async function launch(port){
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;env.CHEMISTRY_TEST='1';env.CHEMISTRY_TEST_DATA=dataDir;
  const proc=spawn(exe,[appDir,`--remote-debugging-port=${port}`],{env,stdio:'ignore',windowsHide:true});
  let page;
  for(let i=0;i<120;i++){try{const items=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();page=items.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1'));if(page)break;}catch{}await sleep(250);}
  if(!page)throw Error('No Electron debug page');
  const ws=new WebSocket(page.webSocketDebuggerUrl),pending=new Map();let id=0;
  ws.onmessage=e=>{const m=JSON.parse(e.data);const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  const evaluate=expression=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
  for(let i=0;i<120;i++){const r=await evaluate(`window.chemistry?window.chemistry.ready.then(()=>true):false`);if(r?.result?.value)break;await sleep(250);}
  return {proc,ws,evaluate,async stop(){try{ws.close();}catch{}try{proc.kill();}catch{}await sleep(700);try{proc.kill('SIGKILL');}catch{}}};
}

let first,second;
try{
  first=await launch(9341);
  let r=await first.evaluate(`JSON.stringify({lang:document.documentElement.lang,toggle:document.querySelector('#language-toggle')?.textContent,open:document.querySelector('#open-project')?.textContent.trim(),agent:document.querySelector('.agent-head strong')?.textContent.trim()})`);
  let state=JSON.parse(r.result.value);
  check('默认中文界面',state.lang==='zh-CN'&&state.toggle==='EN'&&state.open==='打开'&&state.agent==='画布 Agent',JSON.stringify(state));
  r=await first.evaluate(`document.querySelector('#language-toggle').click();JSON.stringify({lang:document.documentElement.lang,toggle:document.querySelector('#language-toggle').textContent,open:document.querySelector('#open-project').textContent.trim(),save:document.querySelector('#save-project').textContent.trim(),newButton:document.querySelector('#new-project').textContent.trim(),agent:document.querySelector('.agent-head strong').textContent.trim(),stored:localStorage.getItem('chemistry-language'),count:document.querySelector('#object-count').textContent})`);
  state=JSON.parse(r.result.value);
  check('切换为英文',state.lang==='en'&&state.toggle==='中文'&&state.open==='Open'&&state.save==='Save project'&&state.newButton==='＋ New'&&state.agent==='Canvas Agent'&&state.stored==='en'&&state.count.includes('atoms'),JSON.stringify(state));
  r=await first.evaluate(`JSON.stringify([...document.querySelectorAll('body *:not(script):not(style):not(pre)')].filter(el=>!el.closest('#language-toggle,#doc-dock')).flatMap(el=>[...el.childNodes].filter(n=>n.nodeType===3&&/[\\u3400-\\u9fff]/.test(n.nodeValue)).map(n=>n.nodeValue.trim())).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i))`);
  const untranslated=JSON.parse(r.result.value);check('英文界面无残留中文壳层文本',untranslated.length===0,JSON.stringify(untranslated));
  await sleep(300);
  r=await first.evaluate(`document.querySelector('#style-details').click();JSON.stringify({heading:document.querySelector('#style-dialog h2').textContent.trim(),close:document.querySelector('#close-style-dialog').textContent.trim()})`);
  state=JSON.parse(r.result.value);check('弹窗同步英文',state.heading==='ACS 1996 Compatible Style'&&state.close==='Close',JSON.stringify(state));
  await first.evaluate(`document.querySelector('#style-dialog').close();true`);
  await first.stop();first=null;
  second=await launch(9342);
  r=await second.evaluate(`JSON.stringify({lang:document.documentElement.lang,toggle:document.querySelector('#language-toggle')?.textContent,open:document.querySelector('#open-project')?.textContent.trim(),stored:localStorage.getItem('chemistry-language')})`);
  state=JSON.parse(r.result.value);check('重启保持英文',state.lang==='en'&&state.toggle==='中文'&&state.open==='Open',JSON.stringify(state));
  r=await second.evaluate(`document.querySelector('#language-toggle').click();JSON.stringify({lang:document.documentElement.lang,toggle:document.querySelector('#language-toggle').textContent,open:document.querySelector('#open-project').textContent.trim(),stored:localStorage.getItem('chemistry-language')})`);
  state=JSON.parse(r.result.value);check('可切回中文',state.lang==='zh-CN'&&state.toggle==='EN'&&state.open==='打开'&&state.stored==='zh',JSON.stringify(state));
}catch(e){console.log('FAIL',e.stack||e.message);failed=true;}
finally{if(first)await first.stop();if(second)await second.stop();}
process.exit(failed?1:0);
