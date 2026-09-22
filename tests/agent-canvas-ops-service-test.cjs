const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createAgentService,validatePlan,PLAN_SCHEMA}=require('../app/agent-service.cjs');

const empty={source:null,text:null,arrowType:null,at:null,from:null,to:null,center:null,atomIds:[],bondIds:[],textIds:[],arrowIds:[],dx:null,dy:null,angle:null,axis:null,value:null,atomId:null,label:null,charge:null,bondId:null,bondType:null};
const operation=(op,fields={})=>({op,...empty,...fields});
assert(PLAN_SCHEMA.properties.mode.enum.includes('canvas_ops'));
assert.equal(PLAN_SCHEMA.properties.operations.maxItems,20);
const parsed=validatePlan({message:'加入结构并修改原子',warnings:[],mode:'canvas_ops',source:null,ket:null,operations:[operation('add_structure',{source:'c1ccccc1'}),operation('set_atom',{atomId:2,label:'N',charge:1})],highlight:null});
assert.equal(parsed.operations.length,2);assert.equal(parsed.operations[1].label,'N');
assert.throws(()=>validatePlan({message:'坏操作',warnings:[],mode:'canvas_ops',source:null,ket:null,operations:[operation('set_bond',{bondId:1,bondType:99})],highlight:null}),/键型/);
assert.throws(()=>validatePlan({message:'坏坐标',warnings:[],mode:'canvas_ops',source:null,ket:null,operations:[operation('add_text',{text:'条件',at:[Infinity,0]})],highlight:null}),/坐标/);

const dataDir=path.resolve(__dirname,'agent-canvas-ops-service-data-'+Date.now());
const safeStorage={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s),decryptString:b=>b.toString()};
let targetAtom=5,captured;
const fetchImpl=async(_url,options)=>{captured=JSON.parse(options.body);const result={message:'修改选中原子并添加条件。',warnings:[],mode:'canvas_ops',source:null,ket:null,operations:[operation('set_atom',{atomId:targetAtom,label:'N'}),operation('add_text',{text:'Pd/C',at:null})],highlight:null};return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]}),{status:200,headers:{'content-type':'application/json'}});};
const service=createAgentService({dataDir,safeStorage,fetchImpl});
(async()=>{
  try{
    await service.saveConfig({provider:'local',protocol:'chat',baseUrl:'http://127.0.0.1:11434/v1',model:'test',thinking:false,apiKey:''});
    const input={instruction:'把选中原子改成 N，再加条件',ket:JSON.stringify({root:{nodes:[]}}),selection:{atoms:[{id:5,location:[1,2],label:'C'}],bonds:[],texts:[],arrows:[]},structureMap:{atoms:[{id:5,location:[1,2],label:'C'},{id:6,location:[2,2],label:'C'}],bonds:[],texts:[{id:3,location:[4,2]}],arrows:[{id:4,from:[3,0],to:[5,0]}]}};
    const plan=await service.request(input);assert.equal(plan.operations[0].atomId,5);assert.equal(plan.operations[1].text,'Pd/C');
    const sent=JSON.parse(captured.messages[1].content);assert.equal(sent.canvas.structureMap.texts[0].id,3);assert.equal(sent.canvas.structureMap.arrows[0].id,4);
    targetAtom=6;await assert.rejects(()=>service.request(input),/选区外的原子/);
    console.log('PASS canvas_ops Schema 与字段校验');
    console.log('PASS Agent 可组合添加和局部修改操作');
    console.log('PASS 文字与箭头对象映射发送给模型');
    console.log('PASS 选区外对象操作被拒绝');
  }finally{await fs.rm(dataDir,{recursive:true,force:true});}
})().catch(error=>{console.error('FAIL',error.stack||error);process.exitCode=1;});
