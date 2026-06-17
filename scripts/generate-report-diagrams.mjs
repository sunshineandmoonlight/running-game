import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve("docs/images");

const diagrams = [
  {
    name: "system-architecture",
    title: "系统总体架构图",
    boxes: [
      { id: "input", x: 70, y: 70, w: 170, h: 70, title: "用户输入", lines: ["键盘 / 鼠标", "开始、暂停、跳跃、换道"], fill: "#e8f7ff" },
      { id: "window", x: 330, y: 70, w: 210, h: 70, title: "运行窗口", lines: ["浏览器 / Electron", "承载 Canvas 与 UI"], fill: "#f0f7ff" },
      { id: "main", x: 630, y: 70, w: 220, h: 70, title: "src/main.js", lines: ["场景初始化", "动画循环 / 生成逻辑"], fill: "#effbf5" },
      { id: "three", x: 90, y: 230, w: 210, h: 82, title: "Three.js 渲染层", lines: ["WebGL Renderer", "Scene / Camera / Light"], fill: "#fff6df" },
      { id: "state", x: 370, y: 230, w: 190, h: 82, title: "状态管理", lines: ["game/state.js", "分数 / 速度 / 跳跃"], fill: "#eef4ff" },
      { id: "collision", x: 630, y: 230, w: 190, h: 82, title: "碰撞检测", lines: ["game/collision.js", "AABB / 车道过滤"], fill: "#fff0f4" },
      { id: "model", x: 220, y: 390, w: 210, h: 82, title: "模型资源层", lines: ["public/models/kenney", "GLB 模型 / 贴图"], fill: "#f2f8e9" },
      { id: "fallback", x: 510, y: 390, w: 230, h: 82, title: "模型兜底机制", lines: ["game/model.js", "不可见模型 -> 几何体"], fill: "#f8f0ff" },
      { id: "exe", x: 780, y: 390, w: 190, h: 82, title: "桌面发布", lines: ["Electron Builder", "免安装 exe"], fill: "#edf7f7" }
    ],
    arrows: [
      ["input", "window"], ["window", "main"], ["main", "three"], ["main", "state"], ["main", "collision"],
      ["model", "fallback"], ["fallback", "main"], ["main", "exe"]
    ],
    width: 1040,
    height: 560
  },
  {
    name: "game-loop",
    title: "游戏主循环流程图",
    boxes: [
      { id: "start", x: 70, y: 80, w: 170, h: 64, title: "开始游戏", lines: ["初始化状态和场景"], fill: "#e8f7ff" },
      { id: "input", x: 320, y: 80, w: 170, h: 64, title: "读取输入", lines: ["换道 / 跳跃 / 暂停"], fill: "#f0f7ff" },
      { id: "player", x: 570, y: 80, w: 170, h: 64, title: "更新玩家", lines: ["位置 / 跳跃 / 滚动"], fill: "#effbf5" },
      { id: "spawn", x: 820, y: 80, w: 170, h: 64, title: "生成片段", lines: ["金币 / 障碍 / 门框"], fill: "#fff6df" },
      { id: "move", x: 820, y: 230, w: 170, h: 64, title: "移动物体", lines: ["向玩家方向推进"], fill: "#eef4ff" },
      { id: "collision", x: 570, y: 230, w: 170, h: 64, title: "碰撞检测", lines: ["金币 / 跳板 / 障碍"], fill: "#fff0f4" },
      { id: "hud", x: 320, y: 230, w: 170, h: 64, title: "更新界面", lines: ["分数 / 金币 / 距离"], fill: "#f2f8e9" },
      { id: "render", x: 70, y: 230, w: 170, h: 64, title: "渲染画面", lines: ["requestAnimationFrame"], fill: "#f8f0ff" },
      { id: "end", x: 445, y: 390, w: 210, h: 64, title: "结束 / 重开", lines: ["显示结果面板"], fill: "#edf7f7" }
    ],
    arrows: [
      ["start", "input"], ["input", "player"], ["player", "spawn"], ["spawn", "move"],
      ["move", "collision"], ["collision", "hud"], ["hud", "render"], ["render", "input"],
      ["collision", "end"], ["end", "start"]
    ],
    width: 1060,
    height: 540
  },
  {
    name: "collision-flow",
    title: "碰撞检测与误判修复流程图",
    boxes: [
      { id: "object", x: 60, y: 75, w: 190, h: 70, title: "活动对象", lines: ["金币 / 跳板 / 障碍"], fill: "#e8f7ff" },
      { id: "decor", x: 330, y: 75, w: 190, h: 70, title: "装饰物过滤", lines: ["光门 / 门框跳过"], fill: "#f0f7ff" },
      { id: "lane", x: 600, y: 75, w: 210, h: 70, title: "车道过滤", lines: ["使用玩家可见 x 坐标", "确定当前车道"], fill: "#effbf5" },
      { id: "aabb", x: 870, y: 75, w: 190, h: 70, title: "AABB 检测", lines: ["x/y/z 三轴重叠"], fill: "#fff6df" },
      { id: "coin", x: 120, y: 260, w: 180, h: 70, title: "金币", lines: ["加金币数和分数"], fill: "#f2f8e9" },
      { id: "pad", x: 380, y: 260, w: 180, h: 70, title: "跳板", lines: ["触发更高跳跃"], fill: "#eef4ff" },
      { id: "low", x: 640, y: 260, w: 180, h: 70, title: "低障碍", lines: ["高度足够则通过"], fill: "#f8f0ff" },
      { id: "high", x: 900, y: 260, w: 180, h: 70, title: "高障碍", lines: ["必须换道躲避"], fill: "#fff0f4" },
      { id: "end", x: 640, y: 430, w: 210, h: 70, title: "失败处理", lines: ["显示触发对象信息", "最终得分"], fill: "#edf7f7" }
    ],
    arrows: [
      ["object", "decor"], ["decor", "lane"], ["lane", "aabb"],
      ["aabb", "coin"], ["aabb", "pad"], ["aabb", "low"], ["aabb", "high"],
      ["low", "end"], ["high", "end"]
    ],
    width: 1140,
    height: 600
  },
  {
    name: "model-fallback",
    title: "3D 模型加载与兜底机制图",
    boxes: [
      { id: "request", x: 80, y: 80, w: 200, h: 72, title: "请求 GLB 模型", lines: ["Kenney 模型资源"], fill: "#e8f7ff" },
      { id: "load", x: 380, y: 80, w: 200, h: 72, title: "加载结果判断", lines: ["成功 / 失败"], fill: "#f0f7ff" },
      { id: "visible", x: 680, y: 80, w: 220, h: 72, title: "可见性检查", lines: ["Mesh / 父级 / 材质"], fill: "#effbf5" },
      { id: "model", x: 180, y: 275, w: 220, h: 78, title: "使用 GLB 模型", lines: ["城市 / 金币 / 箱子 / 尖刺"], fill: "#f2f8e9" },
      { id: "geo", x: 560, y: 275, w: 220, h: 78, title: "基础几何体兜底", lines: ["Box / Cone / Cylinder"], fill: "#fff6df" },
      { id: "marker", x: 860, y: 275, w: 220, h: 78, title: "高障碍可见标记", lines: ["保证危险位置可见"], fill: "#fff0f4" },
      { id: "collision", x: 430, y: 455, w: 250, h: 78, title: "统一碰撞盒", lines: ["视觉模型与判定解耦", "提升稳定性"], fill: "#f8f0ff" }
    ],
    arrows: [
      ["request", "load"], ["load", "visible"], ["visible", "model"], ["visible", "geo"],
      ["model", "marker"], ["geo", "marker"], ["model", "collision"], ["geo", "collision"], ["marker", "collision"]
    ],
    width: 1140,
    height: 620
  },
  {
    name: "delivery-workflow",
    title: "构建、测试与课程提交流程图",
    boxes: [
      { id: "source", x: 70, y: 80, w: 190, h: 72, title: "源代码", lines: ["src / public / electron"], fill: "#e8f7ff" },
      { id: "test", x: 340, y: 80, w: 190, h: 72, title: "单元测试", lines: ["npm test", "23 个测试"], fill: "#effbf5" },
      { id: "build", x: 610, y: 80, w: 190, h: 72, title: "网页构建", lines: ["npm run build", "dist 静态资源"], fill: "#fff6df" },
      { id: "exe", x: 880, y: 80, w: 200, h: 72, title: "免安装程序", lines: ["Electron Builder", "release/*.exe"], fill: "#f8f0ff" },
      { id: "report", x: 250, y: 285, w: 220, h: 76, title: "课程考核报告书", lines: ["需求分析", "系统设计思路"], fill: "#f0f7ff" },
      { id: "repo", x: 570, y: 285, w: 220, h: 76, title: "GitHub 源码仓库", lines: ["README", "源代码", "精简模型资源"], fill: "#f2f8e9" },
      { id: "submit", x: 420, y: 470, w: 250, h: 76, title: "最终提交材料", lines: ["报告书 + exe + 源代码", "小组分工说明"], fill: "#edf7f7" }
    ],
    arrows: [
      ["source", "test"], ["test", "build"], ["build", "exe"], ["source", "report"],
      ["source", "repo"], ["report", "submit"], ["repo", "submit"], ["exe", "submit"]
    ],
    width: 1140,
    height: 620
  }
];

