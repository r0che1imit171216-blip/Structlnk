const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createAgentService,validatePlan,PLAN_SCHEMA}=require('../app/agent-service.cjs');

assert(PLAN_SCHEMA.properties.mode.enum.includes('set_highlight'));
assert(PLAN_SCHEMA.properties.mode.enum.includes('clear_highlight'));
const parsed=validatePlan({message:'配色',warnings:[],mode:'set_highlight',source:null,ket:null,highlight:{color:'#f4d35e',target:'ids',atoms:[1,1,2],bonds:[3]}});
assert.deepEqual(parsed.highlight,{color:'#F4D35E',target:'ids',atoms:[1,2],bonds:[3]});
assert.throws(()=>validatePlan({message:'配色',warnings:[],mode:'set_highlight',source:null,ket:null,highlight:{color:'yellow',target:'ids',atoms:[1],bonds:[]}}),/颜色/);

const dataDir=path.resolve(__dirname,'agent-highlight-service-data-'+Date.now());
const safeStorage={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s),decryptString:b=>b.toString()};
let target='selection',captured;
const fetchImpl=async(_url,options)=>{captured=JSON.parse(options.body);const result={message:'给选区添加浅黄色背景。',warnings:[],mode:'set_highlight',source:null,ket:null,highlight:{color:'#F4D35E',target,atoms:[],bonds:[]}};return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]}),{status:200,headers:{'content-type':'application/json'}});};
const service=createAgentService({dataDir,safeStorage,fetchImpl});
(async()=>{
  try{
    await service.saveConfig({provider:'local',protocol:'chat',baseUrl:'http://127.0.0.1:11434/v1',model:'test',thinking:false,apiKey:''});
    const input={instruction:'给苯环上背景色',ket:JSON.stringify({root:{nodes:[]}}),selection:{atoms:[{id:5,location:[1,2],label:'C'}],bonds:[{id:8,from:[1,2],to:[2,3]}]},structureMap:{atoms:[{id:5,location:[1,2],label:'C'}],bonds:[{id:8,begin:5,end:5,from:[1,2],to:[2,3]}]}};
    const plan=await service.request(input);assert.deepEqual(plan.highlight.atoms,[5]);assert.deepEqual(plan.highlight.bonds,[8]);
    const sent=JSON.parse(captured.messages[1].content);assert.equal(sent.canvas.structureMap.atoms[0].id,5);assert.equal(sent.selection.atoms[0].id,5);
    target='all';await assert.rejects(()=>service.request(input),/整张画布配色/);
    console.log('PASS Agent 配色模式 Schema');
    console.log('PASS 配色颜色与对象 ID 校验');
    console.log('PASS 选区配色固化为实际对象 ID');
    console.log('PASS 画布结构映射发送给模型');
    console.log('PASS 选区外整图配色拒绝');
  }finally{await fs.rm(dataDir,{recursive:true,force:true});}
})().catch(error=>{console.error('FAIL',error.stack||error);process.exitCode=1;});
