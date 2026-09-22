// Independent implementation of the published ACS 1996 drawing parameters.
// Reference: https://support.revvitysignals.com/hc/en-us/articles/4408234173332
export const PT_TO_PX=96/72;
export const ACS_PAGE={width:720,height:960}; // 540 x 720 pt drawing area, Letter with 36 pt margins.
export const isACS=project=>project.drawingStyle==='acs1996';
export const styleKey=project=>isACS(project)?'acs1996':'standard';
export const ACS_EDITOR={
  atomColoring:false,font:'30px Arial',fontsz:10,fontszUnit:'pt',fontszsub:10,fontszsubUnit:'pt',
  bondLength:14.4,bondLengthUnit:'pt',bondSpacing:18,bondThickness:0.6,bondThicknessUnit:'pt',
  stereoBondWidth:2,stereoBondWidthUnit:'pt',hashSpacing:2.5,hashSpacingUnit:'pt',
  imageResolution:600,reactionComponentMarginSize:1.6,reactionComponentMarginSizeUnit:'pt',
  showHydrogenLabels:'Hetero',carbonExplicitly:false,aromaticCircle:false,
};
export const STANDARD_EDITOR={
  atomColoring:true,font:'30px Arial',fontsz:13,fontszUnit:'px',fontszsub:13,fontszsubUnit:'px',
  bondLength:40,bondLengthUnit:'px',bondSpacing:15,bondThickness:2,bondThicknessUnit:'px',
  stereoBondWidth:6,stereoBondWidthUnit:'px',hashSpacing:1.2,hashSpacingUnit:'px',
  imageResolution:72,reactionComponentMarginSize:20,reactionComponentMarginSizeUnit:'px',
  showHydrogenLabels:'Terminal and Hetero',carbonExplicitly:false,aromaticCircle:true,
};
export function editorStyle(key){return key==='acs1996'?ACS_EDITOR:STANDARD_EDITOR;}
export function imageStyle(key){
  const s=editorStyle(key);
  return {outputFormat:'svg',backgroundColor:'255, 255, 255',
    'render-coloring':s.atomColoring,'render-font-size':s.fontsz,'render-font-size-unit':s.fontszUnit,
    'render-font-size-sub':s.fontszsub,'render-font-size-sub-unit':s.fontszsubUnit,
    // Indigo 1.46 truncates the float pixel bond length to int. A tiny epsilon
    // avoids 14.4 pt at 600 ppi becoming 119 pixels instead of 120.
    'image-resolution':s.imageResolution,'bond-length':s.bondLength+(key==='acs1996'?0.00001:0),'bond-length-unit':s.bondLengthUnit,
    'render-bond-thickness':s.bondThickness,'render-bond-thickness-unit':s.bondThicknessUnit,
    'render-bond-spacing':s.bondSpacing/100,'render-stereo-bond-width':s.stereoBondWidth,
    'render-stereo-bond-width-unit':s.stereoBondWidthUnit,'render-hash-spacing':s.hashSpacing,
    'render-hash-spacing-unit':s.hashSpacingUnit};
}
export function nativeImageScale(key){return key==='acs1996'?96/600:1;}
// Embed PNG physical resolution without resampling the image; all other chunks stay intact.
export function pngWithDpi(bytes,dpi){
  const chunk=new Uint8Array(21),view=new DataView(chunk.buffer);view.setUint32(0,9);
  chunk.set([112,72,89,115],4);const ppm=Math.round(dpi/0.0254);view.setUint32(8,ppm);view.setUint32(12,ppm);chunk[16]=1;
  let crc=0xffffffff;for(const byte of chunk.subarray(4,17)){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}view.setUint32(17,(crc^0xffffffff)>>>0);
  const chunks=[bytes.subarray(0,8)];let pos=8,inserted=false;
  while(pos+12<=bytes.length){const len=new DataView(bytes.buffer,bytes.byteOffset+pos,4).getUint32(0);if(pos+len+12>bytes.length)throw Error('PNG 数据损坏');const type=String.fromCharCode(...bytes.subarray(pos+4,pos+8));if(type!=='pHYs')chunks.push(bytes.subarray(pos,pos+len+12));if(type==='IHDR'){chunks.push(chunk);inserted=true;}pos+=len+12;}
  if(!inserted)throw Error('PNG 缺少 IHDR');const output=new Uint8Array(chunks.reduce((sum,c)=>sum+c.length,0));pos=0;for(const c of chunks){output.set(c,pos);pos+=c.length;}return output;
}
