import {PAGE,uid,clone,blankProject,validateProject,endpoint,detachDeleted,translateObjects,duplicateObjects} from './model.mjs';
import {NS,escape,sanitizeSvg,svgDimensions,objectMarkup,exportSvg} from './scene.mjs';
import {ACS_PAGE,PT_TO_PX,isACS,styleKey,editorStyle,imageStyle,nativeImageScale,pngWithDpi} from './drawing-style.mjs';
import {prepareChemDraw,summarizeImport} from './chemdraw-import.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const canvas=$('#canvas'),frame=$('#ketcher-frame');
let project=blankProject(),selected=new Set(),tool='select',undoStack=[],redoStack=[],drag=null,editingId=null,editorActive=false,engine=null,busy=false,toastTimer,saveTimer;
let savedJson=JSON.stringify(project),textTarget=null,writeQueue=Promise.resolve(),clipboard=[];
let importFile=null,importPreview=null;
const labels={molecule:'化学结构',text:'文字',arrow:'箭头'},kindLabels={reaction:'反应箭头',equilibrium:'平衡箭头',curve:'双电子弯箭头',fishhook:'单电子鱼钩箭头',coordination:'配位示意箭头',line:'直线'};
const EMPTY_KET=JSON.stringify({root:{nodes:[]}});
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4800);}
function error(e){console.error(e);toast(e?.message||String(e));}
async function withBusy(message,fn){if(busy)return;busy=true;$('#busy-text').textContent=message;$('#busy-overlay').classList.remove('hidden');try{return await fn();}catch(e){error(e);}finally{busy=false;$('#busy-overlay').classList.add('hidden');}}
function snapshot(){return clone(project);}
function markChanged(before){if(JSON.stringify(before)===JSON.stringify(project))return;undoStack.push(before);if(undoStack.length>35)undoStack.shift();redoStack=[];render();scheduleRecovery();}
function mutate(fn){const before=snapshot();fn();markChanged(before);}
function scheduleRecovery(){
  $('#save-state').textContent='正在保存恢复副本…';clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    const data=JSON.stringify(project);writeQueue=writeQueue.catch(()=>{}).then(()=>window.desktop.autosave(data));
    writeQueue.then(()=>{$('#save-state').textContent=JSON.stringify(project)===savedJson?'项目已保存':'恢复副本已保存 · Ctrl+S 保存项目';}).catch(e=>{$('#save-state').textContent='自动恢复保存失败';error(e);});
  },350);
}
function bounds(o){const el=$(`#objects > g[data-id="${o.id}"]`);try{return el.getBBox();}catch{return {x:0,y:0,width:0,height:0};}}
function renderCanvas(){
  $('#objects').innerHTML=project.objects.map(o=>{let hit='';if(o.type==='arrow'){const a=endpoint(o,'start',project.objects),b=endpoint(o,'end',project.objects);hit=`<path d="M${a.x} ${a.y} ${['curve','fishhook'].includes(o.kind)?`Q${o.cx} ${o.cy}`:'L'} ${b.x} ${b.y}" fill="none" stroke="transparent" stroke-width="14"/>`;}else if(o.type==='molecule')hit=`<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="transparent"/>`;return `<g data-id="${o.id}">${hit}${objectMarkup(o,project.objects)}</g>`;}).join('');
  const overlay=[];
  for(const id of selected){const o=project.objects.find(o=>o.id===id);if(!o)continue;const b=bounds(o);overlay.push(`<rect x="${b.x-6}" y="${b.y-6}" width="${b.width+12}" height="${b.height+12}" rx="3" fill="none" stroke="#167c70" stroke-width="1" stroke-dasharray="5 4"/>`);
    if(selected.size===1&&o.type==='arrow'){
      const a=endpoint(o,'start',project.objects),z=endpoint(o,'end',project.objects);
      if(['curve','fishhook'].includes(o.kind)){overlay.push(`<path d="M${a.x} ${a.y} L${o.cx} ${o.cy} L${z.x} ${z.y}" stroke="#8fc0af" stroke-width="1" stroke-dasharray="4 4" fill="none"/>`);overlay.push(`<circle class="handle" data-handle="control" data-id="${id}" cx="${o.cx}" cy="${o.cy}" r="6"/>`);}
      for(const [key,p]of [['start',a],['end',z]])overlay.push(`<circle class="handle" data-handle="${key}" data-id="${id}" cx="${p.x}" cy="${p.y}" r="6"/>`);
    }
    if(selected.size===1&&o.type==='molecule'&&!isACS(project))overlay.push(`<rect class="handle" data-handle="resize" data-id="${id}" x="${o.x+o.w-5}" y="${o.y+o.h-5}" width="10" height="10"/>`);
  }
  $('#selection').innerHTML=overlay.join('');$('#empty-state').classList.toggle('hidden',project.objects.length>0);
  $('#object-count').textContent=`${project.objects.length} 个对象${selected.size?' · 已选 '+selected.size:''}`;
}
function render(){
  $('#project-name').value=project.name;$('#scene-label').textContent=project.name;
  canvas.setAttribute('viewBox',`0 0 ${project.page.width} ${project.page.height}`);
  $('#drawing-style').value=styleKey(project);
  $('#style-summary').textContent=isACS(project)?'默认键长 14.4 pt · 可拖动原子疏排':'自由排版 · 彩色原子';
  $('#page-dimensions').textContent=isACS(project)?'540 × 720 pt · US Letter 绘图区':`${project.page.width} × ${project.page.height} · 矢量画布`;
  $('[data-export="pdf"]').textContent=isACS(project)?'PDF · US Letter / 原尺寸':'PDF · A4 横向';
  $('[data-export="png"]').textContent=isACS(project)?'PNG · 透明背景 / 600 dpi':'PNG · 透明背景 / 3×';
  resizeCanvas();
  selected=new Set([...selected].filter(id=>project.objects.some(o=>o.id===id)));
  renderCanvas();renderInspector();renderLayers();$('#undo').disabled=!undoStack.length;$('#redo').disabled=!redoStack.length;
  document.title=`${project.name} · Structlnk`;
}
function renderLayers(){
  $('#layer-count').textContent=project.objects.length;
  $('#layers').innerHTML=project.objects.slice().reverse().map(o=>`<button class="layer ${selected.has(o.id)?'active':''}" data-id="${o.id}"><small>${o.type==='molecule'?'⌬':o.type==='text'?'T':'↗'}</small><span>${escape(o.name||labels[o.type])}</span></button>`).join('');
}
function renderInspector(){
  const panel=$('#selection-info');
  if(!selected.size){panel.innerHTML='<div class="inspector-empty">↖<p>选择画布上的对象<br>调整文字、尺寸与箭头</p></div>';return;}
  if(selected.size>1){panel.innerHTML=`<span class="type-pill">已选择 ${selected.size} 个对象</span><div class="prop-buttons"><button data-action="duplicate">复制</button><button data-action="delete">删除</button><button data-action="align-top">顶端对齐</button><button data-action="align-left">左侧对齐</button></div>`;return;}
  const o=project.objects.find(o=>selected.has(o.id));
  let html=`<span class="type-pill">${o.type==='arrow'?kindLabels[o.kind]:labels[o.type]}</span><label class="prop-label">对象名称</label><input class="prop-input" data-prop="name" value="${escape(o.name)}" maxlength="200">`;
  if(o.type==='text')html+=`<label class="prop-label">内容</label><textarea class="prop-input" data-prop="text" style="min-height:75px" maxlength="10000">${escape(o.text)}</textarea><div class="prop-row"><label><span class="prop-label">字号${isACS(project)?'（pt）':''}</span><input class="prop-input" type="number" data-prop="size" min="6" max="${isACS(project)?75:100}" step="0.5" value="${isACS(project)?Math.round(o.size/PT_TO_PX*100)/100:o.size}"></label><label><span class="prop-label">颜色</span><input class="prop-input" type="color" data-prop="color" value="${o.color||'#202b35'}"></label></div><label class="prop-label"><input type="checkbox" data-prop="bold" ${o.bold?'checked':''}> 加粗</label>`;
  if(o.type==='molecule')html+=isACS(project)?`<p class="warning">采用 14.4 pt 默认标准键长。可在结构编辑器中拖动原子，调整局部键长和键角来疏开拥挤结构。</p><button data-action="edit" class="wide">编辑化学结构</button>`:`<div class="prop-row"><label><span class="prop-label">宽度</span><input class="prop-input" type="number" data-prop="w" min="20" max="2000" value="${Math.round(o.w)}"></label><label><span class="prop-label">高度（等比）</span><input class="prop-input" type="number" data-prop="h" min="20" max="2000" value="${Math.round(o.h)}"></label></div><p class="warning">调整大小会同比缩放键长与线宽。<br>双击结构编辑原子与键。</p><button data-action="edit" class="wide">编辑化学结构</button>`;
  if(o.type==='arrow')html+=`<label class="prop-label">箭头类型</label><select class="prop-input" data-prop="kind">${Object.entries(kindLabels).map(([k,v])=>`<option value="${k}" ${o.kind===k?'selected':''}>${v}</option>`).join('')}</select><div class="prop-row"><label><span class="prop-label">线宽</span><input class="prop-input" type="number" data-prop="width" min="0.5" max="8" step="0.5" value="${o.width}"></label><label><span class="prop-label">颜色</span><input class="prop-input" type="color" data-prop="color" value="${o.color||'#202b35'}"></label></div><p class="warning">拖动圆点调整端点与曲率。端点可绑定分子内的相对位置。<br>${o.startAnchor?'起点已绑定 · ':''}${o.endAnchor?'终点已绑定':''}</p><button data-action="detach">解除端点绑定</button>`;
  html+='<div class="prop-buttons"><button data-action="duplicate">复制</button><button data-action="front">置顶</button><button data-action="back">置底</button><button data-action="delete">删除</button></div>';panel.innerHTML=html;
}
function setTool(value){tool=value;$$('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));canvas.style.cursor=tool==='select'?'default':'crosshair';$('#tool-hint').textContent=tool==='select'?'拖动对象移动 · 双击结构编辑 · Shift 多选':tool==='text'?'点击画布放置文字':'在画布上按下并拖动，创建'+kindLabels[tool];}
function pagePoint(e){const p=canvas.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(canvas.getScreenCTM().inverse());}
function anchorAt(p){const target=project.objects.slice().reverse().find(o=>o.type==='molecule'&&p.x>=o.x-5&&p.x<=o.x+o.w+5&&p.y>=o.y-5&&p.y<=o.y+o.h+5);return target?{id:target.id,u:(p.x-target.x)/target.w,v:(p.y-target.y)/target.h}:undefined;}
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||busy)return;const p=pagePoint(e),h=e.target.closest('[data-handle]'),g=e.target.closest('#objects > g[data-id]');
  if(h){e.preventDefault();drag={mode:h.dataset.handle,id:h.dataset.id,start:p,before:snapshot()};canvas.setPointerCapture(e.pointerId);return;}
  if(tool==='text'){editText(null,p);return;}
  if(tool!=='select'){
    const before=snapshot(),anchor=anchorAt(p),o={id:uid(),type:'arrow',name:kindLabels[tool],kind:tool,x1:p.x,y1:p.y,x2:p.x,y2:p.y,cx:p.x,cy:p.y-65,width:isACS(project)?.6*PT_TO_PX:2,color:isACS(project)?'#000000':'#202b35',...(isACS(project)?{headSize:5*PT_TO_PX}:{}),...(anchor?{startAnchor:anchor}:{})};
    project.objects.push(o);selected=new Set([o.id]);drag={mode:'draw',id:o.id,start:p,before};canvas.setPointerCapture(e.pointerId);renderCanvas();return;
  }
  if(g){const id=g.dataset.id;if(e.shiftKey){if(selected.has(id))selected.delete(id);else selected.add(id);}else if(!selected.has(id))selected=new Set([id]);if(selected.has(id)){drag={mode:'move',start:p,before:snapshot(),ids:new Set(selected)};canvas.setPointerCapture(e.pointerId);}}
  else selected=new Set();render();
});
canvas.addEventListener('pointermove',e=>{
  if(!drag)return;const p=pagePoint(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;let o=project.objects.find(o=>o.id===drag.id);
  if(drag.mode==='move'){project=clone(drag.before);translateObjects(project.objects,drag.ids,dx,dy);}
  else if(drag.mode==='draw'){o.x2=p.x;o.y2=p.y;o.cx=(o.x1+p.x)/2+(p.y-o.y1)*.35;o.cy=(o.y1+p.y)/2-(p.x-o.x1)*.35;}
  else if(drag.mode==='control'){o.cx=p.x;o.cy=p.y;}
  else if(drag.mode==='resize'){const old=drag.before.objects.find(x=>x.id===o.id);const scale=Math.max(.15,Math.min(8,(p.x-old.x)/old.w));o.w=old.w*scale;o.h=old.h*scale;}
  else {const start=drag.mode==='start';o[start?'x1':'x2']=p.x;o[start?'y1':'y2']=p.y;delete o[start?'startAnchor':'endAnchor'];}
  renderCanvas();
});
canvas.addEventListener('pointerup',e=>{
  if(!drag)return;const p=pagePoint(e),o=project.objects.find(o=>o.id===drag.id);
  if(drag.mode==='draw'){
    if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)<10){project=drag.before;drag=null;render();return;}
    const anchor=anchorAt(p);if(anchor)o.endAnchor=anchor;setTool('select');
  }else if(drag.mode==='start'||drag.mode==='end'){const key=drag.mode==='start'?'startAnchor':'endAnchor',anchor=anchorAt(p);if(anchor)o[key]=anchor;else delete o[key];}
  const before=drag.before;drag=null;markChanged(before);render();
});
canvas.addEventListener('pointercancel',()=>{if(drag){project=drag.before;drag=null;render();}});
canvas.addEventListener('dblclick',e=>{const g=e.target.closest('#objects > g[data-id]'),o=g&&project.objects.find(o=>o.id===g.dataset.id);if(o?.type==='molecule')openEditor(o.id);if(o?.type==='text')editText(o.id);});
$('#layers').onclick=e=>{const b=e.target.closest('[data-id]');if(!b)return;if(e.shiftKey){if(selected.has(b.dataset.id))selected.delete(b.dataset.id);else selected.add(b.dataset.id);}else selected=new Set([b.dataset.id]);render();};
$('#selection-info').onchange=e=>{
  const key=e.target.dataset.prop;if(!key||selected.size!==1)return;const o=project.objects.find(o=>selected.has(o.id));
  let value=e.target.type==='checkbox'?e.target.checked:e.target.type==='number'?Number(e.target.value):e.target.value;
  if(e.target.type==='number'&&(!Number.isFinite(value)||value<Number(e.target.min)||value>Number(e.target.max))){toast('数值超出允许范围');renderInspector();return;}
  if(key==='size'&&isACS(project))value*=PT_TO_PX;
  mutate(()=>{if(o.type==='molecule'&&key==='w')o.h*=value/o.w;if(o.type==='molecule'&&key==='h')o.w*=value/o.h;o[key]=value;});
};
function duplicate(){if(!selected.size)return;mutate(()=>{const copies=duplicateObjects(project.objects,selected);project.objects.push(...copies);selected=new Set(copies.map(o=>o.id));});}
function removeSelected(){if(selected.size)mutate(()=>{detachDeleted(project,selected);selected=new Set();});}
$('#selection-info').onclick=e=>{const a=e.target.dataset.action;if(!a)return;const o=project.objects.find(o=>selected.has(o.id));
  if(a==='duplicate')duplicate();if(a==='delete')removeSelected();if(a==='edit')openEditor(o.id);
  if(a==='front'||a==='back')mutate(()=>{const items=project.objects.filter(x=>selected.has(x.id)),rest=project.objects.filter(x=>!selected.has(x.id));project.objects=a==='front'?[...rest,...items]:[...items,...rest];});
  if(a==='detach')mutate(()=>{for(const end of ['start','end']){const p=endpoint(o,end,project.objects);o[end==='start'?'x1':'x2']=p.x;o[end==='start'?'y1':'y2']=p.y;delete o[end==='start'?'startAnchor':'endAnchor'];}});
  if(a==='align-top'||a==='align-left'){const items=project.objects.filter(x=>selected.has(x.id)),boxes=items.map(bounds),v=Math.min(...boxes.map(b=>a==='align-top'?b.y:b.x));mutate(()=>items.forEach((x,i)=>translateObjects(project.objects,new Set([x.id]),a==='align-left'?v-boxes[i].x:0,a==='align-top'?v-boxes[i].y:0)));}
};
function editText(id,p){textTarget={id,p};const o=project.objects.find(o=>o.id===id);$('#text-input').value=o?.text||'';$('#text-dialog').showModal();$('#text-input').focus();}
$('#text-dialog').addEventListener('close',()=>{if($('#text-dialog').returnValue!=='ok')return;const text=$('#text-input').value;if(!text.trim())return;mutate(()=>{if(textTarget.id){const o=project.objects.find(o=>o.id===textTarget.id);o.text=text;}else{const o={id:uid(),type:'text',name:text.slice(0,30),text,x:textTarget.p.x,y:textTarget.p.y,size:isACS(project)?10*PT_TO_PX:22,color:isACS(project)?'#000000':'#202b35',bold:false};project.objects.push(o);selected=new Set([o.id]);}});setTool('select');});
$$('[data-insert]').forEach(b=>b.onclick=()=>{const area=$('#text-input');area.setRangeText(b.dataset.insert,area.selectionStart,area.selectionEnd,'end');area.focus();});
const engineReady=new Promise((resolve,reject)=>{let elapsed=0;const timer=setInterval(()=>{try{engine=frame.contentWindow.ketcher;if(engine){clearInterval(timer);$('#engine-loading').classList.add('hidden');$('#apply-editor').disabled=false;resolve(engine);}}catch{}if((elapsed+=200)>90000){clearInterval(timer);$('#engine-loading').textContent='化学引擎启动失败，请关闭软件后重试';reject(Error('化学引擎启动超时'));}},200);});
engineReady.catch(error);
function syncEngineStyle(key){engine.editor.setOptions(JSON.stringify(editorStyle(key)));}
async function buildStyledProject(input,key){
  const next=clone(input),previous=next.page,target=key==='acs1996'?ACS_PAGE:PAGE;
  const factor=Math.min(target.width/previous.width,target.height/previous.height);
  next.drawingStyle=key;next.page={...target};syncEngineStyle(key);
  for(const o of next.objects){
    if(o.type==='molecule'){
      const cx=(o.x+o.w/2)*factor,cy=(o.y+o.h/2)*factor;
      o.svg=sanitizeSvg(await(await engine.generateImage(o.ket,imageStyle(key))).text());
      const dim=svgDimensions(o.svg),scale=nativeImageScale(key);
      o.w=dim.w*scale;o.h=dim.h*scale;o.x=cx-o.w/2;o.y=cy-o.h/2;
    }else if(o.type==='text'){o.x*=factor;o.y*=factor;o.size=key==='acs1996'?10*PT_TO_PX:22;o.color=key==='acs1996'?'#000000':'#202b35';}
    else {for(const k of ['x1','x2','cx','y1','y2','cy'])o[k]*=factor;o.width=key==='acs1996'?.6*PT_TO_PX:2;o.color=key==='acs1996'?'#000000':'#202b35';if(key==='acs1996')o.headSize=5*PT_TO_PX;else delete o.headSize;}
  }
  return validateProject(next);
}
async function applyDrawingStyle(key){
  if(!['standard','acs1996'].includes(key))return;
  return withBusy('应用绘图样式…',async()=>{
    const before=snapshot();await engineReady;
    try{const next=await buildStyledProject(project,key);project=next;selected=new Set();markChanged(before);render();toast(key==='acs1996'?'已应用 ACS 1996 兼容样式；可用 Ctrl+Z 撤销':'已应用常规绘图样式');}
    catch(e){syncEngineStyle(styleKey(before));$('#drawing-style').value=styleKey(before);throw e;}
  });
}
$('#drawing-style').onchange=e=>applyDrawingStyle(e.target.value);
$('#reapply-style').onclick=()=>applyDrawingStyle(styleKey(project));
$('#style-details').onclick=()=>$('#style-dialog').showModal();
$('#close-style-dialog').onclick=()=>$('#style-dialog').close();
async function openEditor(id=null){
  editingId=id;editorActive=true;$('#editor-title').textContent=id?'编辑化学结构':'新建化学结构';$('#apply-editor').textContent=id?'更新画布':'放入画布';$('#editor-modal').classList.remove('inactive');$('#smiles-input').value='';
  await withBusy('准备化学编辑器…',async()=>{const k=await engineReady;syncEngineStyle(styleKey(project));const o=project.objects.find(o=>o.id===id);await k.setMolecule(o?o.ket:EMPTY_KET);});
}
function closeEditor(){editorActive=false;editingId=null;$('#editor-modal').classList.add('inactive');}
async function moleculeFromEditor(name,key=styleKey(project)){
  const ket=await engine.getKet();if(!(JSON.parse(ket).root?.nodes?.length))throw Error('请先绘制一个结构');
  syncEngineStyle(key);
  const svg=sanitizeSvg(await (await engine.generateImage(ket,imageStyle(key))).text());
  const dim=svgDimensions(svg),scale=key==='acs1996'?nativeImageScale(key):Math.min(1,350/dim.w,240/dim.h);
  return {id:uid(),type:'molecule',name:name||'化学结构',ket,svg,x:100,y:150,w:dim.w*scale,h:dim.h*scale};
}
async function applyEditor(){return withBusy('保存结构与矢量图…',async()=>{
  const original=project.objects.find(o=>o.id===editingId),molecule=await moleculeFromEditor(original?.name);
  mutate(()=>{if(original){const scale=isACS(project)?nativeImageScale('acs1996'):original.w/svgDimensions(original.svg).w;Object.assign(original,{ket:molecule.ket,svg:molecule.svg,w:svgDimensions(molecule.svg).w*scale,h:svgDimensions(molecule.svg).h*scale});selected=new Set([original.id]);}
    else{const count=project.objects.filter(o=>o.type==='molecule').length,cols=isACS(project)?2:3;molecule.x=(isACS(project)?60:80)+(count%cols)*(isACS(project)?300:310);molecule.y=(isACS(project)?100:120)+Math.floor(count/cols)%(isACS(project)?4:3)*180;project.objects.push(molecule);selected=new Set([molecule.id]);}});
  closeEditor();if(original&&project.objects.some(o=>o.startAnchor?.id===original.id||o.endAnchor?.id===original.id))toast('结构已更新，请复查绑定箭头的端点位置');else toast('结构已放入画布，可双击继续编辑');
});}
$('#add-molecule').onclick=()=>openEditor();$('#empty-add').onclick=()=>openEditor();$('#apply-editor').onclick=applyEditor;
$('#cancel-editor').onclick=()=>{if(confirm('关闭结构编辑器？尚未放入画布的修改将不保留。'))closeEditor();};
$('#load-smiles').onclick=()=>withBusy('载入结构…',async()=>{const text=$('#smiles-input').value.trim();if(!text)throw Error('请先输入 SMILES');await (await engineReady).setMolecule(text);});
$('#export-ket').onclick=()=>withBusy('导出结构…',async()=>{const text=await engine.getKet();await window.desktop.exportFile({name:'structure',extension:'ket',text});});
$('#export-mol').onclick=()=>withBusy('导出结构…',async()=>{const reaction=engine.containsReaction();const text=reaction?await engine.getRxn('v3000'):await engine.getMolfile('v3000');await window.desktop.exportFile({name:'structure',extension:reaction?'rxn':'mol',text});});
$$('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
function undo(){if(!undoStack.length)return;redoStack.push(snapshot());project=undoStack.pop();selected=new Set();render();scheduleRecovery();}
function redo(){if(!redoStack.length)return;undoStack.push(snapshot());project=redoStack.pop();selected=new Set();render();scheduleRecovery();}
$('#undo').onclick=undo;$('#redo').onclick=redo;
$('#grid-toggle').onclick=()=>{$('#grid-toggle').classList.toggle('active');canvas.classList.toggle('no-grid');};
function resizeCanvas(){const box=$('#canvas-scroll'),value=$('#zoom').value,ratio=project.page.width/project.page.height;let width=value==='fit'?Math.min(box.clientWidth-48,(box.clientHeight-36)*ratio):project.page.width*Number(value);width=Math.max(240,width);$('#page-wrap').style.width=width+'px';$('#page-wrap').style.height=width/ratio+'px';}
new ResizeObserver(resizeCanvas).observe($('#canvas-scroll'));$('#zoom').onchange=resizeCanvas;
$('#project-name').onchange=e=>mutate(()=>{project.name=e.target.value.trim()||'Untitled Drawing';});
async function saveProject(saveAs=false){return withBusy('保存项目…',async()=>{const data=JSON.stringify(project,null,2),result=await window.desktop.save(data,project.name,saveAs);if(result){savedJson=JSON.stringify(project);$('#save-state').textContent='项目已保存';toast('项目已保存');}});}
$('#save-project').onclick=()=>saveProject();$('#save-as').onclick=()=>{$('#export-options').classList.add('hidden');saveProject(true);};
function canReplace(){return !project.objects.length||JSON.stringify(project)===savedJson||confirm('当前项目尚未保存到文件。继续替换画布？替换后可立即撤销返回。');}
$('#new-project').onclick=async()=>{if(!canReplace())return;const key=styleKey(project);mutate(()=>{project=blankProject();if(key==='acs1996'){project.drawingStyle=key;project.page={...ACS_PAGE};}selected=new Set();});await window.desktop.newProject();savedJson='';$$('[data-example]').forEach(b=>b.classList.remove('selected'));};
$('#open-project').onclick=()=>withBusy('打开项目…',async()=>{
  const result=await window.desktop.open();if(!result)return;
  if(['cdx','cdxml'].includes(result.kind)){
    importFile=prepareChemDraw(result);importPreview=null;
    $('#import-name').textContent=importFile.name;
    $('#import-page').innerHTML=importFile.pages.map((p,i)=>`<option value="${i}">第 ${i+1} 页 / 共 ${importFile.pages.length} 页</option>`).join('');
    $('#import-style').value=styleKey(project);$('#import-dialog').showModal();await previewChemDraw();return;
  }
  const next=validateProject(JSON.parse(result.content));for(const o of next.objects)if(o.type==='molecule')o.svg=sanitizeSvg(o.svg);
  if(!canReplace())return;const before=snapshot();project=next;selected=new Set();markChanged(before);await window.desktop.acceptOpen(result.path);savedJson=JSON.stringify(project);$('#save-state').textContent='项目已打开';
});
async function previewChemDraw(){
  importPreview=null;$('#import-apply').disabled=true;$('#import-page').disabled=true;$('#import-style').disabled=true;
  $('#import-preview').textContent='正在转换所选页面…';$('#import-summary').textContent='';
  try{
    await engineReady;const key=$('#import-style').value,index=Number($('#import-page').value),file=importFile;
    const originalKet=await engine.getKet();let ket;
    try{syncEngineStyle(key);await engine.setMolecule(file.source(index));ket=await engine.getKet();}
    catch{throw Error('化学引擎无法读取这一页。可尝试在 ChemDraw 中将这一页另存为 CDXML 后重试。');}
    finally{syncEngineStyle(styleKey(project));await engine.setMolecule(originalKet);}
    if(!JSON.parse(ket).root?.nodes?.length)throw Error('这一页没有转换出可编辑内容，请选择其他页或检查原文件。');
    const report=summarizeImport(ket,file.pages[index].counts);
    const svg=sanitizeSvg(await(await engine.generateImage(ket,imageStyle(key))).text()),dim=svgDimensions(svg);
    const next=blankProject();next.name=(file.name.replace(/\.(cdx|cdxml)$/i,'')+(file.pages.length>1?` · 第 ${index+1} 页`:'')).slice(0,200);
    if(key==='acs1996'){next.drawingStyle=key;next.page={...ACS_PAGE};}
    const scale=key==='acs1996'?nativeImageScale(key):Math.min(1,(next.page.width-80)/dim.w,(next.page.height-80)/dim.h);
    const w=dim.w*scale,h=dim.h*scale;
    if(w>next.page.width-40||h>next.page.height-40)report.warnings.push('此页内容大于 ACS 绘图区，可能超出页面。可改选「常规绘图」以适应页面。');
    const object={id:uid(),type:'molecule',name:next.name,ket,svg,x:Math.max(20,(next.page.width-w)/2),y:Math.max(20,(next.page.height-h)/2),w,h};
    next.objects=[object];validateProject(next);
    if(new TextEncoder().encode(JSON.stringify(next)).length>40*1024*1024)throw Error('转换后项目超过 40 MB，请拆分页面或移除过大的嵌入图片。');
    const c=report.counts;$('#import-summary').textContent=`已转换：${c.molecules} 个结构、${c.atoms} 个原子、${c.bonds} 条键、${c.texts} 个文字对象、${c.arrows} 个箭头、${c.images} 张图片、${c.shapes} 个其他图形。`;
    $('#import-warnings').replaceChildren(...report.warnings.map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));
    $('#import-preview').innerHTML=`<svg xmlns="${NS}" viewBox="0 0 ${dim.w} ${dim.h}" aria-label="ChemDraw 页面导入预览">${objectMarkup({...object,x:0,y:0,w:dim.w,h:dim.h},[object])}</svg>`;
    importPreview=next;$('#import-apply').disabled=false;
  }catch(e){$('#import-preview').textContent=e.message;$('#import-warnings').replaceChildren();}
  finally{$('#import-page').disabled=false;$('#import-style').disabled=false;}
}
$('#import-page').onchange=$('#import-style').onchange=()=>withBusy('转换 ChemDraw 页面…',previewChemDraw);
$('#import-cancel').onclick=()=>{$('#import-dialog').close();importFile=null;importPreview=null;};
$('#import-dialog').addEventListener('cancel',()=>{importFile=null;importPreview=null;});
$('#import-apply').onclick=()=>withBusy('放入导入内容…',async()=>{
  if(!importPreview||!canReplace())return;const next=importPreview;
  await window.desktop.newProject();const before=snapshot();project=next;selected=new Set([next.objects[0].id]);savedJson='';markChanged(before);render();
  $$('[data-example]').forEach(b=>b.classList.remove('selected'));$('#import-dialog').close();importFile=null;importPreview=null;
  toast('已导入，可双击继续编辑；Ctrl+S 另存为 Structlnk 项目');
});
$('#export-menu').onclick=e=>{e.stopPropagation();$('#export-options').classList.toggle('hidden');};
document.addEventListener('click',e=>{if(!e.target.closest('.dropdown'))$('#export-options').classList.add('hidden');});
async function pngData(svg){
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try {const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas'),acs=svg.includes('width="540pt"'),dpi=acs?600:288,dim=svgDimensions(svg);c.width=Math.round(dim.w*dpi/96);c.height=Math.round(dim.h*dpi/96);const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG 导出失败');const bytes=pngWithDpi(new Uint8Array(await blob.arrayBuffer()),dpi);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}finally{URL.revokeObjectURL(url);}
}
$$('[data-export]').forEach(b=>b.onclick=()=>{$('#export-options').classList.add('hidden');withBusy('正在导出…',async()=>{if(!project.objects.length)throw Error('画布为空，请先添加内容');const svg=exportSvg(project),kind=b.dataset.export;let result;if(kind==='pdf')result=await window.desktop.exportPdf(svg,project.name,styleKey(project));else result=await window.desktop.exportFile({name:project.name,extension:kind,...(kind==='png'?{base64:await pngData(svg)}:{text:svg})});if(result)toast('已导出 '+kind.toUpperCase());});});
$('#help').onclick=async()=>{$('#help-dialog').showModal();try{$('#notices').textContent=await window.desktop.notices();}catch{$('#notices').textContent='请查看软件目录中的 THIRD_PARTY_NOTICES.txt';}};$('#close-help').onclick=()=>$('#help-dialog').close();
window.addEventListener('keydown',e=>{
  if(editorActive||busy||document.querySelector('dialog[open]'))return;
  const input=e.target.closest('input,textarea,select,[contenteditable="true"]');const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();if(input)input.blur();saveProject(e.shiftKey);return;}
  if(input)return;
  if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
  else if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}
  else if(mod&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();}
  else if(mod&&e.key.toLowerCase()==='a'){e.preventDefault();selected=new Set(project.objects.map(o=>o.id));render();}
  else if(mod&&e.key.toLowerCase()==='c'){e.preventDefault();clipboard=clone(project.objects);clipboard=clipboard.filter(o=>selected.has(o.id));toast('已复制 '+clipboard.length+' 个对象');}
  else if(mod&&e.key.toLowerCase()==='v'){e.preventDefault();if(clipboard.length)mutate(()=>{const full=clone(clipboard);for(const o of full)if(o.type==='arrow')for(const end of ['start','end']){const key=end==='start'?'startAnchor':'endAnchor';if(o[key]&&!full.some(x=>x.id===o[key].id)){const p=endpoint(o,end,project.objects);delete o[key];o[end==='start'?'x1':'x2']=p.x;o[end==='start'?'y1':'y2']=p.y;}}const copies=duplicateObjects(full,new Set(full.map(o=>o.id)));project.objects.push(...copies);selected=new Set(copies.map(o=>o.id));});}
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelected();}
  else if(e.key==='Escape'){setTool('select');selected=new Set();render();}
  else if(e.key.toLowerCase()==='v')setTool('select');else if(e.key.toLowerCase()==='t')setTool('text');else if(e.key.toLowerCase()==='m')openEditor();
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&selected.size){e.preventDefault();const step=e.shiftKey?10:1;mutate(()=>translateObjects(project.objects,selected,e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0));}
});
window.desktop.onCloseRequested(async()=>{
  if(editorActive&&!confirm('结构编辑器中的修改尚未确认。仍要关闭软件？')){await window.desktop.completeClose(false);return;}
  clearTimeout(saveTimer);
  try{await writeQueue.catch(()=>{});await window.desktop.autosave(JSON.stringify(project));await window.desktop.completeClose(true);}
  catch(e){error(e);if(confirm('恢复副本保存失败。仍要关闭软件？'))await window.desktop.completeClose(true);}
});
function textObject(text,x,y,size=22,color='#202b35',bold=false){return {id:uid(),type:'text',name:text.slice(0,30),text,x,y,size,color,bold};}
function arrowObject(kind,x1,y1,x2,y2,cx=(x1+x2)/2,cy=(y1+y2)/2-60){return {id:uid(),type:'arrow',name:kindLabels[kind],kind,x1,y1,x2,y2,cx,cy,width:2,color:'#202b35'};}
const cisplatin=`Cisplatin\n  Structlnk\n\n  0  0  0     0  0            999 V3000\nM  V30 BEGIN CTAB\nM  V30 COUNTS 5 4 0 0 0\nM  V30 BEGIN ATOM\nM  V30 1 Pt 0 0 0 0\nM  V30 2 N -1.5 0 0 0\nM  V30 3 N 0 1.5 0 0\nM  V30 4 Cl 1.5 0 0 0\nM  V30 5 Cl 0 -1.5 0 0\nM  V30 END ATOM\nM  V30 BEGIN BOND\nM  V30 1 9 2 1\nM  V30 2 9 3 1\nM  V30 3 1 1 4\nM  V30 4 1 1 5\nM  V30 END BOND\nM  V30 END CTAB\nM  END\n`;
async function sampleMolecule(source,name,x,y,maxW=240,maxH=170,pdDonors=false){
  syncEngineStyle('standard');
  await engine.setMolecule(source);
  if(pdDonors){const k=JSON.parse(await engine.getKet());for(const mol of Object.values(k))if(mol.type==='molecule')for(const bond of mol.bonds||[]){const [a,b]=bond.atoms;if(mol.atoms[a].label==='P'&&mol.atoms[b].label==='Pd'){bond.type=9;}else if(mol.atoms[b].label==='P'&&mol.atoms[a].label==='Pd'){bond.type=9;bond.atoms=[b,a];}}await engine.setMolecule(JSON.stringify(k));}
  const m=await moleculeFromEditor(name,'standard'),dim=svgDimensions(m.svg),scale=Math.min(maxW/dim.w,maxH/dim.h,1.2);Object.assign(m,{x,y,w:dim.w*scale,h:dim.h*scale});return m;
}
async function loadExample(key){
  if(!canReplace())return;
  return withBusy('正在构建可编辑示例…',async()=>{
    await engineReady;const next=blankProject(),o=next.objects,addText=(...a)=>o.push(textObject(...a)),addArrow=(...a)=>o.push(arrowObject(...a));
    const names={organic:'有机反应 · 酯化',metal:'金属配合物 · 顺铂',cycle:'催化循环 · 钯催化示意',mechanism:'反应机理 · 电子转移示意'};next.name=names[key];
    addText('STRUCTLNK / LAB NOTE',65,62,13,'#64897e',true);addText(names[key],65,107,28,'#253a36',true);
    if(key==='organic'){
      o.push(await sampleMolecule('CC(=O)O','乙酸',90,270,220,160));addText('+',350,350,30);
      o.push(await sampleMolecule('CCO','乙醇',410,300,190,130));addArrow('equilibrium',660,345,830,345);addText('H⁺, Δ',702,307,21);addText('−H₂O',705,395,19,'#6f7e83');
      o.push(await sampleMolecule('CC(=O)OCC','乙酸乙酯',875,270,255,160));
      addText('乙酸',150,490,18,'#65777d');addText('乙醇',463,490,18,'#65777d');addText('乙酸乙酯',940,490,18,'#65777d');
      addText('01  结构可双击编辑',70,665,17,'#167c70',true);addText('分子、条件文字与平衡箭头分别保留，可独立移动。',70,704,17,'#7c8c94');
    }else if(key==='metal'){
      const pt=await sampleMolecule(cisplatin,'顺铂：N → Pt 配位键',295,250,380,350);pt.w*=1.8;pt.h*=1.8;o.push(pt);addText('cis-[PtCl₂(NH₃)₂]',740,310,25);addText('Pt(II) / 平面四配位',740,357,19,'#667f79');
      addText('N → Pt 配位键可继续编辑。\n两个 Cl 位于相邻位置。',740,416,17,'#6c7e85');
      addText('02  保留配位几何',70,665,17,'#167c70',true);addText('本示例保留手动二维坐标；请在结构编辑器内修改真正的配位键。',70,704,17,'#7c8c94');
    }else if(key==='cycle'){
      // Generic Pd cycle: label atoms and ligands explicitly; no claim of a complete mechanism.
      o.push(await sampleMolecule('CP(C)(C)[Pd]P(C)(C)C','双膦配位 Pd(0)',457,180,255,110,true));addText('L₂Pd(0)',522,330,21);
      o.push(await sampleMolecule('Cl[Pd](c1ccccc1)(P(C)(C)C)P(C)(C)C','氧化加成配合物示意',795,335,255,220,true));
      o.push(await sampleMolecule('c1ccc([Pd](c2ccccc2)(P(C)(C)C)P(C)(C)C)cc1','转金属化后中间体示意',230,420,320,195,true));
      addArrow('curve',725,239,911,326,881,177);addArrow('curve',865,562,571,613,752,705);addArrow('curve',257,420,425,241,192,216);
      addText('氧化加成',843,206,20,'#167c70',true);addText('Ar–Cl',965,266,18);addText('转金属化',696,682,20,'#167c70',true);addText('Ar′–B(OH)₂ / 碱',909,664,16);addText('还原消除',105,272,20,'#167c70',true);addText('Ar–Ar′',125,324,18);
      addText('Pd 催化循环',498,410,23,'#526c64',true);addText('简化排版示意',515,446,16,'#86978f');
      addText('03  示例配体为 PMe₃；实际配体、配位数及步骤需按你的体系修改。',70,758,16,'#7c8c94');
    }else if(key==='mechanism'){
      const acetone=await sampleMolecule('CC(C)=O','丙酮',425,235,230,185),hydroxide=await sampleMolecule('[OH-]','氢氧根',225,285,110,90);o.push(acetone,hydroxide);
      const attack=arrowObject('curve',254,290,491,269,347,168),pi=arrowObject('curve',516,253,536,239,552,273);
      attack.startAnchor={id:hydroxide.id,u:(254-hydroxide.x)/hydroxide.w,v:(290-hydroxide.y)/hydroxide.h};attack.endAnchor={id:acetone.id,u:(491-acetone.x)/acetone.w,v:(269-acetone.y)/acetone.h};pi.startAnchor={id:acetone.id,u:(516-acetone.x)/acetone.w,v:(253-acetone.y)/acetone.h};pi.endAnchor={id:acetone.id,u:(536-acetone.x)/acetone.w,v:(239-acetone.y)/acetone.h};o.push(attack,pi);
      addText('亲核进攻 / 双电子箭头',135,480,20,'#167c70',true);addText('移动分子时，箭头端点随绑定位置移动。',135,518,16,'#7c8c94');
      addText('R–Br',870,278,29);addArrow('fishhook',896,268,880,250,869,225);addArrow('fishhook',899,268,936,250,935,216);addArrow('reaction',899,325,899,405);addText('hν',934,372,21);addText('R•  +  Br•',842,453,26);addText('均裂 / 单电子鱼钩箭头',800,518,18,'#167c70',true);
      addText('04  拖动控制点调整曲率，拖动端点可绑定到分子的相对位置。',70,704,17,'#7c8c94');
    }
    validateProject(next);const before=snapshot();project=isACS(project)?await buildStyledProject(next,'acs1996'):next;selected=new Set();markChanged(before);await window.desktop.newProject();savedJson='';setTool('select');$$('[data-example]').forEach(b=>b.classList.toggle('selected',b.dataset.example===key));toast('示例已载入，所有对象均可继续编辑');
  });
}
$$('[data-example]').forEach(b=>b.onclick=()=>loadExample(b.dataset.example));
render();
window.chemistry={ready:engineReady,getProject:()=>clone(project),loadExample,openEditor,applyEditor,applyDrawingStyle,exportSvg:()=>exportSvg(project),pngData,validateProject,loadProject:value=>{const next=validateProject(value);for(const o of next.objects)if(o.type==='molecule')o.svg=sanitizeSvg(o.svg);mutate(()=>{project=next;selected=new Set();});},get engine(){return engine;}};
(async()=>{try{const recovery=await window.desktop.recover();if(recovery){const recovered=validateProject(JSON.parse(recovery));for(const o of recovered.objects)if(o.type==='molecule')o.svg=sanitizeSvg(o.svg);project=recovered;savedJson='';render();$('#save-state').textContent='已恢复上次画布 · 请保存项目';toast('已恢复上次的绘图画布');}}catch(e){error(Error('恢复副本读取失败，原文件保留：'+e.message));}})();
