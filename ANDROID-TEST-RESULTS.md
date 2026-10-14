# Android 交付验证

验证日期：2026-10-07。

## 交付文件

- `artifacts/daily-feedback-debug.apk`
- 文件大小：4,355,540 字节，约 4.15 MiB
- SHA-256：`37a9a314efbb185b312363577a9f3cc82f79852165658f747dc9d82e43dcaa9d`
- 原始构建文件：`android/app/build/outputs/apk/debug/app-debug.apk`
- App 名称：每日正反馈
- 包名：`com.dailyfeedback.app`
- 版本：1.0（versionCode 1）
- minSdk 24、targetSdk / compileSdk 36
- Android Debug 签名；`apksigner verify --verbose --print-certs` 通过，APK v2 签名有效。

## 最终检查结果

| 检查 | 结果 |
| --- | --- |
| TypeScript 严格检查 | 通过 |
| Vite Web build | 通过 |
| Capacitor sync android | 通过，4 个原生插件已注册 |
| Gradle `:app:assembleDebug` | BUILD SUCCESSFUL |
| 完整 `npm run android:build` 脚本 | 通过，包含 Web build、sync、Gradle、复制 APK 和生成校验和 |
| Lint | 通过 |
| 业务规则 + 原生适配单元测试 | 13/13 通过 |
| Microsoft Edge 浏览器端到端测试 | 8/8 通过 |
| APK 签名校验 | 通过 |
| APK 内包名、名称、SDK、入口 Activity | 通过 aapt dump badging 检查 |
| APK 内 Web index 与最新 dist 一致 | 通过 |
| APK 未配置远程 server.url | 通过 |
| Android 设备实际安装运行 | 未执行：ADB 无连接设备，无现成 Android AVD/模拟器 |

## 覆盖范围

保留原 7 项规则测试和 8 项浏览器流程测试，覆盖 5/5、历史统计、25/50 分钟、暂停继续、放弃无 XP、刷新恢复、浏览器进程重启、JSON 导入导出、双重清空确认、多标签页去重和移动端无横向溢出。

增加 6 项原生适配单元测试：

1. Preferences 保存完整今日/历史/XP/活动及两个运行中计时器，重新创建 store 后内容一致。
2. 有效的 WebView 旧 localStorage 数据只迁移一次，保留原始值。
3. 后台跨日后多次触发前台恢复、同时执行更新，专注只结算一条记录和一次 XP。
4. 暂停的专注在重新创建 store 后保持暂停及剩余时长。
5. 模拟原生写入失败，不覆盖原始数据并显示错误。
6. 原生 JSON 导出写入 UTF-8 缓存文件，并将 URI 传给系统 Share API。

原生插件调用在这些单元测试中使用模拟实现，**没有冒充真机测试**。手机锁屏/杀进程恢复、系统文件选择器、分享面板和具体厂商 WebView 的表现仍需设备验收。时间测试使用虚拟时间，不等待 25/50 分钟。

## 构建环境与非阻塞信息

本机未发现 Android Studio，但已有 Android SDK；本次补充 JDK 21、Android Platform 36、Build Tools 36，并使用 Gradle 8.14.3 / AGP 8.13.0 完成构建。Gradle 分发镜像下载文件已与官方 SHA-256 对比一致，项目 wrapper 保持官方地址和固定校验和。

首次构建出现 Capacitor 模板的 flatDir 提示、SDK XML schema 兼容提示及依赖 Java unchecked 提示，均未阻止构建。`npm audit --omit=dev` 为 0；完整开发依赖审计有 3 项中等级告警，来自 Capacitor CLI 的 iOS xcode/uuid 开发工具链，该链不打包到 Android APK，未通过强制降级或不兼容覆盖隐藏告警。

当前没有测试中发现且未修复的业务回归。系统时间手动调整会影响时间戳计时；卸载/清除 App 数据会删除本地记录。后台被挂起时不即时显示通知，到时 XP 在下一次恢复 App 时补结算。
