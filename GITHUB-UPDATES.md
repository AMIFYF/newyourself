# GitHub 更新与发布

仓库：`AMIFYF/newyourself`。更新源：GitHub Releases 的最新正式版本。App 不请求 GitHub 登录，也不保存访问令牌。

## 手机使用

先覆盖安装包含更新功能的 **1.1.0** APK。原 1.0 没有检查更新按钮，因此这一次需要手动安装新版。不要先卸载。

在页面底部点击“检查更新”。只有更高的正式版本才显示“下载并更新”；相同或更旧版本不会降级。下载后点击 APK，并由系统确认覆盖安装。记录保留在原应用存储中，更新请求不发送本地记录。

首次发布之前或仓库私有时，按钮会提示没有可用版本。GitHub 无法访问、超时或请求受限会显示可重试提示，日常记录仍可离线使用。

## 每次开发后发布

`git push` 只上传源码，不等于发布手机更新。手机检查的是带 APK 附件的 **Release**。

1. 修改代码。
2. 在 `app-release.json` 增加 `version`（例如 1.2.0）与 `versionCode`（例如 3），两者都必须递增。网页和 Android 从这一个配置读取版本。
3. 修改 `RELEASE-NOTES.md`。
4. 在本项目目录运行 `npm run github:publish`。

发布脚本先测试、构建、sync、生成 APK 并检查原签名，然后提交源码、推送 main、创建版本标签/Release、上传 APK/校验和/版本信息。发布失败会停止并提示；已发布版本不覆盖，应使用新的版本号。

需要本机已安装 GitHub CLI 并通过 `gh auth login` 登录，origin 为该仓库，且有推送和发布权限。初次使用需先创建公开仓库，并初始化当前项目的 Git。

APK 由本地发布脚本测试并生成，沿用当前机器的签名；不要使用临时生成的其他 Debug 密钥构建后续更新。

## 签名与数据

`android-signing.json` 只保存当前签名证书的公开指纹，构建会强制核对 APK 证书、包名、version/versionCode。**密钥文件不能上传公开仓库。** 当前 Debug 密钥在本机原有 Android 配置中，请妥善保存；更换机器时使用同一密钥。原始安装包的证书指纹为 `1bc644c5b5010ee498c1208c38aeb31a2a123a076bad3c5c6026ab6834b8ceea`。

忽略提交的内容包括密钥、依赖目录、构建目录、本地 Android 工具路径、测试浏览器数据和 APK；APK 只作为 Release 附件发布。本地记录来自浏览器/Preferences，根本不属于 Git 源码。

更新流程不迁移或清空记录，也不改变日期与计时算法。未来数据结构改变时仍须编写兼容迁移。签名不同的 APK 会被系统拒绝覆盖，不能通过卸载旧 App 来当作无损升级。

实现参考：[GitHub Releases API](https://docs.github.com/en/rest/releases/releases#get-the-latest-release)、[Capacitor HTTP](https://capacitorjs.com/docs/apis/http)、[AppLauncher](https://capacitorjs.com/docs/apis/app-launcher)。