function esc(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function center(box) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

function edgePoint(from, to) {
  const c1 = center(from);
  const c2 = center(to);
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return {
      start: { x: c1.x + Math.sign(dx) * from.w / 2, y: c1.y },
      end: { x: c2.x - Math.sign(dx) * to.w / 2, y: c2.y }
    };
  }
  return {
    start: { x: c1.x, y: c1.y + Math.sign(dy) * from.h / 2 },
    end: { x: c2.x, y: c2.y - Math.sign(dy) * to.h / 2 }
  };
}

function renderDiagram(diagram) {
  const byId = new Map(diagram.boxes.map((box) => [box.id, box]));
  const arrows = diagram.arrows
    .map(([fromId, toId]) => {
      const from = byId.get(fromId);
      const to = byId.get(toId);
      const { start, end } = edgePoint(from, to);
      return `<path d="M ${start.x} ${start.y} L ${end.x} ${end.y}" class="arrow" marker-end="url(#arrowhead)" />`;
    })
    .join("\n");

  const boxes = diagram.boxes
    .map((box) => {
      const lineY = box.y + 44;
      const lines = box.lines
        .map((line, index) => `<text x="${box.x + box.w / 2}" y="${lineY + index * 20}" class="body">${esc(line)}</text>`)
        .join("\n");
      return `<g>
  <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="14" fill="${box.fill}" class="box" />
  <text x="${box.x + box.w / 2}" y="${box.y + 27}" class="title">${esc(box.title)}</text>
  ${lines}
</g>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${diagram.width}" height="${diagram.height}" viewBox="0 0 ${diagram.width} ${diagram.height}">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M 0 0 L 10 4 L 0 8 z" fill="#35536b"/>
    </marker>
    <filter id="shadow" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#8aa0b3" flood-opacity="0.28"/>
    </filter>
  </defs>
  <style>
    .bg { fill: #fbfdff; }
    .heading { font: 700 28px "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif; fill: #17324d; }
    .box { stroke: #7aa0bd; stroke-width: 1.5; filter: url(#shadow); }
    .title { font: 700 17px "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif; fill: #18334d; text-anchor: middle; }
    .body { font: 13px "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif; fill: #36546c; text-anchor: middle; }
    .arrow { stroke: #35536b; stroke-width: 2.1; fill: none; }
  </style>
  <rect width="100%" height="100%" class="bg"/>
  <text x="${diagram.width / 2}" y="38" class="heading" text-anchor="middle">${esc(diagram.title)}</text>
  ${arrows}
  ${boxes}
</svg>`;
}

await mkdir(outDir, { recursive: true });

for (const diagram of diagrams) {
  await writeFile(path.join(outDir, `${diagram.name}.svg`), renderDiagram(diagram), "utf8");
}

console.log(`Generated ${diagrams.length} SVG diagrams in ${outDir}`);
