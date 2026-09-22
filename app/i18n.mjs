const STORAGE_KEY='chemistry-language';

const PAIRS=[
  ['课题组绘图工作台','Lab Drawing Workspace'],['项目名称','Project name'],['未命名绘图','Untitled Drawing'],['本地草稿','Local draft'],['离线运行','Offline'],
  ['打开画布 Agent','Open Canvas Agent'],['打开 Structlnk 项目或 ChemDraw CDX / CDXML 文件','Open a Structlnk project or ChemDraw CDX / CDXML file'],['打开','Open'],['保存项目','Save project'],['导出 ↗','Export ↗'],
  ['SVG · 矢量图','SVG · Vector'],['PNG · 透明背景 / 3×','PNG · Transparent / 3×'],['PDF · A4 横向','PDF · A4 landscape'],['KET · 全部可编辑内容','KET · All editable content'],['导出转换前的旧版项目','Export original legacy project'],['项目另存为','Save project as'],
  ['工作空间','Workspace'],['＋ 新建空白页','＋ New blank page'],['＋ 新建','＋ New'],['绘图示例','Drawing examples'],['从一个可编辑的示例开始','Start with an editable example'],
  ['有机反应','Organic reaction'],['酯化 · 结构与条件','Esterification · structures and conditions'],['金属配合物','Metal complex'],['顺铂 · 配位键','Cisplatin · coordination bonds'],['催化循环','Catalytic cycle'],['钯催化 · 循环排版','Palladium catalysis · cycle layout'],['反应机理','Reaction mechanism'],['亲核进攻 · 单电子箭头','Nucleophilic attack · electron arrows'],
  ['操作说明 / 第三方许可','Help / third-party licenses'],['直接绘图','Direct drawing'],['绘图样式','Drawing style'],['常规绘图','Standard drawing'],['撤销 Ctrl+Z','Undo Ctrl+Z'],['↶ 撤销','↶ Undo'],['重做 Ctrl+Y','Redo Ctrl+Y'],['↷ 重做','↷ Redo'],['样式说明','Style details'],
  ['可选：输入 SMILES 添加结构，例如 c1ccccc1','Optional: enter a SMILES string, for example c1ccccc1'],['添加结构','Add structure'],['适合窗口','Fit to window'],['化学绘图主画布','Chemical drawing canvas'],['正在启动主画布…','Starting canvas…'],['所有画布已最小化 · 点击底部窗口条还原','All canvases are minimized · click a tab below to restore'],['在画布上直接绘制原子、键、文字和箭头 · Ctrl+S 保存','Draw atoms, bonds, text, and arrows directly on the canvas · Ctrl+S to save'],
  ['从 ChemDraw 粘贴','Paste from ChemDraw'],['复制 ChemDraw 中选中的结构后点击；快捷键 Ctrl+Shift+V','Copy the selected structure in ChemDraw, then click here; shortcut: Ctrl+Shift+V'],['操作说明与第三方许可','Help and third-party licenses'],['复制选中内容','Copy selection'],['粘贴','Paste'],
  ['画布 Agent','Canvas Agent'],['尚未配置模型','Model not configured'],['API 设置','API settings'],['关闭','Close'],['我可以回答画布相关问题，也可以识别化学图片。只有需要修改画布时，才会显示修改内容并等待你批准应用。','I can answer questions about the canvas and recognize chemistry images. Only canvas changes are shown for your approval before they are applied.'],['是否批准应用到画布？','Approve changes to the canvas?'],['暂不应用','Not now'],['批准并应用','Approve and apply'],['例如：识别图片中的分子并转换为可编辑结构','For example: recognize the molecule in the image and convert it to an editable structure'],['将读取当前画布 · 可附加一张化学图片','The current canvas will be read · you can attach one chemistry image'],['▧ 图片','▧ Image'],['上传图片给 Agent 识别','Upload an image for the Agent to recognize'],['移除图片','Remove image'],['发送','Send'],
  ['Structlnk · 直接绘图','Structlnk · Direct Drawing'],['0.7.0 · Claude 接口、按需修改批准、图片识别与可编辑化学绘图。','0.7.0 · Claude API, approval only for canvas changes, image recognition, and editable chemistry drawing.'],['在主画布直接绘制、选择和移动原子、键、文字与箭头。','Draw, select, and move atoms, bonds, text, and arrows directly on the main canvas.'],['顶部集中放置新建、打开、保存、撤销、样式和窗口操作。','The top toolbar groups new, open, save, undo, style, and window actions.'],['底部窗口条可切换、还原、关闭画布，点击铅笔可直接重命名。','Use the bottom dock to switch, restore, close, or rename a canvas with the pencil button.'],['框选后可按 Ctrl+C、Ctrl+V；副本放在空白处并保持整体选中，点击画布后取消。','After selecting an area, press Ctrl+C and Ctrl+V; the copy is placed in free space and stays selected until you click the canvas.'],['Agent 可以直接回答问题；需要改动画布时，只有点击「批准并应用」后才执行。','The Agent answers questions directly; canvas changes run only after you click Approve and apply.'],['Ctrl+S 保存当前画布，编辑内容会自动写入恢复副本。','Ctrl+S saves the current canvas, and edits are written automatically to a recovery copy.'],['导入或 Agent 修改后，请检查价态、立体化学、配位键和机理箭头。','After an import or Agent edit, check valence, stereochemistry, coordination bonds, and mechanism arrows.'],
  ['使用画布左侧的键、环、文字和箭头工具直接绘图，无需双击进入另一个编辑器，也无需点击「放入画布」。','Use the bond, ring, text, and arrow tools on the left side of the canvas to draw directly.'],
  ['顶部「Agent」读取当前 KET/SMILES，也可识别上传的化学图片；只有模型提出画布修改时才请求批准。','The Agent reads the current KET/SMILES and can recognize an uploaded chemistry image. Approval is requested only when the model proposes canvas changes.'],
  ['Agent 支持 OpenAI、Claude、DeepSeek 与其他兼容接口。密钥由系统加密保存，不进入项目文件。','The Agent supports OpenAI, Claude, DeepSeek, and other compatible APIs. Keys are encrypted by the system and never stored in project files.'],
  ['箭头工具展开菜单包含反应、平衡和弯箭头；元素面板支持金属原子，配位键使用键工具中的相应类型。','The arrow menu includes reaction, equilibrium, and curved arrows. The element palette supports metals, and coordination bonds are available from the bond tool.'],
  ['选择工具可框选、移动和修改内容；原生工具提示主要为英文。','Use the selection tool to select, move, and edit content. The embedded editor tooltips are mainly in English.'],
  ['ACS 1996 兼容样式下可拖动单个原子，调整局部键长和键角以疏开拥挤结构。','In ACS 1996 Compatible Style, drag individual atoms to adjust local bond lengths and angles and spread out crowded structures.'],
  ['将交替双键六元环模板点在已有普通碳原子上时，会自动修正共用碳的键级并保持碳标记隐藏。','When an alternating six-membered ring is placed on an existing carbon, the shared carbon bond order is corrected and its carbon label remains hidden.'],
  ['Ctrl+S 保存整个画布，包含刚刚画出的结构。编辑后自动保存恢复副本。','Ctrl+S saves the entire canvas, including newly drawn structures. A recovery copy is saved automatically after edits.'],
  ['顶部「打开」支持旧版 Structlnk 项目和 ChemDraw CDX / CDXML；导入后直接编辑。','Open supports legacy Structlnk projects and ChemDraw CDX/CDXML files, which can be edited immediately after import.'],
  ['ACS 样式设置化学绘图参数和导出比例。画布是可平移缩放的工作区，导出页尺寸见样式说明。','The ACS style sets chemical drawing parameters and export scale. The canvas can be panned and zoomed; export page sizes are listed under Style details.'],
  ['Agent 输出可能存在化学错误，批准前应检查摘要，应用后应核对价态、立体化学、配位键方向和机理箭头。原有撤销可以恢复应用前画布。','Agent output may contain chemistry errors. Review the summary before approval, then check valence, stereochemistry, coordination-bond direction, and mechanism arrows. Undo restores the previous canvas.'],['第三方许可','Third-party licenses'],
  ['画布 Agent · API 设置','Canvas Agent · API Settings'],['发送消息时，当前画布的 KET/SMILES、你的指令及所附图片会发送到这里配置的 API。请求由本机主进程直接发出；密钥使用 Windows 系统加密保存，不写入项目文件。','When sending a message, the current canvas KET/SMILES, your instruction, and the attached image are sent to the configured API. Requests are made by the local main process; the key is encrypted by Windows and is not written to project files.'],
  ['发送','Send'],['是否批准应用到画布？','Approve changes to the canvas?'],['暂不应用','Not now'],['批准并应用','Approve and apply'],['Claude (Anthropic)','Claude (Anthropic)'],['Anthropic Messages API','Anthropic Messages API'],['使用 Anthropic 官方 Messages API；支持 Claude 图片理解和结构化输出。','Uses the official Anthropic Messages API with Claude vision and structured outputs.'],['服务商','Provider'],['本地兼容接口','Local compatible API'],['自定义兼容接口','Custom compatible API'],['接口协议','API protocol'],['OpenAI 兼容 Chat Completions','OpenAI-compatible Chat Completions'],['API 根地址','API base URL'],['模型 ID','Model ID'],['填写账户可用的模型 ID','Enter a model ID available to your account'],['DeepSeek 深度思考（默认关闭，复杂机理可开启）','DeepSeek deep thinking (off by default; useful for complex mechanisms)'],['API 密钥','API key'],['地址不变时，留空可保留原密钥','Leave blank to keep the saved key when the URL is unchanged'],['清除已经保存的密钥','Clear the saved key'],['使用 DeepSeek 官方 OpenAI 兼容接口；deepseek-flash 支持图片识别。','Uses the official DeepSeek OpenAI-compatible API; deepseek-flash supports image recognition.'],['选择服务商预设后仍可修改地址、协议和模型 ID。','You can edit the URL, protocol, and model ID after selecting a provider preset.'],['已保存加密密钥；API 地址不变时留空可继续使用。','An encrypted key is saved; leave this blank to keep it when the API URL is unchanged.'],['尚未保存密钥；本地无鉴权接口可以留空。','No key is saved; leave it blank for a local API without authentication.'],['取消','Cancel'],['保存设置','Save settings'],
  ['ACS 1996 兼容样式','ACS 1996 Compatible Style'],['Structlnk 根据公开的 ACS 1996 参数独立实现此兼容样式。切换样式会设置当前画布的默认绘图参数及导出比例；Ctrl+Z 可撤销。','Structlnk independently implements this compatible style from published ACS 1996 parameters. Switching styles sets the current canvas default drawing parameters and export scale; Ctrl+Z can undo it.'],['默认标准键长','Default standard bond length'],['普通键线宽','Normal bond width'],['楔形键宽度','Wedge width'],['多重键间距','Multiple-bond spacing'],['键长的 18%','18% of bond length'],['虚线楔形键间距参数','Hashed-wedge spacing'],['原子标签 / 新增文字','Atom labels / new text'],['Arial，10 pt，黑色','Arial, 10 pt, black'],['页面绘图区','Page drawing area'],['US Letter 纵向，四边 36 pt，100%','US Letter portrait, 36 pt margins, 100%'],['透明背景，600 dpi，4500 × 6000 像素','Transparent background, 600 dpi, 4500 × 6000 pixels'],
  ['画布可以平移与缩放。使用选择工具可单独拖动原子，手动调整局部键长和键角并拉开拥挤结构；拖动后的坐标会保存到项目并用于导出，不会被样式自动复位。画布视觉缩放不改变导出比例。','The canvas supports pan and zoom. Use the selection tool to drag individual atoms, adjust local bond lengths and angles, and spread out crowded structures. Adjusted coordinates are saved in the project and used for export; the style does not reset them automatically. Canvas zoom does not change export scale.'],
  ['这是根据公开参数独立实现的兼容样式，没有复制 ChemDraw 的样式文件、模板、图标或代码。标签避让、1.6 pt 标签留白及部分特殊粗键的外观仍由当前化学引擎处理；调整原子后请检查排版和箭头端点。','This compatible style is independently implemented from published parameters. No ChemDraw style files, templates, icons, or code are copied. Label avoidance, 1.6 pt label padding, and some special bold bonds are handled by the current chemistry engine; check layout and arrow endpoints after adjusting atoms.'],
  ['参数参考来源为 ChemDraw 官方公开的“ACS Document 1996”文档；该名称仅用于说明参数来源。','The parameter reference is the official published ChemDraw “ACS Document 1996” documentation; that name is used only to identify the parameter source.'],
  ['导入 ChemDraw 文件','Import ChemDraw File'],['选择页面','Select page'],['绘图样式','Drawing style'],['常规绘图 · 适应页面','Standard drawing · fit to page'],['所选页直接进入主画布，可立即修改其中的原子、键、文字和箭头。字体、配位键及机理箭头可能与原稿不同，请对照检查；图片仍作为图片保留。保存时使用 .chemproj，原 ChemDraw 文件保留。','The selected page opens directly in the main canvas, where atoms, bonds, text, and arrows can be edited immediately. Fonts, coordination bonds, and mechanism arrows may differ from the original; images remain images. Save as .chemproj while retaining the original ChemDraw file.'],['打开所选页','Open selected page'],['处理中…','Processing…'],
  ['配色','Colors'],['给选中的原子和键设置自定义高亮颜色','Set a custom highlight color for selected atoms and bonds'],['自定义高亮配色','Custom Highlight Colors'],['先在画布中选择原子或键，再从预设色或系统取色器选择颜色。配色会随项目保存。','Select atoms or bonds on the canvas, then choose a preset or use the system color picker. Colors are saved with the project.'],['自定义颜色','Custom color'],['尚未选择原子或键','No atoms or bonds selected'],['清除全部配色','Clear all colors'],['应用到选区','Apply to selection'],['颜色值无效','Invalid color value'],['请先在画布中选择原子或键','Select atoms or bonds on the canvas first'],['已应用自定义高亮配色','Custom highlight color applied'],['已清除全部配色','All highlight colors cleared'],['应用画布配色…','Applying canvas color…'],['清除画布配色…','Clearing canvas colors…'],['选择原子或键后点击「配色」，可使用预设色或系统取色器。','Select atoms or bonds, then click Colors to use a preset or the system color picker.']
];

