# 开发

需要 Node.js 22 或更高版本。完整游戏会话依赖根仓库启动的 MariaDB、Server 和 Gateway。

```bash
npm install
npm run pwa          # Vite，打开 PWA
npm test
npm run lint
```

修改 `applications/pwa/Config.happyro.js` 前，先改根仓库 `configs/Config.happyro.js`，再执行 `make configure-client`。`packetver` 必须是 `20211103`，`packetKeys` 必须是 `false`。

NPC、魔物图鉴和导航数据的生成命令见根仓库 `docs/game-data/`。技能静态表由根仓库 `scripts/resources/generate-skill-localization.mjs` 写入本仓库生成模块。
