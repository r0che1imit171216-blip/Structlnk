const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createAgentService,validateImageAttachment,buildRequestBody}=require('../app/agent-service.cjs');

const pngBytes=Buffer.from('89504e470d0a1a0a0000000d49484452','hex');
const image=validateImageAttachment({name:'structure.png',dataUrl:`data:image/png;base64,${pngBytes.toString('base64')}`});
const body=buildRequestBody({protocol:'anthropic',provider:'anthropic',model:'claude-sonnet-4-6'},'canvas-json',image);
assert.equal(body.model,'claude-sonnet-4-6');
assert.equal(body.messages[0].content[0].type,'image');
assert.equal(body.messages[0].content[0].source.media_type,'image/png');
assert.equal(body.messages[0].content[0].source.data,pngBytes.toString('base64'));
assert.equal(body.messages[0].content[1].type,'text');
assert.equal(body.output_config.format.type,'json_schema');

const dataDir=path.resolve(__dirname,'agent-claude-service-data-'+Date.now());
const safeStorage={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s),decryptString:b=>b.toString()};
let captured;
const answer={message:'当前画布为空。',warnings:[],mode:'no_change',source:null,ket:null,highlight:null};
const fetchImpl=async(url,options)=>{
  captured={url,headers:options.headers,body:JSON.parse(options.body)};
  return new Response(JSON.stringify({content:[{type:'text',text:JSON.stringify(answer)}],stop_reason:'end_turn'}),{status:200,headers:{'content-type':'application/json'}});
};
const service=createAgentService({dataDir,safeStorage,fetchImpl});
(async()=>{
  try{
    const saved=await service.saveConfig({provider:'anthropic',protocol:'anthropic',baseUrl:'https://api.anthropic.com/v1',model:'claude-sonnet-4-6',thinking:false,apiKey:'sk-ant-test'});
    assert.equal(saved.provider,'anthropic');assert.equal(saved.protocol,'anthropic');assert.equal(saved.hasKey,true);
    const plan=await service.request({instruction:'画布里有什么？',ket:JSON.stringify({root:{nodes:[]}})});
    assert.equal(plan.mode,'no_change');assert.equal(plan.message,'当前画布为空。');
    assert.equal(captured.url,'https://api.anthropic.com/v1/messages');
    assert.equal(captured.headers['x-api-key'],'sk-ant-test');
    assert.equal(captured.headers['anthropic-version'],'2023-06-01');
    assert.equal(captured.body.output_config.format.type,'json_schema');
    console.log('PASS Claude 图片负载');
    console.log('PASS Anthropic Messages 请求与鉴权');
    console.log('PASS Claude 结构化答复解析');
  }finally{await fs.rm(dataDir,{recursive:true,force:true});}
})().catch(error=>{console.error('FAIL',error.stack||error);process.exitCode=1;});
