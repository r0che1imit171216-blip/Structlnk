import {endpoint} from './model.mjs';
import {isACS} from './drawing-style.mjs';
export const NS='http://www.w3.org/2000/svg';
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function sanitizeSvg(source){
  const doc=new DOMParser().parseFromString(source,'image/svg+xml');
  if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('结构 SVG 无效');
  const allowed=new Set(['svg','g','path','rect','line','polyline','polygon','circle','ellipse','text','tspan','defs','symbol','use','clipPath','title','desc','image']);
  const attrs=new Set(['xmlns','xmlns:xlink','id','viewBox','width','height','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','d','points','transform','fill','fill-rule','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-miterlimit','opacity','fill-opacity','stroke-opacity','font-family','font-size','font-weight','font-style','text-anchor','dominant-baseline','alignment-baseline','preserveAspectRatio','overflow','clip-path','clip-rule','href','xlink:href','style','version']);
  for(const node of [doc.documentElement,...doc.documentElement.querySelectorAll('*')]){
    if(!allowed.has(node.localName)){node.remove();continue;}
    for(const a of [...node.attributes]){
      if(node.localName==='image'&&a.localName==='href'&&/^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\s]+$/.test(a.value))continue;
      if(!attrs.has(a.name)||/javascript:|data:|https?:|expression|@import|\\/i.test(a.value)&&!a.name.startsWith('xmlns')||/url\(\s*['"]?(?!#)/i.test(a.value)||(a.localName==='href'&&!a.value.startsWith('#')))node.removeAttributeNode(a);
    }
  }
  return new XMLSerializer().serializeToString(doc.documentElement);
}
export function svgDimensions(source){
  const el=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;
  const vb=(el.getAttribute('viewBox')||'').split(/[ ,]+/).map(Number);
  return vb.length===4&&vb[2]>0&&vb[3]>0?{w:vb[2],h:vb[3]}:{w:parseFloat(el.getAttribute('width'))||240,h:parseFloat(el.getAttribute('height'))||150};
}
export function arrowMarkup(o,objects){
  const a=endpoint(o,'start',objects),b=endpoint(o,'end',objects),color=o.color||'#202b35',sw=o.width||2;
  const curved=['curve','fishhook'].includes(o.kind);
  const path=curved?`M${a.x} ${a.y} Q${o.cx} ${o.cy} ${b.x} ${b.y}`:`M${a.x} ${a.y} L${b.x} ${b.y}`;
  let dx=b.x-(curved?o.cx:a.x),dy=b.y-(curved?o.cy:a.y),len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
  const hs=o.headSize||11,hw=hs*5/11;
  const head=(tip,ux,uy,half=false)=>`<path d="M${tip.x-ux*hs-uy*hw} ${tip.y-uy*hs+ux*hw} L${tip.x} ${tip.y}${half?'':` L${tip.x-ux*hs+uy*hw} ${tip.y-uy*hs-ux*hw}`}"/>`;
  let body=`<path d="${path}"/>`;
  if(o.kind==='equilibrium'){
    const offset={x:-dy*hw,y:dx*hw},aa={x:a.x+offset.x,y:a.y+offset.y},bb={x:b.x+offset.x,y:b.y+offset.y},cc={x:a.x-offset.x,y:a.y-offset.y},dd={x:b.x-offset.x,y:b.y-offset.y};
    body=`<path d="M${aa.x} ${aa.y} L${bb.x} ${bb.y} M${dd.x} ${dd.y} L${cc.x} ${cc.y}"/>${head(bb,dx,dy,true)}${head(cc,-dx,-dy,true)}`;
  }else if(o.kind!=='line')body+=head(b,dx,dy,o.kind==='fishhook');
  return `<g fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
}
export function objectMarkup(o,objects){
  if(o.type==='arrow')return arrowMarkup(o,objects);
  if(o.type==='text')return `<text x="${o.x}" y="${o.y}" fill="${o.color||'#202b35'}" font-size="${o.size}" font-family="Arial, Microsoft YaHei, sans-serif" font-weight="${o.bold?'600':'400'}">${o.text.split('\n').map((t,i)=>`<tspan x="${o.x}" dy="${i?o.size*1.4:0}">${escape(t)||' '}</tspan>`).join('')}</text>`;
  let svg=sanitizeSvg(o.svg);
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),el=doc.documentElement;
  if(!el.hasAttribute('viewBox')){const {w,h}=svgDimensions(svg);el.setAttribute('viewBox',`0 0 ${w} ${h}`);}
  // Indigo emits a white rectangle larger than the viewport. Remove only that
  // full-canvas background so transparent PNGs do not contain white tiles.
  const dim=svgDimensions(svg);
  for(const child of [...el.children])if(child.localName==='rect'&&['white','#fff','#ffffff','rgb(100%,100%,100%)','rgb(255,255,255)'].includes((child.getAttribute('fill')||'').replace(/\s/g,''))&&Number(child.getAttribute('x')||0)<=0&&Number(child.getAttribute('y')||0)<=0&&Number(child.getAttribute('width'))>=dim.w&&Number(child.getAttribute('height'))>=dim.h)child.remove();
  // Every structure gets its own glyph IDs so independent Indigo SVGs cannot collide.
  for(const node of el.querySelectorAll('[id]'))node.id=o.id+'-'+node.id;
  for(const node of el.querySelectorAll('*'))for(const attr of [...node.attributes]){
    if(attr.localName==='href'&&attr.value.startsWith('#'))node.setAttributeNS(attr.namespaceURI,attr.name,'#'+o.id+'-'+attr.value.slice(1));
    else if(attr.value.includes('url(#'))node.setAttribute(attr.name,attr.value.replace(/url\(#/g,`url(#${o.id}-`));
  }
  el.setAttribute('x',o.x);el.setAttribute('y',o.y);el.setAttribute('width',o.w);el.setAttribute('height',o.h);el.setAttribute('preserveAspectRatio','xMidYMid meet');
  return new XMLSerializer().serializeToString(el);
}
export function exportSvg(project){
  const physical=isACS(project)?'width="540pt" height="720pt"':'width="'+project.page.width+'" height="'+project.page.height+'"';
  return `<svg xmlns="${NS}" xmlns:xlink="http://www.w3.org/1999/xlink" ${physical} viewBox="0 0 ${project.page.width} ${project.page.height}"><title>${escape(project.name)}</title>${project.objects.map(o=>objectMarkup(o,project.objects)).join('')}</svg>`;
}
