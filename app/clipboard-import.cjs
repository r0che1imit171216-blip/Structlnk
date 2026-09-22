const MAX=40*1024*1024;
const HEADER=Buffer.from('VjCD0100','ascii');

function cleanFormat(format=''){
  const match=String(format).match(/^electron application\/osclipboard;format="([\s\S]*)"$/i);
  return (match?match[1]:String(format)).replace(/\\"/g,'"');
}
function decodeXml(bytes){
  if(bytes[0]===0xff&&bytes[1]===0xfe)return bytes.subarray(2).toString('utf16le').replace(/\0+$/,'');
  if(bytes[0]===0xfe&&bytes[1]===0xff){const swapped=Buffer.alloc(bytes.length-2);for(let i=2;i+1<bytes.length;i+=2){swapped[i-2]=bytes[i+1];swapped[i-1]=bytes[i];}return swapped.toString('utf16le').replace(/\0+$/,'');}
  return bytes.toString('utf8').replace(/^\uFEFF/,'').replace(/\0+$/,'');
}
function score(format){
  const f=cleanFormat(format).toLowerCase();
  if(f==='chemdraw interchange format')return 100;
  if(f==='chemical/x-cdx'||f==='chemical/cdx'||f.includes('cdx'))return 90;
  if(f==='native')return 80;
  if(f.includes('cdxml')||f==='text/xml'||f==='application/xml')return 70;
  if(f==='smiles')return 60;
  if(f==='text/plain')return 10;
  return 0;
}
function isInterestingFormat(format){return score(format)>0;}

function detectChemDrawClipboard(entries){
  const ordered=(entries||[]).filter(e=>e&&Buffer.isBuffer(e.bytes)&&e.bytes.length&&e.bytes.length<=MAX).sort((a,b)=>score(b.format)-score(a.format));
  for(const entry of ordered){
    const name=cleanFormat(entry.format),lower=name.toLowerCase(),bytes=entry.bytes;
    let start=bytes.indexOf(HEADER);
    if(start>=0&&(start===0||lower==='native'||lower.includes('chemdraw')||lower.includes('cdx'))){
      if(start>1024*1024)continue;
      return {kind:'cdx',name:'ChemDraw clipboard.cdx',content:bytes.subarray(start).toString('base64'),format:name};
    }
    if(lower.includes('cdxml')||lower==='text/xml'||lower==='application/xml'||lower==='text/plain'){
      const text=decodeXml(bytes).trim();
      if(/^<\?xml[\s\S]*?<CDXML\b/i.test(text)||/^<CDXML\b/i.test(text))return {kind:'cdxml',name:'ChemDraw clipboard.cdxml',content:text,format:name};
    }
  }
  for(const entry of ordered){
    const name=cleanFormat(entry.format),lower=name.toLowerCase();
    if(lower==='smiles'||lower==='text/plain'){
      const text=decodeXml(entry.bytes).trim().replace(/\0+$/,'');
      if(lower==='text/plain'&&text.startsWith('{'))try{const ket=JSON.parse(text);if(Array.isArray(ket?.root?.nodes))return {kind:'ket',name:'Structlnk clipboard.ket',content:text,format:name};}catch{}
      if(lower==='text/plain'&&(/^\$RXN\b/m.test(text)||/M  END\s*$/m.test(text)&&/V(?:2000|3000)/.test(text)))return {kind:'mol',name:'Structlnk clipboard.mol',content:text,format:name};
      if(text&&text.length<=200000&&!/[<>\r\n]/.test(text))return {kind:'smiles',name:'ChemDraw clipboard',content:text,format:name};
    }
  }
  return null;
}

module.exports={cleanFormat,isInterestingFormat,detectChemDrawClipboard};
