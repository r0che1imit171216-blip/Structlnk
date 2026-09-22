// Original ChemDraw import adapter. Chemical decoding is provided by Ketcher/Indigo.
// This bounded record scan only selects CDX pages and reports source object counts.
const counts=()=>({atoms:0,bonds:0,texts:0,arrows:0,curves:0,images:0,special:0});
const byteString=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return s;};
const xmlCount=page=>{
  const c=counts();for(const n of page.querySelectorAll('*')){
    const t=n.localName;if(t==='n')c.atoms++;else if(t==='b')c.bonds++;
    else if(t==='t'&&!n.closest('n'))c.texts++;else if(t==='arrow')c.arrows++;
    else if(t==='curve')c.curves++;else if(t==='embeddedobject')c.images++;
    else if(['spectrum','table','tlcplate','objectdefinition','oleclientitem'].includes(t))c.special++;
  }return c;
};
export function prepareChemDraw(file){
  if(file.kind==='cdxml'){
    if(/<!ENTITY/i.test(file.content)||/<!DOCTYPE[^>]*\[/i.test(file.content))throw Error('此 CDXML 含自定义实体，暂不支持。请在 ChemDraw 中另存为普通 CDXML。');
    const source=file.content.replace(/<!DOCTYPE[^>]*>/gi,'');
    const doc=new DOMParser().parseFromString(source,'application/xml');
    if(doc.querySelector('parsererror')||doc.documentElement.localName!=='CDXML')throw Error('CDXML 格式损坏或不是 ChemDraw XML 文件。');
    const pages=[...doc.documentElement.children].filter(n=>n.localName==='page');
    if(!pages.length)throw Error('CDXML 中没有可导入的页面。');
    return {name:file.name,kind:file.kind,pages:pages.map((p,i)=>({number:i+1,counts:xmlCount(p)})),source(index){
      if(!pages[index])throw Error('页面不存在');const copy=doc.cloneNode(true);[...copy.documentElement.children].filter(n=>n.localName==='page').forEach((n,i)=>{if(i!==index)n.remove();});return new XMLSerializer().serializeToString(copy);
    }};
  }
  if(file.kind!=='cdx')throw Error('不支持的 ChemDraw 格式');
  let bytes;try{bytes=Uint8Array.from(atob(file.content),c=>c.charCodeAt(0));}catch{throw Error('CDX 编码损坏');}
  if(bytes.length<28||byteString(bytes.subarray(0,8))!=='VjCD0100')throw Error('不是有效的 CDX 二进制文件。请确认文件扩展名。');
  const view=new DataView(bytes.buffer),stack=[],pages=[];let pos=22,records=0;
  const need=n=>{if(pos+n>bytes.length)throw Error('CDX 文件不完整，无法读取。');};
  while(pos<bytes.length){
    if(++records>500000)throw Error('CDX 对象过多，请拆分文件后导入。');need(2);const start=pos,tag=view.getUint16(pos,true);pos+=2;
    if(tag===0){const node=stack.pop();if(node?.tag===0x8001)node.page.end=pos;continue;}
    if(tag&0x8000){need(4);pos+=4;if(stack.length>512)throw Error('CDX 嵌套过深');
      const parentPage=stack.find(n=>n.page)?.page;let page=parentPage;
      if(tag===0x8001){if(parentPage)throw Error('暂不支持嵌套的 CDX 页面');page={number:pages.length+1,start,end:0,counts:counts()};pages.push(page);}
      if(page){const c=page.counts;if(tag===0x8004)c.atoms++;else if(tag===0x8005)c.bonds++;
        else if(tag===0x8006&&!stack.some(n=>n.tag===0x8004))c.texts++;else if(tag===0x8027)c.arrows++;
        else if(tag===0x8008)c.curves++;else if(tag===0x8009)c.images++;
        else if([0x800f,0x8010,0x8012,0x8016,0x8023].includes(tag))c.special++;
      }stack.push({tag,...(tag===0x8001?{page}:{})});
    }else{need(2);let length=view.getUint16(pos,true);pos+=2;if(length===0xffff){need(4);length=view.getUint32(pos,true);pos+=4;}need(length);pos+=length;}
  }
  if(stack.length||!pages.length||pages.some(p=>!p.end))throw Error('CDX 页面结构不完整或未找到页面。');
  return {name:file.name,kind:file.kind,pages,source(index){
    if(!pages[index])throw Error('页面不存在');const chunks=[];let offset=0;
    for(let i=0;i<pages.length;i++){const p=pages[i];chunks.push(bytes.subarray(offset,p.start));if(i===index)chunks.push(bytes.subarray(p.start,p.end));offset=p.end;}
    chunks.push(bytes.subarray(offset));const selected=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));offset=0;for(const c of chunks){selected.set(c,offset);offset+=c.length;}return btoa(byteString(selected));
  }};
}
export function summarizeImport(ket,source){
  const k=JSON.parse(ket),c={molecules:0,atoms:0,bonds:0,texts:0,arrows:0,images:0,shapes:0};
  for(const node of k.root.nodes){const n=node.$ref?k[node.$ref]:node;if(!n)continue;
    if(n.type==='molecule'){c.molecules++;c.atoms+=(n.atoms||[]).length;c.bonds+=(n.bonds||[]).length;}
    else if(n.type==='text')c.texts++;else if(n.type==='arrow'||n.type==='multi-tailed-arrow')c.arrows++;
    else if(n.type==='image')c.images++;else c.shapes++;
  }
  const warnings=[];
  if(source.atoms>c.atoms)warnings.push(`原文件有 ${source.atoms} 个原子节点，转换后有 ${c.atoms} 个原子；请核对缩写、嵌套结构及缺失内容。`);
  if(source.texts>c.texts)warnings.push('部分独立文字可能未保留，请对照原文件检查。');
  if(source.arrows>c.arrows)warnings.push('原文件的部分箭头可能未保留，请对照原文件检查。');
  if(source.curves)warnings.push(`原文件含 ${source.curves} 个曲线对象；机理弯箭头的方向、鱼钩和控制点需要核对。`);
  if(source.images>c.images)warnings.push('部分嵌入对象未转换为图片；OLE、矢量附件等内容可能缺失。');
  if(source.special)warnings.push(`原文件含 ${source.special} 个表格、谱图或其他特殊对象，暂不保证保留。`);
  return {counts:c,warnings};
}
