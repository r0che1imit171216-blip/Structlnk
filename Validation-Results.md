# Structlnk 验证结果

## 0.7.0：品牌、Claude API 与按需批准

验证日期：2026-09-21。

软件可见名称、窗口标题、帮助、文档、启动脚本和快捷方式已统一为 Structlnk；项目内部继续保留 `chemistry-lab` 格式标识，以兼容此前保存的 `.chemproj` 文件。

Agent 新增 Claude (Anthropic) 服务商预设，使用 Anthropic Messages API、`https://api.anthropic.com/v1/messages`、`x-api-key`、`anthropic-version: 2023-06-01`、图片 base64 内容块和 JSON Schema 结构化输出。默认模型为 `claude-sonnet-4-6`，也可填写账户实际可用的模型 ID。API 密钥继续通过 Windows `safeStorage` 加密保存。

输入区的“生成修改方案”按钮已替换为发送箭头。`no_change` 类型作为普通答复直接显示，不出现批准区；只有 `add_source`、`replace_source`、`replace_ket`、`set_highlight` 或 `clear_highlight` 等画布修改才显示“批准并应用”。

3 项 Claude 服务检查通过：图片负载、Messages 端点与鉴权、结构化答复解析。4 项真实 Electron Claude 界面检查通过：Structlnk 品牌、发送箭头、Claude 官方预设、设置说明与控件状态。图片普通答复不显示批准区；苯环配色修改仍需批准后应用，并继续支持项目保存和撤销。OpenAI、DeepSeek、配色、中英文界面及 JavaScript 语法回归检查通过。测试使用本机模拟响应，没有调用用户密钥或外部模型额度。

### Agent 画布操作层

Agent 新增 `canvas_ops` 结构化修改类型，一次可组合 1–20 条操作：添加 SMILES/Molfile 结构、可编辑文字和反应/平衡/逆合成箭头，移动、旋转或对齐对象，以及按 ID 修改原子标签、电荷和键型。没有指定坐标时，新内容自动放到当前内容右侧的空白区域。上下文对象映射扩展到原子、键、文字和箭头；存在选区时，服务层拒绝修改选区外的已有对象。所有操作继续先显示方案，只有点击批准后才执行，失败会恢复应用前 KET，成功后整批进入一条可撤销记录。

4 项服务检查通过：`canvas_ops` Schema 与字段边界、组合操作解析、文字/箭头对象映射、选区外对象拒绝。9 项真实 Electron 检查通过：批准前画布不变、批量添加可编辑结构/文字/箭头、按 ID 修改原子和键、移动与旋转、新结构右侧空白放置、撤销记录、请求对象映射、一次撤销整批恢复、真实原子坐标对齐。Claude、图片、配色、剪贴板、自定义颜色、ACS 几何、底部画布重命名和中英文界面回归检查全部通过；测试使用本机模拟 API，没有调用外部模型或用户密钥。

### Windows 安装与覆盖更新

新增固定 `AppId` 的 Windows x64 安装包、开始菜单/可选桌面快捷方式、卸载入口、版本清单和 SHA256 文件。安装目录只包含应用、Electron 运行环境、示例、许可和说明，不包含源码归档、测试目录或便携版 `data`。安装版将 API 设置、语言与恢复数据保存到 `%APPDATA%\Structlnk`，程序覆盖升级不删除用户数据。

安装包已静默安装到隔离目录并从 `Structlnk.exe` 实际启动；确认当前界面源码、英文默认画布名和安装标记有效。随后在同一目录再次运行相同安装包，覆盖更新成功并再次启动；最后通过安装器卸载，隔离目录被完整移除。当前构建未使用商业代码签名证书，公开分发前仍需签名以减少 SmartScreen 提示。

### ACS 1996 兼容样式名称与几何调整

面向用户的样式名称已统一为「ACS 1996 兼容样式」，并在样式说明中声明：Structlnk 根据公开参数独立实现该样式，没有复制 ChemDraw 的样式文件、模板、图标或代码。原项目内部的 `acs1996` 标识保持不变，用于兼容已有 `.chemproj` 文件。

14.4 pt 现明确标注为默认标准键长，而不是坐标锁定。真实 Electron 编辑检查确认：切换该样式后手动改变原子坐标，局部键长和键角会随之改变；同步回项目后坐标保持，不会被样式自动复位。界面同时提示可使用选择工具拖动原子疏开拥挤结构。

