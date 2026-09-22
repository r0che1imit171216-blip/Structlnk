import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEBUG_PORT=9363,dataDir=path.resolve('work','launcher-data-'+Date.now());
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let proc;
try{
  const env={...process.env,CHEMISTRY_TEST:'1',CHEMISTRY_TEST_DATA:dataDir};delete env.ELECTRON_RUN_AS_NODE;
  proc=spawn(path.resolve('runtime','electron.exe'),[`--remote-debugging-port=${DEBUG_PORT}`],{cwd:path.resolve('.'),env,stdio:'ignore',windowsHide:true});
  let page;for(let i=0;i<120;i++){try{const list=await(await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();page=list.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1'));if(page)break;}catch{}await sleep(250);}
  if(!page)throw Error('No Structlnk page from runtime launcher');
  console.log('PASS runtime/electron.exe 无参数启动 Structlnk');
}catch(error){console.error('FAIL',error.stack||error);process.exitCode=1;}
finally{try{proc?.kill();}catch{}await sleep(700);try{proc?.kill('SIGKILL');}catch{}await fs.rm(dataDir,{recursive:true,force:true});}