const zhToEn=new Map(PAIRS),enToZh=new Map(PAIRS.map(([zh,en])=>[en,zh]));
let language=localStorage.getItem(STORAGE_KEY)==='en'?'en':'zh';

export const getLanguage=()=>language;
export const t=(zh,en)=>language==='en'?en:zh;

function translateValue(value,map){
  if(map.has(value))return map.get(value);
  const trimmed=value.trim();if(!trimmed||!map.has(trimmed))return value;
  const start=value.match(/^\s*/)?.[0]||'',end=value.match(/\s*$/)?.[0]||'';return start+map.get(trimmed)+end;
}
function translateDocument(next){
  const map=next==='en'?zhToEn:enToZh;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(node){return /^(SCRIPT|STYLE|PRE)$/.test(node.parentElement?.tagName||'')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
  for(let node=walker.nextNode();node;node=walker.nextNode())node.nodeValue=translateValue(node.nodeValue,map);
  for(const el of document.querySelectorAll('[title],[placeholder],[aria-label]'))for(const attr of ['title','placeholder','aria-label'])if(el.hasAttribute(attr))el.setAttribute(attr,translateValue(el.getAttribute(attr),map));
  document.documentElement.lang=next==='en'?'en':'zh-CN';
  const button=document.querySelector('#language-toggle');
  if(button){button.textContent=next==='en'?'中文':'EN';button.title=next==='en'?'切换到中文':'Switch to English';button.setAttribute('aria-label',button.title);}
}

export function setLanguage(next,{notify=true}={}){
  next=next==='en'?'en':'zh';
  if(next!==language)translateDocument(next);
  else translateDocument(next);
  language=next;localStorage.setItem(STORAGE_KEY,next);window.desktop?.languageSave?.(next).catch(error=>console.error('Could not save language',error));
  if(notify)window.dispatchEvent(new CustomEvent('chemistry-language-change',{detail:{language}}));
  return language;
}

export async function initI18n(){
  try{const saved=await window.desktop?.languageGet?.();if(saved==='zh'||saved==='en')language=saved;}catch(error){console.error('Could not read language',error);}
  let button=document.querySelector('#language-toggle');
  if(!button){button=document.createElement('button');button.id='language-toggle';document.querySelector('#agent-toggle')?.before(button);}
  button.onclick=()=>setLanguage(language==='zh'?'en':'zh');
  translateDocument(language);
  return language;
}