### 右键菜单合并与可用状态

移除了覆盖在化学编辑器对象菜单上的独立复制/粘贴浮层。右键点在原子、键或线条上时，Structlnk 将复制和智能粘贴并入同一个对象菜单，原有对象编辑选项继续保留；没有对象菜单的空白位置使用相同的复制/粘贴后备菜单。复制根据当前选区启用，粘贴根据本机剪贴板中是否存在可识别的 Structlnk KET、ChemDraw CDX/CDXML 或 SMILES 数据启用，不可用时显示灰色。已用三原子两键的结构验证画布内复制，随后粘贴回同一画布得到六个原子和四条可编辑键。

12 项真实 Electron 检查通过：菜单只保留一组复制/粘贴、空画布状态正确、左键关闭、复制/粘贴合并进对象菜单、选区写入 KET 剪贴板、复制后粘贴命令启用、右键粘贴保持可编辑，以及框选子结构后的 Ctrl+C、Ctrl+V、新对象整体选中、空白位置放置和点击画布取消组合。键盘测试从四原子三键结构中框选两个原子和一条键，粘贴后得到六个原子和四条可编辑键；新增的两个原子和一条键保持同组选中，副本左边界与原内容右边界保留超过一个键长的空隙。真实鼠标点击画布空白区域后选区被取消。9 项剪贴板格式检查同时覆盖 KET 与 MOL 文本。中英文界面、ACS 原子坐标保持和 JavaScript 语法回归检查通过。

## 0.6.4：底部画布窗口重命名

验证日期：2026-09-18。

底部每个画布小窗新增铅笔重命名按钮，双击名称也可进入编辑。Enter 或失去焦点保存，Esc 取消；重名会自动添加序号。当前画布和已最小化画布均可直接改名，改名不会自动还原或切换画布。名称写入项目及自动恢复副本，并进入该画布的撤销记录。

6 组真实 Electron 检查通过：重命名入口、当前画布原地改名与顶部项目名同步、撤销、最小化画布不还原改名、自动恢复写入、Esc 取消。

## 0.6.3：Agent 背景高亮操作

验证日期：2026-09-18。

Agent 新增 `set_highlight` 与 `clear_highlight` 修改类型。“背景色”“底色”“着色”和“标记颜色”直接调用项目已有高亮系统，不改写 KET、元素或键级。请求上下文增加原子/键对象 ID、端点、坐标和已有配色；模型可以定位苯环或官能团，也可以直接使用用户选区。存在选区时，主进程会把目标固化为实际对象 ID，并拒绝越过选区的整图配色。

5 项服务检查通过：配色 Schema、颜色和 ID 校验、选区目标固化、结构映射发送、选区外整图配色拒绝。5 项真实 Electron 检查通过：苯环对象映射、自然语言生成浅黄色配色、6 个原子和 6 条键实际高亮、项目数据保存、撤销恢复。测试使用本机模拟 API，没有调用外部模型或用户密钥。

## 0.6.2：画布 Agent 图片识别

验证日期：2026-09-18。

Agent 输入区新增单张图片附件，支持 JPEG、PNG、GIF 和 WebP，本机选择后显示缩略图、文件名、像素尺寸和大小，并可在发送前移除。图片限制为 10 MB、最长边 8192 像素；图片内容在主进程再次按文件魔数校验。图片与当前画布 KET/SMILES、选区和指令一起发送给所配置的视觉模型，请求成功后从界面清除，不写入项目文件。

OpenAI Responses API 使用 `input_image`，OpenAI 兼容 Chat Completions 使用 `image_url`。DeepSeek `deepseek-flash` 可接收图片；附图时选择 `deepseek-v4-pro` 会在发出网络请求前提示切换模型。模型仍只返回可审查的结构化方案，用户点击「应用修改」后才改变画布。

5 项服务检查通过：图片格式与魔数、Responses 图片负载、Chat 图片负载、DeepSeek Flash 图片请求、DeepSeek 非视觉模型提示。3 项真实 Electron 检查通过：入口与本地预览、图片和画布上下文发送并生成方案、主进程收到正确 Chat 图片负载。模拟 API 在本机运行，没有调用外部模型或用户密钥。另通过 6 项中英文界面、6 项自定义配色、7 项剪贴板格式和 5 项真实 ChemDraw 右键粘贴回归检查，相关 JavaScript / MJS / CJS 语法检查通过。

