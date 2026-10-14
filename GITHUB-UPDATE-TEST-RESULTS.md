# GitHub 更新功能验证

验证日期：2026-10-14。最终版本：1.1.1，versionCode 3。

- TypeScript 严格检查、Web build、Lint：通过。
- 业务/原生/更新单元测试：28/28 通过。
- 浏览器端到端测试：11/11 通过。
- Capacitor sync android：通过，新增 AppLauncher 插件，其他原生插件保留。
- Android Gradle `:app:assembleDebug`：BUILD SUCCESSFUL。
- APK 签名检查：通过；与原 1.0 的签名证书一致。
- APK 包名与版本检查：com.dailyfeedback.app / 1.1.1 / 3，均符合配置。
- APK SHA-256：`f2179dfada9c0c9c1b7b7a3b8310969bce4b2520be6d386602fd6285faf932a5`。
- 公开仓库创建、Git 推送、Release 发布、APK 附件上传：全部完成。
- 匿名读取同仓库后备清单：通过，1.1.1 APK 摘要与本地文件一致。
- 实际页面点击“检查更新”：通过，在真实网络显示“当前版本 v1.1.1 已是最新版本”。

更新测试覆盖数字版本比较（如 1.10 大于 1.2）、相同/更旧版本不更新、未发布正式版本、缺少 APK、草稿/预发布拒绝、外部下载域名拒绝、网络失败、请求受限、原生安装版本读取、原生 HTTP、打开系统浏览器下载以及更新检查前后本地记录保留。

单元/端到端回归中的 API 响应和 Android 插件使用模拟；此外已独立完成真实网络、实际浏览器页面的匿名更新检查，验证真实 GitHub Release 及后备清单。当前网络的匿名 GitHub API 被限流（403），后备来源成功工作。没有在 App 中放入 GitHub 令牌。

公开仓库：https://github.com/AMIFYF/newyourself

最终 Release：https://github.com/AMIFYF/newyourself/releases/tag/v1.1.1

本机无连接 Android 设备，尚未实际操作手机上的下载及系统安装界面。签名与旧版本一致已由 apksigner 验证。
