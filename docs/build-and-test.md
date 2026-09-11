# 构建与测试

```bash
npm test
npm run lint
npm run catalog:world
npm run catalog:monsters
npm run build:pwa
```

`build:pwa` 把应用写到 `dist/Web`。Gateway 读取该目录，而不是 Vite 开发服务器。

涉及 UI、导航、图鉴、物品名或技能窗时，必须用真实浏览器经 Gateway 进入游戏验收。单测通过不能代替资源覆盖、缓存和 Service Worker 行为。
