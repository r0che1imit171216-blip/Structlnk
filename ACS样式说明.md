# ACS 1996 兼容样式

适用于 Structlnk 0.7.0。参数接入于 2026-09-16，统一画布于 2026-09-17 验证。

重新打开软件，在主画布上方「绘图样式」选择「ACS 1996 兼容样式」。「样式说明」可查看参数，Ctrl+Z 可撤销样式切换。

| 项目 | 预设 |
| --- | --- |
| 默认标准键长 | 14.4 pt，即 5.08 mm |
| 普通键线宽 | 0.6 pt |
| 楔形键宽度 | 2 pt |
| 多重键间距 | 键长的 18% |
| 虚线楔形键间距参数 | 2.5 pt |
| 原子标签、文字 | Arial，10 pt，黑色；中文使用系统回退字体 |
| SVG 绘图区 | 540 × 720 pt |
| PDF | US Letter 612 × 792 pt，四边 36 pt 留白 |
| PNG | 4500 × 6000，透明背景，600 dpi |

样式写入项目文件。切换样式保留 KET 结构数据、原子相对坐标和连接关系，不自动重排配合物几何。画布可以平移和缩放；视觉缩放不改变导出物理比例。14.4 pt 是新绘图及导出标定使用的默认标准键长，不是对每一条键的坐标锁定。

需要疏开拥挤结构时，切换到选择工具并拖动单个原子，即可手动调整相邻键长和键角。调整后的坐标会进入撤销记录，随 `.chemproj` 保存，并直接用于 SVG、PNG 和 PDF 导出；再次渲染或重新打开项目不会因该样式而自动复位。

反应与机理箭头使用化学引擎的 ACS 渲染设置。主画布富文本可以保留单独字号。样式切换会改变导出页面比例，请检查拥挤布局和箭头端点。

公开参数参考：[ChemDraw 官方 ACS Document 1996 文档](https://support.revvitysignals.com/hc/en-us/articles/4408234173332)；这里的原名称只用于说明参数来源。Structlnk 根据这些公开参数独立实现此兼容样式，自行编写参数映射和页面逻辑，未复制 ChemDraw 的代码、样式文件、模板或图标。上游 Ketcher / Indigo 发行文件未修改。

兼容范围：普通键、字体大小、黑白显示、多重键间距和导出物理比例已接入。标签避让、1.6 pt 标签留白、部分特殊粗键及复杂立体键的具体外观仍由化学引擎决定，不承诺与 ChemDraw 像素级一致。配位结构保留原几何，不强制套用有机链角。

## 实际验证

以下 15 项在独立测试数据目录的 Electron 应用中通过，未覆盖用户的自动恢复文件：

1. Existing v1 project loads without mutation
2. ACS dropdown applies style and preserves exact KET including metal geometry
3. ACS molecule physical scale and 10 pt captions
4. Undo restores original project exactly; redo restores ACS
5. Chemical editor receives ACS settings; manually adjusted atom coordinates remain unchanged
6. New project and newly drawn structures inherit chosen style
7. New caption uses 10 pt
8. Style and calibrated geometry persist in project file
9. ACS SVG export
10. ACS PNG export
11. ACS PDF export
12. SVG declares actual physical size
13. Examples inherit ACS; curve bindings survive style application
14. Restart restores document style
15. Switch back restores standard editor, canvas and export mode

补充导出测量：最终 PDF 为单页 612 × 792 pt；普通键线宽实测 0.599999 pt；说明文字实测 9.997499 pt（浏览器渲染舍入）。PNG 为 4500 × 6000 RGBA，分辨率元数据约 599.9988 dpi（整数每米像素换算）。修正了 Indigo 浮点截断造成的键长缩放偏差，导出按 600 dpi 下 120 像素对应 14.4 pt 计算。已目视检查界面和实际 PDF 渲染。

示例位于 `examples/05-ACS1996-有机反应.chemproj`，通过软件顶部「打开」载入。