## 0.6.1：自定义高亮配色

验证日期：2026-09-18。

SMILES 工具条新增「配色」入口。选中原子或键后，可使用 16 种预设色或系统取色器选择任意高亮颜色；重复应用会替换选区原有颜色。配色作为项目数据保存，并在多画布切换、自动恢复、撤销和重做时恢复。「清除全部配色」只移除高亮，不删除化学对象。

6 项真实 Electron 检查通过：配色入口与取色器、任意颜色应用到选区、写入项目数据、切换画布后恢复、撤销重做、清除全部配色。另通过 JavaScript / MJS 语法检查、中英文界面检查、ChemDraw 剪贴板检查和源码哈希核对。

## 0.6.0：紧凑顶部布局与画布右键菜单

验证日期：2026-09-18。

删除左侧绘图示例栏，将「新建」移动到顶栏；新建、打开、保存、撤销、重做、项目名称、绘图样式、最小化、Agent、导出、语言和帮助采用单行紧凑布局。SMILES 区与状态说明同步精简，帮助窗口从原有长列表缩减为五条核心操作。

画布右键菜单提供「复制选中内容」「粘贴」「从 ChemDraw 粘贴」。复制通过 Ketcher 的真实 Ctrl+C 事件把当前选区写为 CDX；普通粘贴读取该化学数据并追加到当前画布，仍保持原子和键可编辑。ChemDraw 专用粘贴继续保留预览与转换警告。

当前版本已移除 SMILES「添加结构」旁的 ChemDraw 粘贴按钮，仅在画布右键菜单中保留该选项。右键菜单打开后，在内嵌画布或界面其他位置左键单击会立即关闭。

5 项真实 Electron ChemDraw 与右键检查通过：顶部按钮移除、画布右键打开菜单、画布其他位置左键关闭菜单、读取原生 CDX 剪贴板、粘贴后结构可编辑。语法检查及多画布、中英文、Agent 回归检查均通过。

## 0.5.7：从 ChemDraw 剪贴板粘贴

验证日期：2026-09-18。本机安装 ChemDraw 2022，测试使用其自带的 `benzene.cdx` 样例，不启动或控制 ChemDraw。

SMILES 输入区新增「从 ChemDraw 粘贴」，快捷键为 Ctrl+Shift+V。主进程读取 Windows 剪贴板中的 `ChemDraw Interchange Format`、CDX/CDXML、`Native` 和 SMILES，优先保留原生 CDX 数据；只有位图或矢量图片预览时拒绝导入。CDX/CDXML 继续经过现有页面预览、对象统计和转换警告，再作为新的可编辑画布打开。

7 项剪贴板格式检查通过：直接 CDX、`Native` 内嵌 CDX、CDXML、SMILES、图片拒绝、Electron 原始格式名解析和兴趣格式筛选。3 项真实 Electron 集成检查通过：粘贴入口显示、Windows 原生 CDX 剪贴板读取、苯结构转换后得到 6 个原子和 6 条可编辑键。相关语法检查通过。

## 0.5.6：中英文界面切换

验证日期：2026-09-18。

顶栏新增 **EN / 中文** 切换按钮，覆盖工作区、画布状态、多画布窗口条、帮助、ACS 样式、ChemDraw 导入、Agent 面板和 API 设置。语言保存到 Electron 应用数据目录，不依赖每次启动变化的本地服务端口；项目名称、画布文字和模型返回内容不做自动翻译。Ketcher 3.18.0 独立构建未包含可用的中文界面资源，因此内嵌化学工具栏维持上游英文界面。

6 项真实 Electron 语言检查通过：默认中文、即时切换英文、英文壳层无残留中文、弹窗同步切换、重启保持英文、切回中文。7 项多画布回归检查和 5 组 Agent 服务检查通过，相关 JavaScript / MJS / CJS 语法检查通过；未调用真实外部模型。

## 0.5.5：合并 chemistry1 改动

验证日期：2026-09-18。

