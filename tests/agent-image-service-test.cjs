const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createAgentService,validateImageAttachment,buildRequestBody}=require('../app/agent-service.cjs');

const pngBytes=Buffer.from('89504e470d0a1a0a0000000d49484452','hex');
const image={name:'structure.png',dataUrl:`data:image/png;base64,${pngBytes.toString('base64')}`};
const valid=validateImageAttachment(image);
assert.equal(valid.mimeType,'image/png');assert.equal(valid.size,pngBytes.length);
assert.throws(()=>validateImageAttachment({name:'fake.jpg',dataUrl:`data:image/jpeg;base64,${pngBytes.toString('base64')}`}),/格式不一致/);

const responses=buildRequestBody({protocol:'responses',model:'gpt-test'},'canvas-json',valid);
assert.equal(responses.input[0].content[0].type,'input_text');
assert.equal(responses.input[0].content[1].type,'input_image');
assert.equal(responses.input[0].content[1].image_url,valid.dataUrl);
const chat=buildRequestBody({protocol:'chat',provider:'deepseek',model:'deepseek-flash',thinking:false},'canvas-json',valid);
assert.equal(chat.messages[1].content[0].type,'text');assert.equal(chat.messages[1].content[1].type,'image_url');
assert.equal(chat.messages[1].content[1].image_url.detail,'high');

const dataDir=path.resolve(__dirname,'agent-image-service-data-'+Date.now());
const safeStorage={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s),decryptString:b=>b.toString()};
let captured;
const fetchImpl=async(_url,options)=>{captured=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({message:'识别完成',warnings:[],mode:'no_change',source:null,ket:null,highlight:null})}}]}),{status:200,headers:{'content-type':'application/json'}});};
const service=createAgentService({dataDir,safeStorage,fetchImpl});
(async()=>{
  try{
    await service.saveConfig({provider:'deepseek',protocol:'chat',baseUrl:'https://api.deepseek.com',model:'deepseek-flash',thinking:false,apiKey:'test'});
    const plan=await service.request({instruction:'识别图片',ket:JSON.stringify({root:{nodes:[]}}),image});
    assert.equal(plan.mode,'no_change');assert.equal(captured.messages[1].content[1].type,'image_url');
    await service.saveConfig({provider:'deepseek',protocol:'chat',baseUrl:'https://api.deepseek.com',model:'deepseek-v4-pro',thinking:false,apiKey:''});
    await assert.rejects(()=>service.request({instruction:'识别图片',ket:JSON.stringify({root:{nodes:[]}}),image}),/deepseek-flash/);
    console.log('PASS 图片格式与魔数校验');
    console.log('PASS Responses 图片负载');
    console.log('PASS Chat Completions 图片负载');
    console.log('PASS DeepSeek Flash 图片请求');
    console.log('PASS DeepSeek 非视觉模型提示');
  }finally{await fs.rm(dataDir,{recursive:true,force:true});}
})().catch(error=>{console.error('FAIL',error.stack||error);process.exitCode=1;});
