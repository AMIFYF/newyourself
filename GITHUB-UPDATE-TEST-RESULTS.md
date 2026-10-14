# GitHub 更新功能验证

验证日期：2026-10-14。版本：1.1.0，versionCode 2。

- TypeScript 严格检查、Web build、Lint：通过。
- 业务/原生/更新单元测试：26/26 通过。
- 浏览器端到端测试：10/10 通过。
- Capacitor sync android：通过，新增 AppLauncher 插件，其他原生插件保留。
- Android Gradle `:app:assembleDebug`：BUILD SUCCESSFUL。
- APK 签名检查：通过；与原 1.0 的签名证书一致。
- APK 包名与版本检查：com.dailyfeedback.app / 1.1.0 / 2，均符合配置。
- APK SHA-256：`1e77654f23b129b723e41e3a6b508e04b7ef551e3bd26d393fb0c21b35de4ed3`。

更新测试覆盖数字版本比较（如 1.10 大于 1.2）、相同/更旧版本不更新、未发布正式版本、缺少 APK、草稿/预发布拒绝、外部下载域名拒绝、网络失败、请求受限、原生安装版本读取、原生 HTTP、打开系统浏览器下载以及更新检查前后本地记录保留。

GitHub API 响应和 Android 插件在测试中使用模拟，不等同于真实线上发布或手机安装验收。本机无连接 Android 设备。本地 APK 已就绪；仓库创建和线上 Release 发布状态需以实际 GitHub 操作结果为准。