已合并 DeepSeek 深度思考、SSE 流式进度、选区上下文、多画布窗口和多文档恢复。合并时保留原项目的 SVG、PNG、PDF 与 KET 导出 IPC，并修正多文档历史递归写入、切换前恢复副本未落盘、跨文档样式沿用和空白画布关闭提示问题。

7 项 Agent 服务检查通过：思考参数、流式响应、JSON 解析、选区坐标清理、选区整图替换拒绝等。7 项真实 Electron 多文档检查通过：初始文档、新建第二文档、最小化、切换还原、关闭、项目读取和恢复元数据。全部相关脚本语法检查通过；未调用真实外部模型。

## 0.5.1：DeepSeek API 预设

验证日期：2026-09-17。本地 Electron 44.4.1，未调用真实外部 API。

10 项主进程服务检查及 9 项真实 Electron 设置界面检查通过：

1. 通过：设置窗口提供 DeepSeek 服务商选项
2. 通过：选择 DeepSeek 自动切换到 Chat Completions
3. 通过：自动填写官方根地址 `https://api.deepseek.com`
4. 通过：默认填写 `deepseek-flash`，并提供 `deepseek-v4-pro` 建议
5. 通过：保存后服务商、协议、地址和模型关闭重开仍保持
6. 通过：Agent 面板显示 `deepseek-flash · DeepSeek`
7. 通过：请求地址准确拼接为 `https://api.deepseek.com/chat/completions`
8. 通过：DeepSeek 首个请求直接使用 JSON Object，不先发送预期会失败的严格 JSON Schema 请求
9. 通过：模型 ID 和 Bearer 鉴权正确写入请求
10. 通过：API 密钥加密落盘，配置文件不出现明文
11. 通过：同一 DeepSeek 地址切换到 `deepseek-v4-pro` 时保留原加密密钥
12. 通过：模型返回的结构化修改方案继续经过原有类型和结构校验

服务检查使用内存模拟 DeepSeek 响应；界面检查在独立应用数据目录中运行。没有使用用户 API 密钥、真实模型账户或外部配额。实际账户可用模型、计费和服务端输出质量取决于 DeepSeek 当前政策与账户权限。

## 0.5.0：画布 Agent 与可配置模型 API

验证日期：2026-09-17。本地 Electron 44.4.1、Ketcher 3.18.0、Indigo 1.46.0。

11 项主进程服务检查及 21 项真实 Electron 界面检查通过：

1. 通过：API 密钥加密后落盘，配置文件不含明文密钥
2. 通过：更换 API 地址时不把原地址密钥带到新地址
3. 通过：远程 HTTP 地址被拒绝，本机 HTTP 地址可用于本地模型
4. 通过：OpenAI Responses 请求使用 `store: false` 和严格 JSON Schema
5. 通过：OpenAI 兼容 Chat Completions 支持 JSON Schema，并可回退到 JSON Object
6. 通过：模型响应类型、大小、KET JSON 和根节点均经过校验
7. 通过：Agent 面板及设置对话框在实际应用中打开、保存并显示模型
8. 通过：当前画布 KET、SMILES、样式和对象统计进入模型上下文
9. 通过：修改方案先显示摘要与警告，用户应用前画布字节不变
10. 通过：应用 `add_source` 后乙醇生成 3 个原子、2 条键
11. 通过：应用修改进入统一撤销历史，撤销返回原画布
12. 通过：`replace_source` 可用 SMILES 替换整个画布
13. 通过：`replace_ket` 可做保留坐标的原子级修改并撤销
14. 通过：`no_change` 不改变项目数据
15. 通过：渲染器和主页面无脚本错误

网络测试使用本机临时模拟 API，没有使用真实外部服务、真实模型账户或用户 API 密钥。实际模型的化学正确性、配额、价格、可用模型和服务商数据处理政策不在本次本地验证范围内。

## 0.4.1：环连接处碳标记修正

验证日期：2026-09-17。本地 Electron 44.4.1、Ketcher 3.18.0、Indigo 1.46.0。

针对交替双键六元环模板点在已有碳原子上后出现显式 `C` 和红线的问题，完成 15 项检查：精确识别两组六元交替双键环共用的普通碳；将共用碳的四条键修正为单键；修正过程幂等；普通联苯保持不变；带电碳和非交替环保持不变；实时编辑器不再报告异常价态并隐藏共用碳；项目仍保留 11 个原子和 12 条键；界面提示自动修正；撤销返回第一个环；重做恢复修正结果；ACS 1996 兼容样式下同样隐藏；已有项目打开时也会修正；无渲染错误。

