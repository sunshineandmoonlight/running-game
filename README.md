# 霓虹金币跑酷

基于 **Three.js + WebGL + Electron** 的 3D 跑酷收集金币小游戏。玩家控制一个霓虹小球在三条悬浮赛道之间移动、跳跃、收集金币，躲避高障碍并越过低障碍。游戏包含 3D 场景、模型资源、碰撞检测、粒子反馈、音效、HUD 面板、历史最高分和 Windows 免安装版打包配置。

本项目适合作为多媒体技术课程的作品设计型题目：

> 基于 WebGL 与 Three.js 的三维跑酷游戏设计与实现

## 功能特性

- **三维场景渲染**：使用 Three.js 构建赛道、城市背景、星空、灯光、雾效和材质。
- **跑酷玩法**：支持三车道移动、跳跃、金币收集、障碍躲避和持续加速。
- **关卡生成**：通过固定关卡片段循环生成金币、矮墙、门框、跳台和高障碍，外观模型带有一定随机性。
- **模型资源接入**：接入 Kenney CC0 模型，包括城市建筑、金币、箱子、尖刺、栅栏和平台。
- **碰撞检测**：使用 AABB 碰撞盒，同时按玩家实际可见车道过滤单车道障碍，减少误判。
- **模型兜底机制**：如果 GLB 模型加载失败或不可见，会自动退回基础几何体，避免隐形障碍。
- **游戏反馈**：金币、跳台、撞击等事件带有粒子和音效反馈。
- **状态管理**：包含开始、暂停、继续、重新开始、得分、金币数、距离和最高分。
- **桌面打包**：通过 Electron Builder 生成 Windows 免安装 `.exe`。

## 技术栈

- Vite
- JavaScript
- Three.js
- Electron
- Electron Builder
- Vitest
- Playwright

## 目录结构

```text
3d-runner-coin-game/
├─ electron/              # Electron 主进程入口
├─ public/models/         # 游戏运行需要的精简 3D 模型资源
├─ scripts/               # Windows 打包脚本
├─ src/
│  ├─ game/               # 游戏状态、碰撞、模型辅助函数及测试
│  ├─ main.js             # Three.js 场景、渲染循环、生成逻辑
│  └─ styles.css          # 页面和 HUD 样式
├─ index.html
├─ package.json
├─ vite.config.js
└─ README.md
```

## 本地运行

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

然后在浏览器打开终端显示的地址，通常是：

```text
http://127.0.0.1:5173
```

## 操作方式

| 操作 | 按键 |
|---|---|
| 左移 | `A` / `←` |
| 右移 | `D` / `→` |
| 跳跃 | `Space` / `W` / `↑` |
| 暂停或继续 | `P` |
| 重新开始 | `R` |

## 构建网页版本

```bash
npm run build
```

构建产物会生成到：

```text
dist/
```

## 生成 Windows 免安装版

项目已经配置好 Electron 打包。执行：

```bash
npm run package:win
```

成功后会在 `release/` 目录生成：

```text
霓虹金币跑酷-免安装版-1.0.0.exe
```

说明：由于中文路径下 Electron Builder 可能出现目录重命名权限问题，项目中的 `scripts/package-win.ps1` 会先将打包产物输出到 `C:\runner-release`，再复制回项目的 `release/` 目录。

## 测试

运行单元测试：

```bash
npm test
```

当前测试覆盖：

- 游戏状态流转
- 跳跃物理
- 金币计分
- AABB 碰撞检测
- 装饰物/空碰撞盒过滤
- 车道碰撞过滤
- 模型可见性判断和兜底逻辑

## 素材来源

项目使用了 Kenney 免费资产包中的部分模型，许可证为 Creative Commons CC0：

- Kenney City Kit (Commercial)
- Kenney Platformer Kit

仓库中只保留游戏运行实际需要的精简 `.glb` 模型和贴图，完整下载包和完整素材目录未提交到 GitHub。

## 课程设计说明

本项目可对应多媒体技术课程的作品设计型考核，主要体现以下内容：

- WebGL 三维场景构建
- 3D 模型加载与展示
- 动画与实时渲染
- 键盘交互控制
- 碰撞检测与游戏规则
- UI 与游戏状态反馈
- 音效和粒子等多媒体表现
- Windows 可执行程序打包

## 备注

Electron 免安装版文件体积较大，`release/` 默认不会提交到 GitHub。如果需要提交课程材料，可以单独把 `release/霓虹金币跑酷-免安装版-1.0.0.exe` 放入课程提交压缩包。
