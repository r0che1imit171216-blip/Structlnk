const fs=require('node:fs/promises');
const path=require('node:path');

const MAX_CONTEXT=2*1024*1024,MAX_RESULT=6*1024*1024,MAX_IMAGE=10*1024*1024;
const HIGHLIGHT_SCHEMA={type:['object','null'],additionalProperties:false,properties:{color:{type:['string','null']},target:{type:'string',enum:['selection','all','ids']},atoms:{type:'array',items:{type:'integer'}},bonds:{type:'array',items:{type:'integer'}}},required:['color','target','atoms','bonds']};
const POINT_SCHEMA={type:['array','null'],items:{type:'number'},minItems:2,maxItems:2};
const CANVAS_OPERATION_SCHEMA={type:'object',additionalProperties:false,properties:{
  op:{type:'string',enum:['add_structure','add_text','add_arrow','move_objects','rotate_objects','align_objects','set_atom','set_bond']},
  source:{type:['string','null']},text:{type:['string','null']},arrowType:{type:['string','null'],enum:['reaction','equilibrium','retrosynthetic',null]},
  at:POINT_SCHEMA,from:POINT_SCHEMA,to:POINT_SCHEMA,center:POINT_SCHEMA,
  atomIds:{type:'array',items:{type:'integer'}},bondIds:{type:'array',items:{type:'integer'}},textIds:{type:'array',items:{type:'integer'}},arrowIds:{type:'array',items:{type:'integer'}},
  dx:{type:['number','null']},dy:{type:['number','null']},angle:{type:['number','null']},axis:{type:['string','null'],enum:['x','y',null]},value:{type:['number','null']},
  atomId:{type:['integer','null']},label:{type:['string','null']},charge:{type:['integer','null']},bondId:{type:['integer','null']},bondType:{type:['integer','null']}
},required:['op','source','text','arrowType','at','from','to','center','atomIds','bondIds','textIds','arrowIds','dx','dy','angle','axis','value','atomId','label','charge','bondId','bondType']};
const PLAN_SCHEMA={type:'object',additionalProperties:false,properties:{message:{type:'string'},warnings:{type:'array',items:{type:'string'}},mode:{type:'string',enum:['no_change','replace_source','add_source','replace_ket','canvas_ops','set_highlight','clear_highlight']},source:{type:['string','null']},ket:{type:['string','null']},operations:{type:'array',maxItems:20,items:CANVAS_OPERATION_SCHEMA},highlight:HIGHLIGHT_SCHEMA},required:['message','warnings','mode','source','ket','operations','highlight']};
const INSTRUCTIONS=`你是 Structlnk 画布的化学助手和结构编辑规划器。当前画布以 KET 2.0 JSON 提供，可能还附有 SMILES。
只返回符合给定 JSON Schema 的对象。不要输出 Markdown。

当输入附有参考图片时，识别其中的化学结构、元素标签、键级、电荷、立体键、反应箭头、条件文字和相对排版，并结合用户指令决定是否转换为可编辑画布内容。单一分子优先返回 SMILES 或 Molfile；包含多个结构、反应箭头或排版时可返回完整 KET。图片模糊、被裁切或存在无法确认的立体化学、键级、配位方向时，不得臆造；在 warnings 中逐项说明，无法可靠转换时使用 no_change。

选择最小范围的修改方式：
- no_change：指令不明确、无法安全完成或只需回答时，不修改画布。
- replace_source：用可由 Ketcher 解析的 SMILES、反应 SMILES、Molfile 或 RXN 替换整个画布。只适合空画布、单一结构，或用户明确要求整体替换。
- add_source：向现有画布添加一个可解析结构片段，source 放 SMILES/Molfile。
- canvas_ops：对画布执行 1–20 个受约束的原子操作，operations 按顺序执行。优先用于添加多个结构/文字/箭头、移动/旋转/对齐对象，或按 ID 修改原子和键；它比重写整张 KET 更安全。
- replace_ket：对现有画布做局部修改或需要保留文字、箭头、排版时，ket 必须是完整、有效、可解析的 KET JSON 字符串。
- set_highlight：给原子和键添加或替换半透明背景高亮。highlight.color 使用 #RRGGBB；target 可为 selection、all 或 ids。selection 用于用户已经框选的对象；all 仅用于用户明确要求整张画布或画布只有一个结构；ids 必须从 canvas.structureMap 中选择准确的原子和键 ID。
- clear_highlight：清除高亮。target、atoms、bonds 的规则与 set_highlight 相同，color 为 null。

canvas_ops 的操作规则：
- add_structure：source 为 SMILES/Molfile，at 为目标坐标；at 为 null 时软件自动寻找右侧空白处。
- add_text：text 为要添加的纯文字，at 为位置；不要在文字中夹带 HTML。
- add_arrow：arrowType 为 reaction、equilibrium 或 retrosynthetic，from/to 为箭头起止坐标；坐标缺省时软件自动放在空白处。
- move_objects：列出要移动的对象 ID，dx/dy 为化学坐标位移。
- rotate_objects：列出对象 ID，angle 为 -360 到 360 度，center 可为 null 以使用对象中心。
- align_objects：列出对象 ID，axis 为 x 或 y；value 为 null 时对齐到这些对象的平均坐标。
- set_atom：atomId 必须来自 canvas.structureMap.atoms；label 和 charge 只填写需要改变的值，其他为 null。
- set_bond：bondId 必须来自 canvas.structureMap.bonds；bondType 使用 1 单键、2 双键、3 三键、4 芳香键、9 配位键。
每条 operation 都必须包含 Schema 中的全部字段；不适用字段使用 null 或空数组。不要用 canvas_ops 删除对象。一次能由 canvas_ops 表达的修改不要返回整张 replace_ket。

修改结构时优先选择 canvas_ops、add_source 或 replace_source；仅当操作列表无法表达且必须保留复杂排版时才用 replace_ket。
replace_ket 时保留未要求修改的全部节点、键、坐标、文字、箭头、立体化学和元数据，只做必要改动。不要臆造未知反应条件。不要把带电、同位素、自由基或金属配位信息擅自简化。message 用中文简述将要进行的修改；warnings 列出需要用户核对的价态、立体化学、配位方向或机理问题。

“背景色”“底色”“着色”“标记颜色”都使用 set_highlight，不要为了配色改写 KET。若用户没有指定颜色，使用容易辨认的柔和颜色，例如浅黄色 #F4D35E。给一个环或局部官能团配色时，target 使用 ids，并同时列出该局部的原子和内部键；给用户已经选中的内容配色时使用 selection。canvas.structureMap 给出可用于 ids 的画布对象 ID、元素、端点和坐标，canvas.highlights 给出现有配色。

选区限制：输入 JSON 中的 selection 字段存在且非空时，修改已有对象必须限制在选区 ID；不得使用 replace_source 覆盖整张画布。添加新结构、文字或箭头仍可进行。若指令与选区冲突，优先遵守选区限制，并在 warnings 中说明。选区和 canvas.structureMap 都包含对象 ID 与坐标。`;
const CHAT_INSTRUCTIONS=`${INSTRUCTIONS}
返回的 JSON 对象必须且只能包含这七个字段：message 字符串、warnings 字符串数组、mode 字符串、source 字符串或 null、ket 字符串或 null、operations 数组、highlight 对象或 null。所有字段都必须出现。
示例格式：{"message":"在右侧加入苯并添加反应箭头。","warnings":[],"mode":"canvas_ops","source":null,"ket":null,"operations":[{"op":"add_structure","source":"c1ccccc1","text":null,"arrowType":null,"at":null,"from":null,"to":null,"center":null,"atomIds":[],"bondIds":[],"textIds":[],"arrowIds":[],"dx":null,"dy":null,"angle":null,"axis":null,"value":null,"atomId":null,"label":null,"charge":null,"bondId":null,"bondType":null},{"op":"add_arrow","source":null,"text":null,"arrowType":"reaction","at":null,"from":null,"to":null,"center":null,"atomIds":[],"bondIds":[],"textIds":[],"arrowIds":[],"dx":null,"dy":null,"angle":null,"axis":null,"value":null,"atomId":null,"label":null,"charge":null,"bondId":null,"bondType":null}],"highlight":null}`;