自动化检查通过环模板的真实界面操作复现问题，没有关闭全局价态警告，也没有修改 Ketcher / Indigo 上游发行文件。

## 0.4.0：直接绘图与统一画布

验证日期：2026-09-17。本地 Electron 44.4.1、Ketcher 3.18.0、Indigo 1.46.0。

17 项统一画布集成检查及 3 项收尾检查通过：

1. 通过：单一可见主画布取代独立编辑器和“放入画布”步骤
2. 通过：在主画布直接画键会创建可编辑原子
3. 通过：新绘图无需确认即可写入自动恢复副本
4. 通过：统一撤销和重做可恢复直接绘图
5. 通过：反应箭头与原子在同一画布绘制
6. 通过：反应条件文字在主画布直接创建和编辑
7. 通过：SMILES 追加结构时不清除已有内容
8. 通过：焦点在化学画布内时 Ctrl+S 保存全部当前修改
9. 通过：版本 2 项目重开后原子、箭头和文字仍可编辑
10. 通过：ACS 参数作用于实时画布，样式切换可撤销和重做
11. 通过：ACS 整页 SVG、PNG、PDF 和 KET 导出，SVG 物理尺寸正确
12. 通过：四类旧版示例保留原子、独立文字和箭头；转换前数据完整嵌入
13. 通过：转换后的项目可精确导出原始版本 1 项目
14. 通过：CDXML 直接进入统一画布，说明文字和反应箭头可编辑
15. 通过：取消 CDX 预览保留当前修改，接受后直接进入统一画布
16. 通过：关闭重启后恢复实时绘图，无需单独确认
17. 通过：集成检查使用独立数据目录，用户恢复文件未变化
18. 通过：旧版项目迁移保存使用新文件，原文件字节不变
19. 通过：合并画布和迁移后的文字对象完成可见界面检查
20. 通过：隐藏主画布内部重复的保存、撤销和重做按钮

实际交互绘制了键、反应箭头和富文本，使用 SMILES 追加苯环，并从画布内部触发 Ctrl+S。最终检查了有机反应统一画布截图。顺铂旧项目转换后仍含两条定向配位键；旧版文字和箭头均转换为 KET 对象。旧版相对箭头锚点在统一 KET 中没有对应关系，迁移后只保留可见位置，移动结构后需复查机理箭头。

自动化验证使用独立测试目录，并比较确认 `data/recovery.chemproj` 在测试前后字节不变。用户实际历史 ChemDraw 文件尚未提供，因此仍不能保证全部 CDX / CDXML 特性无损兼容。

## 0.3.0：ChemDraw 文件导入

验证日期：2026-09-17。本地 Electron 44.4.1、Ketcher 3.18.0、Indigo 1.46.0。

新增原生 CDX / CDXML 打开入口、页面选择、转换预览、可编辑整体导入和嵌入位图显示。18 项集成检查及 2 项补充检查通过：

1. 通过：Native CDX preview and cancellation preserve the current project
2. 通过：ChemDraw 20 CDXML imports structures, reaction arrows and independent captions
3. 通过：Import undo and redo restore the whole project
4. 通过：Imported reaction reopens in chemical editor and remains editable
5. 通过：ChemDraw 13 binary CDX imports editable atoms and bonds
6. 通过：Saving imported CDX creates a separate project and preserves original bytes
7. 通过：Save As refuses to overwrite a ChemDraw original
8. 通过：Saved imported project reopens exactly
9. 通过：Embedded CDX raster images survive preview, editable data, SVG and PNG export
10. 通过：Multi-page CDX selects one complete page with global tables retained
11. 通过：Multi-page CDXML and ACS physical-scale import
12. 通过：Invalid CDX leaves the current project unchanged
13. 通过：Custom XML entities are rejected without replacing the canvas
14. 通过：Raster SVG support still strips scripts, handlers, remote URLs and embedded SVG
15. 通过：Metal CDXML retains two directed coordination bonds and relative square-planar geometry
16. 通过：Enhanced stereochemistry fixture retains stereo labels
17. 通过：Restart restores the imported page and chosen style
18. 通过：All tests used isolated data; user recovery file was untouched
19. 通过：UTF-16 ChemDraw XML decodes and imports correctly
20. 通过：Empty or unsupported pages show an error and cannot replace the current canvas

