const {app, BrowserWindow, ipcMain, dialog, session, Menu, safeStorage, clipboard, ClipboardItem} = require('electron');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {createAgentService}=require('./agent-service.cjs');
const {isInterestingFormat,detectChemDrawClipboard}=require('./clipboard-import.cjs');
const root = __dirname;
app.setName('Structlnk');
const installed=fsSync.existsSync(path.resolve(root,'../.structlnk-installed'));
const dataDir = process.env.CHEMISTRY_TEST==='1'&&process.env.CHEMISTRY_TEST_DATA ? path.resolve(process.env.CHEMISTRY_TEST_DATA) : installed ? path.join(app.getPath('appData'),'Structlnk') : path.resolve(root, '../data');
app.setPath('userData', path.join(dataDir, 'profile'));
let win, server, pendingOpenPath = null, allowClose=false;
const docPaths=new Map();
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.wasm':'application/wasm','.woff2':'font/woff2','.ico':'image/x-icon'};
const MAX = 40 * 1024 * 1024;
const agent=createAgentService({dataDir,safeStorage});
async function atomicWrite(file, text) {
  await fs.mkdir(path.dirname(file), {recursive:true});
  const temp = file + '.tmp';
  await fs.writeFile(temp, text);
  try { await fs.copyFile(file, file + '.bak'); } catch(e) { if (e.code !== 'ENOENT') throw e; }
  await fs.rename(temp, file);
}
function checkText(text) { if(typeof text !== 'string' || Buffer.byteLength(text) > MAX) throw Error('文件内容无效或超过 40 MB'); }
function checkDocId(id) { if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(id))throw Error('文档标识无效'); }
function trusted(event) { if(event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw Error('请求来源无效'); }
function handle(name, fn) { ipcMain.handle(name, async (e,...args) => {trusted(e); return fn(...args);}); }
async function readChemDrawClipboard(){
  const entries=[],formats=[];
  if(typeof clipboard.read==='function'){
    for(const item of await clipboard.read())for(const format of item.types||[]){formats.push(format);if(!isInterestingFormat(format))continue;try{const blob=await item.getType(format);if(blob.size<=MAX)entries.push({format,bytes:Buffer.from(await blob.arrayBuffer())});}catch{}}
  }else if(typeof clipboard.availableFormats==='function'&&typeof clipboard.readBuffer==='function'){
    for(const format of clipboard.availableFormats()){formats.push(format);if(!isInterestingFormat(format))continue;try{const bytes=clipboard.readBuffer(format);if(bytes.length<=MAX)entries.push({format,bytes});}catch{}}
  }
  const result=detectChemDrawClipboard(entries);if(result)return result;
  if(formats.some(format=>/^image\//i.test(format)||/metafile|bitmap/i.test(format)))return {kind:'unavailable',reason:'image-only'};
  return {kind:'unavailable',reason:'not-found'};
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
 app.on('second-instance',()=>{if(win){if(win.isMinimized()) win.restore();win.focus();}});
 app.whenReady().then(async()=>{
  await fs.mkdir(dataDir,{recursive:true});
  if(process.env.CHEMISTRY_TEST==='1'&&process.env.CHEMISTRY_TEST_CLIPBOARD_CDX_FILE){const bytes=await fs.readFile(path.resolve(process.env.CHEMISTRY_TEST_CLIPBOARD_CDX_FILE));if(typeof clipboard.write==='function')await clipboard.write([new ClipboardItem({'electron application/osclipboard;format="ChemDraw Interchange Format"':new Blob([bytes])})]);else clipboard.writeBuffer('ChemDraw Interchange Format',bytes);}
  server = http.createServer(async(req,res)=>{
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {res.writeHead(405);return res.end();}
      const relative = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      let file = path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
      if (!file.startsWith(root+path.sep) || !['/vendor/','/assets/'].some(p=>relative.startsWith(p)) && !['/','/index.html','/app.js','/unified.js','/unified-model.mjs','/model.mjs','/scene.mjs','/drawing-style.mjs','/chemdraw-import.mjs','/ket-normalize.mjs','/agent-ui.mjs','/i18n.mjs','/styles.css'].includes(relative)) {res.writeHead(403);return res.end();}
      let content;
      try { content = await fs.readFile(file); }
      catch(e) {
        if(e.code!=='ENOENT'||!relative.startsWith('/vendor/ketcher-zh/'))throw e;
        file=path.resolve(root,'.'+relative.replace('/vendor/ketcher-zh/','/vendor/ketcher/'));
        if(!file.startsWith(root+path.sep))throw Error('Invalid vendor asset path');
        content=await fs.readFile(file);
      }
      if(relative==='/'||relative==='/index.html'){
        let language='zh';
        try{const settings=JSON.parse(await fs.readFile(path.join(dataDir,'ui-settings.json'),'utf8'));if(settings?.language==='en')language='en';}catch(e){if(e.code!=='ENOENT')throw e;}
        content=Buffer.from(content.toString('utf8').replace('<script>document.getElementById',`<script>window.__STRUCTLNK_LANGUAGE__='${language}';document.getElementById`));
      }
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(content);
    } catch {res.writeHead(404);res.end('Not found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>{
    const u=details.url;
    callback({cancel:!(u.startsWith(origin+'/')||u.startsWith('data:')||u.startsWith('blob:')||u.startsWith('devtools:'))});
  });
  session.defaultSession.setPermissionRequestHandler((wc,permission,callback)=>callback(permission==='clipboard-sanitized-write'));
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({show:process.env.CHEMISTRY_TEST!=='1',width:1480,height:960,minWidth:1050,minHeight:720,backgroundColor:'#f3f5f8',title:'Structlnk · 课题组绘图工作台',icon:path.join(root,'assets','structlnk.ico'),webPreferences:{preload:path.join(root,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webviewTag:false}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.on('close',e=>{if(!allowClose){e.preventDefault();win.webContents.send('prepare-close');}});
  handle('complete-close',async(ok)=>{if(ok){allowClose=true;win.close();}});
  win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith(origin+'/'))e.preventDefault();});
  handle('project-open',async()=>{
    pendingOpenPath=null;
    const result=await dialog.showOpenDialog(win,{title:'打开项目或 ChemDraw 文件',filters:[{name:'绘图文件',extensions:['chemproj','cdx','cdxml']},{name:'ChemDraw 文件',extensions:['cdx','cdxml']},{name:'Structlnk 项目',extensions:['chemproj']}],properties:['openFile']});
    if(result.canceled)return null;
    const file=result.filePaths[0];
    if((await fs.stat(file)).size>MAX)throw Error('文件超过 40 MB');
    const kind=path.extname(file).slice(1).toLowerCase();
    if(!['chemproj','cdx','cdxml'].includes(kind))throw Error('请选择 .chemproj、.cdx 或 .cdxml 文件');
    const bytes=await fs.readFile(file);let content;
    if(kind==='cdx')content=bytes.toString('base64');
    else if(kind==='cdxml'){
      let encoding='utf-8';
      if(bytes[0]===0xff&&bytes[1]===0xfe||bytes[0]===0x3c&&bytes[1]===0)encoding='utf-16le';
      else if(bytes[0]===0xfe&&bytes[1]===0xff||bytes[0]===0&&bytes[1]===0x3c)encoding='utf-16be';
      else encoding=bytes.subarray(0,200).toString('ascii').match(/<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i)?.[1]||encoding;
      try{content=new TextDecoder(encoding,{fatal:true}).decode(bytes);}catch{throw Error('无法解码 CDXML 文字，请另存为 UTF-8 CDXML 后重试');}
    }else{content=bytes.toString('utf8');pendingOpenPath=file;}
    return {content,path:file,kind,name:path.basename(file)};
  });
  handle('project-accept-open',async(docId,file)=>{checkDocId(docId);if(file!==pendingOpenPath||path.extname(file).toLowerCase()!=='.chemproj')throw Error('文件未通过项目打开对话框选择');docPaths.set(docId,file);pendingOpenPath=null;return true;});
  handle('project-close',docId=>{checkDocId(docId);docPaths.delete(docId);return true;});
  handle('project-save',async(docId,text,name,saveAs)=>{
    checkDocId(docId);checkText(text);
    let file=docPaths.get(docId);
    if(!file||saveAs){const r=await dialog.showSaveDialog(win,{title:'保存可编辑项目',defaultPath:path.join(dataDir,String(name||'未命名').replace(/[<>:"/\\|?*]/g,'_')+'.chemproj'),filters:[{name:'Structlnk 项目',extensions:['chemproj']}]});if(r.canceled)return null;file=r.filePath;}
    if(path.extname(file).toLowerCase()!=='.chemproj')throw Error('项目必须保存为 .chemproj，不能覆盖 ChemDraw 原文件');
    await atomicWrite(file,text);docPaths.set(docId,file);return file;
  });
  handle('autosave-doc',async(docId,text)=>{checkDocId(docId);checkText(text);await atomicWrite(path.join(dataDir,'recovery.'+docId+'.chemproj'),text);return true;});
  handle('autosave-meta',async text=>{checkText(text);await atomicWrite(path.join(dataDir,'recovery-meta.json'),text);return true;});
  handle('language-get',async()=>{try{const value=JSON.parse(await fs.readFile(path.join(dataDir,'ui-settings.json'),'utf8'));return value?.language==='en'?'en':'zh';}catch(e){if(e.code==='ENOENT')return 'zh';throw Error('无法读取界面语言设置');}});
  handle('language-save',async language=>{if(!['zh','en'].includes(language))throw Error('界面语言设置无效');await atomicWrite(path.join(dataDir,'ui-settings.json'),JSON.stringify({language},null,2));return language;});
  handle('language-reload',async()=>{if(win&&!win.isDestroyed())win.webContents.reload();return true;});
  handle('chemdraw-clipboard-read',readChemDrawClipboard);
  handle('canvas-clipboard-write',async source=>{checkText(source);if(!source.trim())throw Error('复制内容为空');clipboard.writeText(source);return true;});
  handle('canvas-shortcut',async action=>{const keys={copy:'C',paste:'V',selectAll:'A'};if(!keys[action])throw Error('画布快捷操作无效');win.webContents.sendInputEvent({type:'keyDown',keyCode:keys[action],modifiers:['control']});win.webContents.sendInputEvent({type:'keyUp',keyCode:keys[action],modifiers:['control']});return true;});
  handle('recover',async()=>{
    let meta=null;try{meta=JSON.parse(await fs.readFile(path.join(dataDir,'recovery-meta.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw Error('无法读取窗口恢复信息');}
    const contents={};
    if(meta&&Array.isArray(meta.order)){
      for(const id of meta.order){if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(id))continue;try{contents[id]=await fs.readFile(path.join(dataDir,'recovery.'+id+'.chemproj'),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}}
      return {meta,contents,legacy:null};
    }
    let legacy=null;try{legacy=await fs.readFile(path.join(dataDir,'recovery.chemproj'),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
    return legacy?{meta:null,contents,legacy}:null;
  });
  handle('export-file',async({name,extension,text,base64})=>{
    if(!['svg','png','mol','smi','rxn','ket','chemproj'].includes(extension))throw Error('不支持的格式');
    checkText(text??base64);
    const r=await dialog.showSaveDialog(win,{title:'导出',defaultPath:path.join(dataDir,String(name||'drawing').replace(/[<>:"/\\|?*]/g,'_')+'.'+extension),filters:[{name:extension.toUpperCase(),extensions:[extension]}]});
    if(r.canceled)return null;
    await fs.writeFile(r.filePath,base64?Buffer.from(base64,'base64'):text);return r.filePath;
  });
  handle('export-pdf',async(svg,name,preset='standard')=>{
    checkText(svg);
    if(!['standard','acs1996'].includes(preset))throw Error('绘图样式无效');
    const r=await dialog.showSaveDialog(win,{title:'导出 PDF',defaultPath:path.join(dataDir,String(name||'drawing').replace(/[<>:"/\\|?*]/g,'_')+'.pdf'),filters:[{name:'PDF',extensions:['pdf']}]});
    if(r.canceled)return null;
    const printer=new BrowserWindow({show:false,webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true,javascript:false}});
    try {
      const css=preset==='acs1996'?'@page{size:Letter portrait;margin:36pt}body{margin:0}svg{display:block;width:540pt;height:720pt}':'@page{size:A4 landscape;margin:12mm}body{margin:0}svg{width:100%;height:auto}';
      await printer.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<html><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+svg+'</body></html>'));
      const pdf=await printer.webContents.printToPDF({landscape:preset!=='acs1996',printBackground:true,preferCSSPageSize:true,scale:1});
      await fs.writeFile(r.filePath,pdf);return r.filePath;
    } finally {printer.destroy();}
  });
  handle('read-notices',async()=>await fs.readFile(path.resolve(root,'../THIRD_PARTY_NOTICES.txt'),'utf8'));
  handle('read-example',async(key)=>{const names={organic:'01-organic-reaction.chemproj',metal:'02-metal-complex.chemproj',cycle:'03-catalytic-cycle.chemproj',mechanism:'04-reaction-mechanism.chemproj'};if(!names[key])throw Error('示例不存在');return await fs.readFile(path.resolve(root,'../examples',names[key]),'utf8');});
  handle('agent-config-get',()=>agent.getConfig());
  handle('agent-config-save',value=>agent.saveConfig(value));
  ipcMain.handle('agent-request',async(e,value)=>{trusted(e);return agent.request(value,p=>{if(win&&!win.isDestroyed())win.webContents.send('agent-progress',p);});});
  await win.loadURL(origin);
 });
}
app.on('window-all-closed',()=>{server?.close();app.quit();});
