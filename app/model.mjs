import {ACS_PAGE,isACS} from './drawing-style.mjs';
export const PAGE={width:1200,height:800};
export const uid=()=>crypto.randomUUID();
export const clone=value=>structuredClone(value);
export function blankProject(){return {format:'chemistry-lab',version:1,name:'Untitled Drawing',page:{...PAGE},objects:[]};}
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<100000;
export function validateProject(value){
  const size=value&&isACS(value)?ACS_PAGE:PAGE;
  if(!value||value.format!=='chemistry-lab'||value.version!==1||typeof value.name!=='string'||value.name.length>200||value.drawingStyle!==undefined&&!['standard','acs1996'].includes(value.drawingStyle)||value.page?.width!==size.width||value.page?.height!==size.height||!Array.isArray(value.objects)||value.objects.length>1000)throw Error('不是有效的 Structlnk v1 项目');
  const ids=new Set();
  for(const o of value.objects){
    if(!o||typeof o.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(o.id)||ids.has(o.id)||!['molecule','text','arrow'].includes(o.type))throw Error('项目包含无效或重复对象');ids.add(o.id);
    if(typeof o.name!=='string'||o.name.length>200)throw Error('对象名称无效');
    if(o.type==='arrow'){
      if(!['reaction','curve','fishhook','equilibrium','line','coordination'].includes(o.kind)||!['x1','y1','cx','cy','x2','y2','width'].every(k=>finite(o[k]))||o.width<=0||o.width>20)throw Error('箭头数据无效');
      if(o.headSize!==undefined&&(!finite(o.headSize)||o.headSize<=0||o.headSize>100))throw Error('箭头尺寸无效');
      for(const k of ['startAnchor','endAnchor'])if(o[k]&&!(typeof o[k].id==='string'&&finite(o[k].u)&&finite(o[k].v)))throw Error('箭头锚点无效');
    }else{
      if(!finite(o.x)||!finite(o.y))throw Error('对象坐标无效');
      if(o.type==='text'&&(typeof o.text!=='string'||o.text.length>10000||!finite(o.size)||o.size<6||o.size>100))throw Error('文本数据无效');
      if(o.type==='molecule'&&(typeof o.ket!=='string'||typeof o.svg!=='string'||!['w','h'].every(k=>finite(o[k])&&o[k]>0&&o[k]<5000)))throw Error('结构数据无效');
      if(o.type==='molecule'){try{const k=JSON.parse(o.ket);if(!k.root||!Array.isArray(k.root.nodes))throw Error();}catch{throw Error('结构的 KET 数据无效');}}
    }
    if(o.color&&!/^#[0-9a-f]{6}$/i.test(o.color))throw Error('颜色无效');
  }
  for(const o of value.objects)if(o.type==='arrow')for(const k of ['startAnchor','endAnchor'])if(o[k]&&!value.objects.some(t=>t.id===o[k].id&&t.type==='molecule'))throw Error('箭头锚点没有对应结构');
  return clone(value);
}
export function endpoint(o,end,objects){
  const anchor=o[end==='start'?'startAnchor':'endAnchor'];
  const target=anchor&&objects.find(t=>t.id===anchor.id&&t.type==='molecule');
  return target?{x:target.x+anchor.u*target.w,y:target.y+anchor.v*target.h}:{x:o[end==='start'?'x1':'x2'],y:o[end==='start'?'y1':'y2']};
}
export function detachDeleted(project,ids){
  for(const o of project.objects)if(o.type==='arrow')for(const end of ['start','end']){
    const key=end==='start'?'startAnchor':'endAnchor';
    if(o[key]&&ids.has(o[key].id)){const p=endpoint(o,end,project.objects);o[end==='start'?'x1':'x2']=p.x;o[end==='start'?'y1':'y2']=p.y;delete o[key];}
  }
  project.objects=project.objects.filter(o=>!ids.has(o.id));
}
export function translateObjects(objects,ids,dx,dy){
  for(const o of objects)if(ids.has(o.id)){
    if(o.type==='arrow'){
      o.cx+=dx;o.cy+=dy;
      for(const end of ['start','end']){const key=end==='start'?'startAnchor':'endAnchor';if(o[key]&&ids.has(o[key].id))continue;const p=endpoint(o,end,objects);delete o[key];o[end==='start'?'x1':'x2']=p.x+dx;o[end==='start'?'y1':'y2']=p.y+dy;}
    }else{o.x+=dx;o.y+=dy;}
  }
}
export function duplicateObjects(objects,ids){
  const copies=clone(objects.filter(o=>ids.has(o.id))),mapping=new Map(copies.map(o=>[o.id,uid()]));
  for(const o of copies){o.id=mapping.get(o.id);if(o.type==='arrow')for(const end of ['start','end']){const key=end==='start'?'startAnchor':'endAnchor';if(o[key]){if(mapping.has(o[key].id))o[key].id=mapping.get(o[key].id);else{const p=endpoint(o,end,objects);delete o[key];o[end==='start'?'x1':'x2']=p.x;o[end==='start'?'y1':'y2']=p.y;}}}}
  translateObjects(copies,new Set(copies.map(o=>o.id)),24,24);return copies;
}