已目视检查可见导入窗口、导入后的反应画布和嵌入图片的 PNG 导出。测试均使用独立数据目录，并比较验证用户恢复文件没有变化。样本来自已保留的上游源码测试资料及自行生成的配合物和多页样本；尚未使用用户历史文件验证，不表示全部 ChemDraw 特性无损兼容。详细使用方法及限制见 `ChemDraw导入说明.md`。


## 0.2.0：ACS 1996 兼容样式（原接入版本）

新增可选绘图样式，15 项集成检查通过；最终 SVG、PNG 和 PDF 已实际导出并核对物理尺寸。具体项目及数值见 `ACS样式说明.md`。以下保留 0.1.0 的历史验证记录。

# 0.1.0 基线验证

验证日期：2026-09-16。环境：当前电脑的 Windows x64，Electron 44.4.1，Ketcher 3.18.0 / Indigo 1.46.0。

## 核心操作

以下 17 项通过实际 Electron 应用中的自动化交互与数据断言验证：

1. 通过：Metal example retains two directed N-Pt coordination bonds
2. 通过：Metal structure reopens and reapplies with unchanged topology and relative geometry
3. 通过：All Pd examples contain two P-Pd coordination bonds and no P radicals
4. 通过：SMILES input, structure insertion and stereochemistry round-trip
5. 通过：Multiline Unicode condition text creation
6. 通过：Curve creation and control-point drag
7. 通过：Arrow endpoint binds to molecule and survives molecule movement
8. 通过：Undo and redo movement
9. 通过：Duplicate and delete objects
10. 通过：Native project save and previous-version backup
11. 通过：Native open restores all project data exactly
12. 通过：SVG export through native save dialog
13. 通过：PNG export through native save dialog
14. 通过：PDF export through native save dialog
15. 通过：Project import rejects unsafe IDs and sanitizes SVG executable content
16. 通过：External network requests blocked in offline desktop app
17. 通过：Application restart restores latest complete canvas

## 最终补充验证

- 不传开发目录参数，直接运行 `runtime/electron.exe`，应用可从内置入口启动。
- 反应 SMILES 可导入，RXN V3000 可导出，整个反应可作为可编辑对象放入页面。
- PNG 为 3600 × 2400 RGBA；页面空白处与分子包围框内的空白角落均为透明像素，已消除引擎生成的白色背景块。
- 实际渲染 PDF 并目视检查。A4 横向单页，中文和上下标保留，画面未出现裁切。
- 四类示例已在应用内实际生成；金属配合物、催化循环及机理图已检查截图。
- 化学结构重新编辑后，相对原子坐标、键连接和配位键保持；手性 SMILES 往返保留。
- `启动 Structlnk.lnk` 指向该目录内运行环境；`启动 Structlnk.vbs` 使用相对目录定位，适合整个文件夹移动后使用。

## 许可材料

- 保留了官方 Ketcher / Electron 发行文件中的许可和声明。
- 根据 Ketcher 官方锁文件递归整理了 347 个 npm 依赖条目（包括可选与 peer 依赖，存在不同版本条目）；344 个条目提取到许可文件，其余 3 个保留原始 npm 源码包、包元数据和 README，并补充可取得的上游许可证。
- 提供 Ketcher 3.18.0 和 Indigo 1.46.0 原始源码压缩包、来源地址及 SHA256。Indigo 第三方许可可在源码包中查阅，已额外提取部分许可文件。
- 此清单用于保留授权来源和支持后续核对，不是针对全部二进制模块、专利和商标的法律审计或零风险保证。

## 已知限制

这是可操作的技术原型，并非完整的 ChemDraw 替代品。尚未验证大量实际课题组文件，也未实现 Office 双击回编、原子级箭头绑定、CDX/CDXML 无损兼容、三维几何验证、多页项目及多人同时编辑。

当前箭头仅绑定分子内相对位置；化学编辑改变结构布局后应复查端点。自动恢复仅包含已确认到页面的内容。

源码、运行环境和上游源码归档合计约 1.2 GiB。日常运行不需要解压 `sources/`；这些归档供许可证核对、维护和重新构建时使用。
