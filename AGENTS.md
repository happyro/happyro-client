# roBrowserLegacy 客户端代理说明

## HappyRO 仓库规则

- HappyRO 自有提交必须使用 `type(scope): subject` 格式。
- `scope` 必须存在，使用小写英文；破坏性变更使用 `type(scope)!: subject` 并说明迁移方式。
- 允许的类型：`feat`、`fix`、`config`、`docs`、`refactor`、`test`、`build`、`ci`、`chore`、`perf`、`style`、`revert`。
- subject 使用祈使语气的英文，不以句号结尾，首行不超过 72 个字符。
- 一个提交只包含一个逻辑变更；上游合并提交和上游作者提交不受此限制。
- 只推送到本仓库的 `origin`，不推送到 `upstream`；未经用户明确要求不提交、不推送。
- 保持 `PACKETVER=20211103`、Renewal、封包混淆和服务端配置一致。
- 运行时资源必须使用已核验的官方 kRO 2021-11-05 基线和局域网服务。
- 不使用第三方批量翻译表、翻译客户端或翻译后的客户端包。
- 不提交生成的 PWA 输出、客户端资源、密钥、截图或运行时语言包。

## 项目概览

roBrowserLegacy 是使用 ES6 modules 和 WebGL 构建的《仙境传说》网页客户端，支持浏览器、PWA 和 Electron。

- `src/App/`：应用入口。
- `src/Core/`：客户端、配置、文件、线程和平台基础设施。
- `src/Engine/`：登录、选角、地图和游戏状态引擎。
- `src/Network/`：封包注册、结构、加密、版本和 Socket。
- `src/Loaders/`：GRF、地图、精灵、模型和资源解析器。
- `src/DB/`：道具、职业、地图、怪物、宠物、技能和状态数据。
- `src/Renderer/`：WebGL 渲染、实体、地图和特效。
- `src/UI/`：UIManager、GUIComponent、Custom Elements 和游戏界面组件。
- `src/Controls/`：输入、地图、战斗和快捷命令控制器。
- `applications/pwa/`：PWA 配置和入口。

## 架构约束

- 源码使用 ES6 `import`/`export`，由 Vite 打包。
- 使用既有路径别名，例如 `Core/Configs.js`、`UI/Components/...`。
- 实体系统使用组合和 mixin，不改成继承体系。
- `PACKETVER` 按可执行文件时间自动识别；修改版本检测会影响多个协议版本。
- 浏览器使用 WebSocket，Electron 使用 NodeSocket；两条路径必须保持一致接口。
- 新 UI 组件使用 `GUIComponent`、`<ui-button>`、`<ui-text>` 和 `<ui-image>` 体系。
- UI 资源由 GRF 图片驱动，CSS 主要负责结构和定位。
- 不修改 `src/Vendors/` 中的固定第三方代码。
- 修改网络、渲染、资源加载或协议代码时，保持公共 API、版本行为和既有组件模式。

## 代码约定

- 遵守 `.editorconfig`、`.gitattributes`、Prettier 和 ESLint 约定。
- 使用单引号、分号、必要的大括号和既有换行风格。
- 尽可能使用 `const`，否则使用 `let`，不使用 `var`。
- 私有变量使用 `_` 前缀；常量使用 `UPPER_SNAKE_CASE`；类使用 PascalCase；函数使用 camelCase。
- 不在翻译批次中顺便做无关重构、格式化或现代化改造。

## 配置、构建和调试

- 修改配置时保持 LAN WebSocket、资源路径和客户端/服务端协议设置一致。
- 常规客户端变更遵循仓库既有的 `npm test`、`npm run build:pwa` 和针对性检查流程；当前中文汉化阶段按根仓规则暂不进行自动测试。
- 浏览器日志可能被 ConsoleManager 静默；检查 `development` 和 `enableConsole` 配置。
- 网络问题先检查 `packetDump`、PacketStructure.js 和 PACKETVER 检测结果。
- GRF 路径在 Linux 区分大小写；资源文件名和目录大小写必须保持正确。
- 不根据翻译行数宣称完成，必须检查 ID、占位符、编码、fallback 和代表性游戏流程。
