# 每日正反馈 · Android 版本

在原有 React + TypeScript + Vite 项目上增加 Capacitor 8，未重建产品或替换业务规则。

## 工程与 APK

- App 名称：每日正反馈
- applicationId / namespace：`com.dailyfeedback.app`
- Android 工程：本项目的 `android/`
- Web 构建目录：`dist/`，由 `capacitor.config.ts` 的 `webDir` 指定
- 原始 Debug APK：`android/app/build/outputs/apk/debug/app-debug.apk`
- 方便取用的 APK 副本：`artifacts/daily-feedback-debug.apk`
- Android 最低版本：7.0 / API 24；compileSdk / targetSdk：36。需使用更新的 Android System WebView。

APK 自带 Web 静态资源，运行时不需要电脑、Vite 服务或互联网。没有配置远程 `server.url`。

## 重新生成 APK

当前机器已经记录工具路径到忽略提交的 `android-build.local.json`。在项目目录运行：

```powershell
npm run android:build
```

脚本执行 `npm run build` → `npx cap sync android` → Gradle `:app:assembleDebug`，失败时立即停止，成功后复制 APK 并显示 SHA-256。

换电脑时安装 Node.js 22+、JDK 21、Android SDK Platform 36 和 Build Tools 36.0.0。设置 `JAVA_HOME`、`ANDROID_HOME`，运行 `npm ci` 后使用上述命令，也可手动执行：

```powershell
npm run android:sync
cd android
.\gradlew.bat :app:assembleDebug
```

`android/local.properties` 的 `sdk.dir` 是机器专用路径，脚本会自动写入。Linux/macOS 可使用相同 Web/sync 命令，再执行 `cd android && ./gradlew :app:assembleDebug`。

将 APK 传到手机后点击安装，按系统提示允许当前文件管理器安装该应用即可。也可通过已授权调试的设备执行 `adb install -r artifacts/daily-feedback-debug.apk`。

## Android Studio

使用 Android Studio Otter 2025.2.1 或更新版本，Open 选择本项目下的 **android 文件夹**，等待 Gradle Sync；Gradle JDK 选择 JDK 21。也可以运行 `npm run android:open`。选中设备后点击 Run。

## 本地存储与原有数据

网页端仍使用原来的 `daily-feedback-v1` localStorage 键，已有浏览器数据不会被清空。Android 使用 Capacitor Preferences（原生 SharedPreferences），同一个 JSON 保存日期记录和两个计时器，页面只访问统一的 `store`。

启动先加载存储再渲染，防止异步加载时用空白记录覆盖旧记录。写入串行处理；保存完成后更新界面。若存在同一个 App WebView 中的旧 localStorage 数据，会在校验通过后迁移一次，且保留原值。电脑网页和手机 App 是不同存储空间：在网页导出 JSON，再在手机导入即可迁移。

系统清理普通 WebView 缓存不影响 Preferences。卸载 App 或主动清除 App 数据会删除本地记录，卸载前请导出备份。已关闭 Android 自动备份，以保持个人本地工具的范围。

## 计时与 XP

沿用原 `remaining`、`settle`、`localDate` 业务逻辑。`setInterval` 仅刷新显示，不负责累加时间。运行时保存剩余毫秒和起始时间戳；低刺激保存起始时间戳。

App 切后台、锁屏或被系统回收后，重新进入会根据真实时间重新计算。进入前台监听原生 `appStateChange`，并补充页面 visibility/focus 恢复。专注到时和 XP 结算使用同一 Session ID 去重，结算记录与计时器清除一并保存，重复恢复不会再次奖励。暂停状态在重启后继续保持暂停。

后台不运行常驻服务、不申请电池优化豁免，也不增加通知。若 Android 挂起 WebView，到时奖励在下一次进入 App 时补结算，归入实际到时的本地日期。低刺激跨日活动归入点击结束时的本地日期。修改设备系统时间仍会影响时间戳计时。

## JSON 与手机交互

Android 导出将 UTF-8 JSON 写入 App 缓存文件，然后打开系统分享面板；需要在面板选择保存位置或接收应用，才完成独立备份。网页版保持浏览器下载。导入使用系统文件选择器，内容仍经过原校验和覆盖确认。

仅进行必要适配：手机竖屏、安全区、输入框 16px 字号、主要触控目标至少 44px、顶部固定三页导航、软键盘 adjustResize、内容纵向滚动。保留全部原有今日、历史、统计、计时、补录、导入导出和清空功能。

## 测试命令

```powershell
npm run typecheck
npm run lint
npm test
$env:PW_CHANNEL='msedge'
npm run test:e2e
npm run android:build
```

原生适配单元测试用模拟插件验证 Preferences、生命周期和分享调用，不能替代 Android 设备端验收。实际验证结果和设备可用情况见 `ANDROID-TEST-RESULTS.md`。

参考：[Capacitor Preferences](https://capacitorjs.com/docs/apis/preferences)、[App 生命周期](https://capacitorjs.com/docs/apis/app)、[Android 构建要求](https://capacitorjs.com/docs/updating/8-0)。
