# Structlnk Windows 安装包

安装包只包含运行所需的 `app`、`runtime`、示例、许可证和使用说明，不包含 `sources`、`work` 或开发目录中的 `data`。

安装位置默认为 `%LOCALAPPDATA%\Programs\Structlnk`，无需管理员权限。安装版的 API 设置、界面语言和自动恢复文件保存到 `%APPDATA%\Structlnk`；覆盖安装新版或卸载程序文件不会删除这些用户数据。

构建命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\build-installer.ps1
```

构建结果写入 `dist`：安装程序、`latest.json` 更新清单和 SHA256 文件。提高 `app/package.json` 中的版本号后重新构建，即可生成可覆盖升级的新版安装程序。`AppId` 必须保持不变。

当前安装程序未进行商业代码签名；发布到 GitHub 前应使用可信代码签名证书签署安装程序，以减少 Windows SmartScreen 警告。
