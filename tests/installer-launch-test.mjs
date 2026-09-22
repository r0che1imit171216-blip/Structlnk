import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.env.STRUCTLNK_INSTALLED_ROOT;
if(!root)throw Error('STRUCTLNK_INSTALLED_ROOT is required');
const DEBUG_PORT=9364,dataDir=path.resolve('work','installer-launch-data-'+Date.now());
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let proc;
try{
  const exe=path.join(root,'runtime','Structlnk.exe');
  await fs.access(path.join(root,'.structlnk-installed'));await fs.access(exe);
  for(const excluded of ['sources','work','data']){try{await fs.access(path.join(root,excluded));throw Error(`Development directory was installed: ${excluded}`);}catch(error){if(error.code!=='ENOENT')throw error;}}
  const env={...process.env,CHEMISTRY_TEST:'1',CHEMISTRY_TEST_DATA:dataDir};delete env.ELECTRON_RUN_AS_NODE;
  proc=spawn(exe,[`--remote-debugging-port=${DEBUG_PORT}`],{cwd:root,env,stdio:'ignore',windowsHide:true});
  let page;for(let i=0;i<120;i++){try{const list=await(await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();page=list.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1'));if(page)break;}catch{}await sleep(250);}if(!page)throw Error('Installed Structlnk did not open');
  const response=await fetch(page.url),html=await response.text();if(!html.includes('Untitled Drawing'))throw Error('Installed UI does not contain the current default drawing name');
  console.log('PASS 安装目录只包含运行与许可文件');
  console.log('PASS 安装版 Structlnk.exe 可直接启动');
  console.log('PASS 安装版包含当前界面源码');
}catch(error){console.error('FAIL',error.stack||error);process.exitCode=1;}
finally{try{proc?.kill();}catch{}await sleep(700);try{proc?.kill('SIGKILL');}catch{}await fs.rm(dataDir,{recursive:true,force:true});}
