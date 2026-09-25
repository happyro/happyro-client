# 架构

HappyRO Client 在浏览器中渲染世界、处理输入，并把登录与地图会话交给 Gateway 的 WebSocket 代理。它不直连 rAthena TCP 端口。

## 主要部分

| 路径 | 职责 |
| --- | --- |
| `applications/pwa/` | 正式入口、HappyRO 配置、导航与世界 JSON |
| `src/Engine/` | 登录、角色、地图引擎 |
| `src/Network/` | 封包注册与 `PACKETVER` |
| `src/DB/` | 静态表、中文名称、生成的技能 / NPC 目录 |
| `src/UI/` | 游戏窗口 |
| `scripts/` | 魔物与世界图鉴资源生成 |

## 与其它仓库

- Gateway：PWA 静态文件、`/data` 资源、`/ws/`、Web API 代理。
- Server：封包、地图传送 `0xd00`/`0xd01`、NPC 传送和召唤的权威结果。
- Admin：冒险工具经 Gateway 同源代理访问的资料与 Game Control。
- 根仓库：`Config.happyro.js`、导航覆盖、技能 / 导航生成器。

静态数据与服务器权威的边界见根仓库 `docs/architecture/localization-runtime.md`。

## 摇杆停止

移动端摇杆松手或触摸取消时，`GameCommands.stopDirectionalMovement` 立即清除本地续走，并在本次拖动确实发送过方向移动时发送一次 `CZ_HAPPYRO_STOP_MOVE`（`0xd03`，仅 2 字节小端包头）。它不携带客户端坐标，也不改动持续行走的请求间隔、目标距离或动画。

HappyRO Server 沿当前路线缩短剩余步程，通过现有移动确认同步终点；网络往返与格子步进仍会影响停止时间。客户端与服务端须配套部署，先更新支持 `0xd03` 的服务端，再更新客户端，`PACKETVER` 保持 `20211103`。
