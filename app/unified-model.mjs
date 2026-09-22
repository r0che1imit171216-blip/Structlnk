import {validateProject,endpoint} from './model.mjs';
import {ACS_PAGE,isACS} from './drawing-style.mjs';
export const EMPTY=JSON.stringify({root:{nodes:[]}});
export const newProject=(style='standard')=>({format:'chemistry-lab',version:2,name:'Untitled Drawing',drawingStyle:style,page:style==='acs1996'?{...ACS_PAGE}:{width:1200,height:800},ket:EMPTY,highlights:[]});
export function validateUnified(p){
  if(!p||p.format!=='chemistry-lab'||p.version!==2||typeof p.name!=='string'||p.name.length>200||!['standard','acs1996'].includes(p.drawingStyle)||typeof p.ket!=='string')throw Error('不是有效的 Structlnk 项目');
  const expected=newProject(p.drawingStyle).page;if(p.page?.width!==expected.width||p.page?.height!==expected.height)throw Error('项目页面尺寸无效');
  let k;try{k=JSON.parse(p.ket);}catch{throw Error('化学数据无效');}if(!Array.isArray(k.root?.nodes)||k.root.nodes.length>10000)throw Error('化学对象数量或数据无效');
  if(p.highlights===undefined)p={...p,highlights:[]};
  if(!Array.isArray(p.highlights)||p.highlights.length>500||p.highlights.some(h=>!h||!/^#[0-9a-f]{6}$/i.test(h.color)||!Array.isArray(h.atoms)||!Array.isArray(h.bonds)||[...h.atoms,...h.bonds].some(id=>!Number.isInteger(id)||id<0||id>100000)))throw Error('画布配色数据无效');
  if(p.originalProject!==undefined)validateProject(p.originalProject);
  return structuredClone(p);
}
function bounds(k){
  const points=[];const walk=v=>{if(!v||typeof v!=='object')return;
    if(Array.isArray(v.location)&&v.location.length>=2)points.push(v.location);
    if(typeof v.x==='number'&&typeof v.y==='number'){points.push([v.x,v.y]);if(typeof v.width==='number')points.push([v.x+v.width,v.y-(v.height||0)]);}
    for(const [key,x]of Object.entries(v))if(key!=='stereoFlagPosition'&&x&&typeof x==='object')walk(x);
  };walk(k);if(!points.length)return {x:0,y:0};
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const [x,y]of points){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return {x:(x0+x1)/2,y:(y0+y1)/2};
}
function transform(k,scale,dx,dy){
  function visit(v){if(!v||typeof v!=='object')return;
    if(Array.isArray(v.location)){v.location[0]=v.location[0]*scale+dx;v.location[1]=v.location[1]*scale+dy;}
    if(typeof v.x==='number'&&typeof v.y==='number'){v.x=v.x*scale+dx;v.y=v.y*scale+dy;}
    for(const key of ['width','height'])if(typeof v[key]==='number')v[key]*=scale;
    for(const [key,x]of Object.entries(v))if(x&&typeof x==='object'){if(key==='stereoFlagPosition'){x.x=x.x*scale+dx;x.y=x.y*scale-dy;}else visit(x);}
  }visit(k);
}
export function convertLegacy(value){
  const old=validateProject(value),out=newProject(isACS(old)?'acs1996':'standard'),merged={ket_version:'2.0.0',root:{nodes:[],connections:[],templates:[]}};
  out.name=old.name;out.originalProject=old;const unit=isACS(old)?19.2:40;
  old.objects.forEach((o,i)=>{
    if(o.type==='molecule'){
      const k=JSON.parse(o.ket),center=bounds(k);let bond=0,n=0;
      for(const mol of Object.values(k))if(mol.type==='molecule')for(const b of mol.bonds||[]){const a=mol.atoms[b.atoms[0]]?.location,z=mol.atoms[b.atoms[1]]?.location;if(a&&z){bond+=Math.hypot(z[0]-a[0],z[1]-a[1]);n++;}}
      const doc=new DOMParser().parseFromString(o.svg,'image/svg+xml'),el=doc.documentElement;
      const vb=(el.getAttribute('viewBox')||'').split(/[ ,]+/).map(Number),width=vb.length===4?vb[2]:parseFloat(el.getAttribute('width'));
      const path=[...el.querySelectorAll('path[stroke-width][transform]')].find(p=>/matrix\(/.test(p.getAttribute('transform')));
      const native=Number(path?.getAttribute('transform').match(/matrix\(\s*([\d.e+-]+)/)?.[1])||(isACS(old)?120:40);
      const scale=(o.w/width)*native/(n?bond/n:1)/unit;
      transform(k,scale,(o.x+o.w/2)/unit-center.x*scale,-(o.y+o.h/2)/unit-center.y*scale);
      const refs=Object.fromEntries(Object.keys(k).filter(s=>!['root','ket_version'].includes(s)).map((s,j)=>[s,`${s.match(/^[A-Za-z_]+/)?.[0]||'mol'}${i*10000+j}`]));
      const rename=v=>{if(!v||typeof v!=='object')return;if(v.$ref&&refs[v.$ref])v.$ref=refs[v.$ref];for(const a of Object.values(v))if(a&&typeof a==='object')rename(a);};rename(k);
      for(const [key,v]of Object.entries(k))if(refs[key])merged[refs[key]]=v;
      for(const key of ['nodes','connections','templates'])merged.root[key].push(...(k.root[key]||[]));
    }else if(o.type==='text'){
      merged.root.nodes.push({type:'text',boundingBox:{x:o.x/unit,y:-(o.y-o.size)/unit,width:Math.max(1,o.text.length*.4),height:o.size*1.4/unit},paragraphs:[{parts:[{text:o.text,...(o.bold?{bold:true}:{}),font:{size:Math.max(6,Math.round(o.size*40/unit))}}]}]});
    }else{
      const a=endpoint(o,'start',old.objects),b=endpoint(o,'end',old.objects),pos=[a,b].map(p=>({x:p.x/unit,y:-p.y/unit,z:0}));
      if(o.kind==='line')merged.root.nodes.push({type:'simpleObject',data:{mode:'line',pos}});
      else{const modes={equilibrium:'equilibrium-open-angle',curve:'elliptical-arc-arrow-open-angle',fishhook:'elliptical-arc-arrow-open-half-angle'};const data={mode:modes[o.kind]||'open-angle',pos};
        if(['curve','fishhook'].includes(o.kind)){const dx=b.x-a.x,dy=b.y-a.y;data.height=((o.cy-(a.y+b.y)/2)*dx-(o.cx-(a.x+b.x)/2)*dy)/(Math.hypot(dx,dy)||1)/unit/2;}
        merged.root.nodes.push({type:'arrow',data});}
    }
  });out.ket=JSON.stringify(merged,null,2);return validateUnified(out);
}