function inferProvider(c={}){
  if(['custom','openai','anthropic','deepseek','local'].includes(c.provider))return c.provider;
  try{
    const url=new URL(String(c.baseUrl||''));
    if(url.hostname==='api.openai.com')return 'openai';
    if(url.hostname==='api.anthropic.com')return 'anthropic';
    if(url.hostname==='api.deepseek.com')return 'deepseek';
    if(['localhost','127.0.0.1','::1'].includes(url.hostname))return 'local';
  }catch{}
  return 'custom';
}
function publicConfig(c={}){return {provider:inferProvider(c),protocol:c.protocol||'responses',baseUrl:c.baseUrl||'https://api.openai.com/v1',model:c.model||'',thinking:Boolean(c.thinking),hasKey:Boolean(c.encryptedKey),configured:Boolean(c.baseUrl&&c.model)};}
function validateConfig(value){
  if(!value||!['responses','chat','anthropic'].includes(value.protocol))throw Error('接口协议无效');
  const provider=inferProvider(value);
  if(provider==='anthropic'&&value.protocol!=='anthropic')throw Error('Claude 官方接口必须使用 Anthropic Messages API');
  if(provider!=='anthropic'&&value.protocol==='anthropic')throw Error('Anthropic Messages API 仅用于 Claude 官方接口');
  if(typeof value.model!=='string'||!value.model.trim()||value.model.length>200)throw Error('请填写模型 ID');
  let url;try{url=new URL(String(value.baseUrl||''));}catch{throw Error('API 根地址无效');}
  if(url.username||url.password||url.search||url.hash)throw Error('API 根地址不能包含账号、查询参数或片段');
  const local=['localhost','127.0.0.1','::1'].includes(url.hostname);
  if(url.protocol!=='https:'&&!(url.protocol==='http:'&&local))throw Error('远程 API 必须使用 HTTPS；本机接口可以使用 HTTP');
  if(url.href.length>500)throw Error('API 根地址过长');
  return {provider,protocol:value.protocol,baseUrl:url.href.replace(/\/$/,''),model:value.model.trim(),thinking:Boolean(value.thinking)};
}
function endpoint(base,protocol){const suffix=protocol==='responses'?'responses':protocol==='anthropic'?'messages':'chat/completions';return base.endsWith('/'+suffix)?base:base+'/'+suffix;}
function validateImageAttachment(image){
  if(image==null)return null;
  if(!image||typeof image!=='object'||Array.isArray(image))throw Error('图片附件无效');
  const name=String(image.name||'image').slice(0,200),dataUrl=String(image.dataUrl||'');
  const match=dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/i);
  if(!match)throw Error('仅支持 JPEG、PNG、GIF 或 WebP 图片');
  let bytes;try{bytes=Buffer.from(match[2],'base64');}catch{throw Error('图片附件无法解码');}
  if(!bytes.length||bytes.length>MAX_IMAGE)throw Error('图片大小必须在 10 MB 以内');
  const mime=match[1].toLowerCase(),ascii=(start,end)=>bytes.subarray(start,end).toString('ascii');
  const valid=mime==='image/jpeg'&&bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff
    ||mime==='image/png'&&bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
    ||mime==='image/gif'&&bytes.length>=6&&['GIF87a','GIF89a'].includes(ascii(0,6))
    ||mime==='image/webp'&&bytes.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';
  if(!valid)throw Error('图片内容与文件格式不一致');
  return {name,mimeType:mime,dataUrl:`data:${mime};base64,${match[2]}`,size:bytes.length};
}
function buildRequestBody(config,user,image){
  if(config.protocol==='responses'){
    const input=image?[{role:'user',content:[{type:'input_text',text:user},{type:'input_image',image_url:image.dataUrl,detail:'high'}]}]:user;
    return {model:config.model,store:false,instructions:INSTRUCTIONS,input,text:{format:{type:'json_schema',name:'structlnk_canvas_plan',strict:true,schema:PLAN_SCHEMA}}};
  }
  if(config.protocol==='anthropic'){
    const content=image?[{type:'image',source:{type:'base64',media_type:image.mimeType,data:image.dataUrl.slice(image.dataUrl.indexOf(',')+1)}},{type:'text',text:user}]:user;
    return {model:config.model,max_tokens:16384,system:CHAT_INSTRUCTIONS,messages:[{role:'user',content}],output_config:{format:{type:'json_schema',schema:PLAN_SCHEMA}}};
  }
  const content=image?[{type:'text',text:user},{type:'image_url',image_url:{url:image.dataUrl,detail:'high'}}]:user;
  return {model:config.model,messages:[{role:'system',content:CHAT_INSTRUCTIONS},{role:'user',content}],response_format:config.provider==='deepseek'?{type:'json_object'}:{type:'json_schema',json_schema:{name:'structlnk_canvas_plan',strict:true,schema:PLAN_SCHEMA}},...(config.provider==='deepseek'?{thinking:{type:config.thinking?'enabled':'disabled'},max_tokens:32768,stream:true}:{})};
}
function stripFence(text){const s=String(text||'').trim();const m=s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);return m?m[1]:s;}
function extractResponse(data,protocol){
  if(protocol==='anthropic')return (data?.content||[]).filter(part=>part?.type==='text').map(part=>part.text||'').join('');
  if(protocol==='chat'){
    const content=data?.choices?.[0]?.message?.content;
    if(Array.isArray(content))return content.map(x=>x?.text||'').join('');
    return content;
  }
  if(typeof data?.output_text==='string')return data.output_text;
  for(const item of data?.output||[])for(const part of item?.content||[])if(typeof part?.text==='string')return part.text;
  return '';
}
function sanitizeSelection(sel){
  if(!sel||typeof sel!=='object'||Array.isArray(sel))return null;
  const num=v=>{const n=Number(v);return Number.isFinite(n)?Math.round(n*100)/100:null;};
  const loc=p=>Array.isArray(p)&&p.length>=2&&num(p[0])!==null&&num(p[1])!==null?[num(p[0]),num(p[1])]:null;
  const out={};
  const id=v=>Number.isInteger(v)&&v>=0&&v<=100000?v:null;
  const clean=(key,limit)=>Array.isArray(sel[key])?sel[key].slice(0,limit).map(o=>{
    if(!o||typeof o!=='object')return null;
    if(key==='atoms'){const p=loc(o.location),objectId=id(o.id);return p?{...(objectId===null?{}:{id:objectId}),location:p,label:String(o.label||'').slice(0,10)}:null;}
    if(key==='bonds'||key==='arrows'){const from=loc(o.from),to=loc(o.to),objectId=id(o.id);return from&&to?{...(objectId===null?{}:{id:objectId}),from,to}:null;}
    const p=loc(o.location),objectId=id(o.id);return p?{...(objectId===null?{}:{id:objectId}),location:p}:null;
  }).filter(Boolean):[];
  out.atoms=clean('atoms',200);out.bonds=clean('bonds',200);out.texts=clean('texts',50);out.arrows=clean('arrows',50);
  return out.atoms.length||out.bonds.length||out.texts.length||out.arrows.length?out:null;
}
function sanitizeStructureMap(map){
  if(!map||typeof map!=='object'||Array.isArray(map))return {atoms:[],bonds:[],texts:[],arrows:[]};
  const id=v=>Number.isInteger(v)&&v>=0&&v<=100000?v:null,num=v=>{const n=Number(v);return Number.isFinite(n)?Math.round(n*100)/100:null;},loc=p=>Array.isArray(p)&&p.length>=2&&num(p[0])!==null&&num(p[1])!==null?[num(p[0]),num(p[1])]:null;
  const atoms=Array.isArray(map.atoms)?map.atoms.slice(0,5000).map(o=>{const objectId=id(o?.id),location=loc(o?.location);return objectId===null||!location?null:{id:objectId,location,label:String(o.label||'').slice(0,10)};}).filter(Boolean):[];
  const bonds=Array.isArray(map.bonds)?map.bonds.slice(0,7500).map(o=>{const objectId=id(o?.id),begin=id(o?.begin),end=id(o?.end),from=loc(o?.from),to=loc(o?.to);return objectId===null||begin===null||end===null||!from||!to?null:{id:objectId,begin,end,from,to};}).filter(Boolean):[];
  const texts=Array.isArray(map.texts)?map.texts.slice(0,1000).map(o=>{const objectId=id(o?.id),location=loc(o?.location);return objectId===null||!location?null:{id:objectId,location};}).filter(Boolean):[];
  const arrows=Array.isArray(map.arrows)?map.arrows.slice(0,1000).map(o=>{const objectId=id(o?.id),from=loc(o?.from),to=loc(o?.to);return objectId===null||!from||!to?null:{id:objectId,from,to};}).filter(Boolean):[];
  return {atoms,bonds,texts,arrows};
}
function sanitizeHighlights(value){return Array.isArray(value)?value.slice(0,500).map(item=>{const color=String(item?.color||'').toUpperCase();if(!/^#[0-9A-F]{6}$/.test(color))return null;const ids=key=>Array.isArray(item[key])?[...new Set(item[key].filter(id=>Number.isInteger(id)&&id>=0&&id<=100000))].slice(0,10000):[];return {color,atoms:ids('atoms'),bonds:ids('bonds')};}).filter(Boolean):[];}
function validateHighlight(raw,mode){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('模型返回的配色方案无效');
  const target=raw.target;if(!['selection','all','ids'].includes(target))throw Error('模型返回的配色目标无效');
  const ids=key=>Array.isArray(raw[key])?[...new Set(raw[key].filter(id=>Number.isInteger(id)&&id>=0&&id<=100000))].slice(0,10000):[];
  const highlight={color:raw.color==null?null:String(raw.color).toUpperCase(),target,atoms:ids('atoms'),bonds:ids('bonds')};
  if(mode==='set_highlight'&&!/^#[0-9A-F]{6}$/.test(highlight.color||''))throw Error('模型返回的高亮颜色无效');
  if(target==='ids'&&!highlight.atoms.length&&!highlight.bonds.length)throw Error('模型没有指定需要配色的原子或键');
  if(mode==='clear_highlight')highlight.color=null;
  return highlight;
}
function validateCanvasOperations(raw){
  if(!Array.isArray(raw)||!raw.length||raw.length>20)throw Error('模型返回的画布操作必须为 1–20 条');
  const point=value=>{if(value==null)return null;if(!Array.isArray(value)||value.length!==2)throw Error('画布操作坐标无效');const out=value.map(Number);if(out.some(n=>!Number.isFinite(n)||Math.abs(n)>10000))throw Error('画布操作坐标超出范围');return out.map(n=>Math.round(n*1000)/1000);};
  const ids=value=>Array.isArray(value)?[...new Set(value.filter(id=>Number.isInteger(id)&&id>=0&&id<=100000))].slice(0,10000):[];
  const number=(value,limit)=>{if(value==null)return null;const n=Number(value);if(!Number.isFinite(n)||Math.abs(n)>limit)throw Error('画布操作数值超出范围');return Math.round(n*1000)/1000;};
  return raw.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item))throw Error('模型返回了无效的画布操作');
    const op=item.op;if(!['add_structure','add_text','add_arrow','move_objects','rotate_objects','align_objects','set_atom','set_bond'].includes(op))throw Error('模型返回了未知的画布操作');
    const operation={op,source:item.source==null?null:String(item.source),text:item.text==null?null:String(item.text),arrowType:item.arrowType==null?null:String(item.arrowType),at:point(item.at),from:point(item.from),to:point(item.to),center:point(item.center),atomIds:ids(item.atomIds),bondIds:ids(item.bondIds),textIds:ids(item.textIds),arrowIds:ids(item.arrowIds),dx:number(item.dx,1000),dy:number(item.dy,1000),angle:number(item.angle,360),axis:item.axis==null?null:String(item.axis),value:number(item.value,10000),atomId:Number.isInteger(item.atomId)&&item.atomId>=0&&item.atomId<=100000?item.atomId:null,label:item.label==null?null:String(item.label),charge:Number.isInteger(item.charge)?item.charge:null,bondId:Number.isInteger(item.bondId)&&item.bondId>=0&&item.bondId<=100000?item.bondId:null,bondType:Number.isInteger(item.bondType)?item.bondType:null};
    const objectCount=operation.atomIds.length+operation.bondIds.length+operation.textIds.length+operation.arrowIds.length;
    if(op==='add_structure'&&(!operation.source||operation.source.length>200000))throw Error('添加结构操作缺少有效的结构源');
    if(op==='add_text'&&(!operation.text||operation.text.length>2000))throw Error('添加文字操作缺少有效文字');
    if(op==='add_arrow'&&!['reaction','equilibrium','retrosynthetic'].includes(operation.arrowType))throw Error('添加箭头操作类型无效');
    if(op==='add_arrow'&&Boolean(operation.from)!==Boolean(operation.to))throw Error('箭头起点和终点必须同时提供');
    if(op==='add_arrow'&&operation.from&&Math.hypot(operation.to[0]-operation.from[0],operation.to[1]-operation.from[1])<0.25)throw Error('箭头长度过短');
    if(op==='move_objects'&&(!objectCount||operation.dx===null||operation.dy===null||(!operation.dx&&!operation.dy)))throw Error('移动操作缺少对象或位移');
    if(op==='rotate_objects'&&(!objectCount||operation.angle===null||!operation.angle))throw Error('旋转操作缺少对象或角度');
    if(op==='align_objects'&&(!objectCount||!['x','y'].includes(operation.axis)))throw Error('对齐操作缺少对象或坐标轴');
    if(op==='set_atom'&&(operation.atomId===null||operation.label===null&&operation.charge===null))throw Error('原子修改操作缺少目标或新属性');
    if(op==='set_atom'&&(operation.label!==null&&!/^(?:[A-Z][a-z]?|\*|R(?:#|\d*)?)$/.test(operation.label)||operation.charge!==null&&(operation.charge<-8||operation.charge>8)))throw Error('原子标签或电荷无效');
    if(op==='set_bond'&&(operation.bondId===null||![1,2,3,4,9].includes(operation.bondType)))throw Error('键修改操作缺少目标或键型无效');
    return operation;
  });
}
function validateCanvasOperationTargets(plan,selection,structureMap){
  const maps={atomIds:new Set(structureMap.atoms.map(x=>x.id)),bondIds:new Set(structureMap.bonds.map(x=>x.id)),textIds:new Set(structureMap.texts.map(x=>x.id)),arrowIds:new Set(structureMap.arrows.map(x=>x.id))};
  const selected=selection?{atomIds:new Set(selection.atoms.map(x=>x.id).filter(Number.isInteger)),bondIds:new Set(selection.bonds.map(x=>x.id).filter(Number.isInteger)),textIds:new Set(selection.texts.map(x=>x.id).filter(Number.isInteger)),arrowIds:new Set(selection.arrows.map(x=>x.id).filter(Number.isInteger))}:null;
  for(const operation of plan.operations){
    if(operation.atomId!==null&&(!maps.atomIds.has(operation.atomId)||selected&&!selected.atomIds.has(operation.atomId)))throw Error('模型试图修改不存在或选区外的原子，方案已拒绝');
    if(operation.bondId!==null&&(!maps.bondIds.has(operation.bondId)||selected&&!selected.bondIds.has(operation.bondId)))throw Error('模型试图修改不存在或选区外的键，方案已拒绝');
    for(const key of ['atomIds','bondIds','textIds','arrowIds'])for(const id of operation[key])if(!maps[key].has(id)||selected&&!selected[key].has(id))throw Error('模型试图操作不存在或选区外的画布对象，方案已拒绝');
  }
}
async function readSse(response,onChunk){
  const type=response.headers?.get?.('content-type')||'';
  if(!response.body||typeof response.body.getReader!=='function'||!type.toLowerCase().includes('text/event-stream')){
    const data=await responseJson(response);return extractResponse(data,'chat')||'';
  }
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',output='',lastReported=0,bytes=0;
  const consume=line=>{
    line=line.trim();if(!line.startsWith('data:'))return;
    const payload=line.slice(5).trim();if(!payload||payload==='[DONE]')return;
    let json;try{json=JSON.parse(payload);}catch{return;}
    const content=json?.choices?.[0]?.delta?.content;if(typeof content==='string')output+=content;
  };
  for(;;){
    const {done,value}=await reader.read();if(done)break;
    bytes+=value.byteLength;if(bytes>MAX_RESULT)throw Error('模型响应过大');
    buffer+=decoder.decode(value,{stream:true});let index;
    while((index=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,index));buffer=buffer.slice(index+1);}
    if(output.length-lastReported>=4096){lastReported=output.length;try{onChunk?.(output.length);}catch{}}
  }
  buffer+=decoder.decode();if(buffer.trim())consume(buffer);
  return output;
}
function validatePlan(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('模型没有返回有效的修改方案');
  const mode=raw.mode;if(!['no_change','replace_source','add_source','replace_ket','canvas_ops','set_highlight','clear_highlight'].includes(mode))throw Error('模型返回了未知修改类型');
  const plan={message:String(raw.message||'').slice(0,2000),warnings:Array.isArray(raw.warnings)?raw.warnings.slice(0,8).map(x=>String(x).slice(0,500)):[],mode,source:raw.source==null?null:String(raw.source),ket:raw.ket==null?null:String(raw.ket),operations:[],highlight:null};
  if(!plan.message)plan.message=mode==='no_change'?'没有生成修改。':'已生成画布修改方案。';
  if(['replace_source','add_source'].includes(mode)&&(!plan.source||plan.source.length>200000))throw Error('模型返回的结构源为空或过大');
  if(mode==='replace_ket'){
    if(!plan.ket||Buffer.byteLength(plan.ket)>5_000_000)throw Error('模型返回的 KET 为空或过大');
    let ket;try{ket=JSON.parse(plan.ket);}catch{throw Error('模型返回的 KET 不是有效 JSON');}
    if(!Array.isArray(ket.root?.nodes)||ket.root.nodes.length>10000)throw Error('模型返回的 KET 结构无效');
  }
  if(mode==='canvas_ops')plan.operations=validateCanvasOperations(raw.operations);
  if(['set_highlight','clear_highlight'].includes(mode))plan.highlight=validateHighlight(raw.highlight,mode);
  if(mode==='no_change'){plan.source=null;plan.ket=null;plan.operations=[];plan.highlight=null;}
  if(!['replace_source','add_source'].includes(mode))plan.source=null;
  if(mode!=='replace_ket')plan.ket=null;
  return plan;
}
async function responseJson(response){
  const text=await response.text();if(Buffer.byteLength(text)>MAX_RESULT)throw Error('模型响应过大');
  let data;try{data=JSON.parse(text);}catch{throw Error(`API 返回了非 JSON 响应（HTTP ${response.status}）`);}
  if(!response.ok){const msg=data?.error?.message||data?.message||`HTTP ${response.status}`;throw Error('API 请求失败：'+String(msg).slice(0,500));}
  return data;
}

function createAgentService({dataDir,safeStorage,fetchImpl=globalThis.fetch}){
  const file=path.join(dataDir,'agent-config.json');
  async function read(){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw Error('无法读取 Agent 配置');}}
  async function write(value){await fs.mkdir(dataDir,{recursive:true});const temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(value,null,2));await fs.rename(temp,file);}
  async function getConfig(){return publicConfig(await read());}
  async function saveConfig(input){
    const clean=validateConfig(input),old=await read(),next={...clean};
    if(input.clearKey)next.encryptedKey='';
    else if(typeof input.apiKey==='string'&&input.apiKey){
      if(input.apiKey.length>1000)throw Error('API 密钥过长');
      if(!safeStorage?.isEncryptionAvailable?.())throw Error('Windows 系统加密当前不可用，未保存 API 密钥');
      next.encryptedKey=safeStorage.encryptString(input.apiKey).toString('base64');
    }else next.encryptedKey=old.baseUrl===clean.baseUrl?(old.encryptedKey||''):'';
    await write(next);return publicConfig(next);
  }
  async function request(input,onProgress){
    if(!input||typeof input.instruction!=='string'||!input.instruction.trim()||input.instruction.length>4000)throw Error('请输入 1–4000 字的指令或问题');
    if(typeof input.ket!=='string'||Buffer.byteLength(input.ket)>MAX_CONTEXT)throw Error('当前画布数据过大，暂时不能发送给 Agent');
    let parsed;try{parsed=JSON.parse(input.ket);}catch{throw Error('当前画布 KET 无效');}
    if(!Array.isArray(parsed.root?.nodes))throw Error('当前画布 KET 无效');
    const saved=await read(),config=validateConfig(saved);let key='';
    if(saved.encryptedKey){
      if(!safeStorage?.isEncryptionAvailable?.())throw Error('Windows 系统加密当前不可用，无法读取 API 密钥');
      try{key=safeStorage.decryptString(Buffer.from(saved.encryptedKey,'base64'));}catch{throw Error('API 密钥无法解密，请重新保存设置');}
    }
    const selection=sanitizeSelection(input.selection),structureMap=sanitizeStructureMap(input.structureMap),highlights=sanitizeHighlights(input.highlights),image=validateImageAttachment(input.image);
    if(image&&config.provider==='deepseek'&&!/^(deepseek-flash|deepseek-v4-flash|deepseek-v4-flash-vision-exp)$/i.test(config.model))throw Error('当前 DeepSeek 模型不支持图片输入，请在 API 设置中改用 deepseek-flash');
    const user=JSON.stringify({instruction:input.instruction.trim(),referenceImage:image?{name:image.name,mimeType:image.mimeType,size:image.size}:null,selection,canvas:{name:String(input.name||'').slice(0,200),drawingStyle:input.drawingStyle,stats:input.stats||{},smiles:String(input.smiles||'').slice(0,200000),ket:input.ket,structureMap,highlights}});
    const headers=config.provider==='anthropic'?{'Content-Type':'application/json','anthropic-version':'2023-06-01',...(key?{'x-api-key':key}:{})}:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})};
    const url=endpoint(config.baseUrl,config.protocol),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),300000),started=Date.now();
    const progress=chars=>{try{onProgress?.({elapsedMs:Date.now()-started,chars});}catch{}};
    try{
      let body=buildRequestBody(config,user,image);
      let text='';
      for(let attempt=0;attempt<2&&!text;attempt++){
        let response=await fetchImpl(url,{method:'POST',headers,body:JSON.stringify(body),signal:controller.signal});
        if(config.protocol==='anthropic'&&!response.ok&&[400,404,422].includes(response.status)&&body.output_config){
          body={...body};delete body.output_config;response=await fetchImpl(url,{method:'POST',headers,body:JSON.stringify(body),signal:controller.signal});
        }
        if(config.protocol==='chat'&&config.provider!=='deepseek'&&!response.ok&&[400,404,422].includes(response.status)&&body.response_format?.json_schema){
          body.response_format={type:'json_object'};response=await fetchImpl(url,{method:'POST',headers,body:JSON.stringify(body),signal:controller.signal});
        }
        if(config.protocol==='chat'&&config.provider==='deepseek'){
          if(!response.ok)await responseJson(response);text=await readSse(response,progress);
        }else{const data=await responseJson(response);text=extractResponse(data,config.protocol)||'';}
      }
      if(!text)throw Error('模型响应中没有可读取的文本结果');
      let raw;try{raw=JSON.parse(stripFence(text));}catch{throw Error('模型没有按要求返回 JSON 结构化答复');}
      const plan=validatePlan(raw);
      if(selection&&plan.mode==='replace_source')throw Error('模型试图在存在选区时替换整张画布，方案已拒绝');
      if(plan.mode==='canvas_ops')validateCanvasOperationTargets(plan,selection,structureMap);
      if(['set_highlight','clear_highlight'].includes(plan.mode)){
        const atomIds=new Set(structureMap.atoms.map(item=>item.id)),bondIds=new Set(structureMap.bonds.map(item=>item.id));
        if(plan.highlight.target==='selection'){
          const atoms=(selection?.atoms||[]).map(item=>item.id).filter(Number.isInteger),bonds=(selection?.bonds||[]).map(item=>item.id).filter(Number.isInteger);
          if(!atoms.length&&!bonds.length)throw Error('模型要求给选区配色，但当前没有原子或键选区');
          plan.highlight.atoms=atoms;plan.highlight.bonds=bonds;
        }else if(selection&&plan.highlight.target==='all')throw Error('模型试图在存在选区时给整张画布配色，方案已拒绝');
        else if(plan.highlight.target==='ids'){
          if(plan.highlight.atoms.some(id=>!atomIds.has(id))||plan.highlight.bonds.some(id=>!bondIds.has(id)))throw Error('模型返回了画布中不存在的配色对象');
          if(selection){const selectedAtoms=new Set(selection.atoms.map(item=>item.id)),selectedBonds=new Set(selection.bonds.map(item=>item.id));if(plan.highlight.atoms.some(id=>!selectedAtoms.has(id))||plan.highlight.bonds.some(id=>!selectedBonds.has(id)))throw Error('模型试图给选区外的对象配色，方案已拒绝');}
        }
      }
      return plan;
    }catch(e){if(e.name==='AbortError')throw Error('API 请求超过 5 分钟，已取消');throw e;}finally{clearTimeout(timer);}
  }
  return {getConfig,saveConfig,request};
}

module.exports={createAgentService,PLAN_SCHEMA,validatePlan,validateImageAttachment,buildRequestBody};
