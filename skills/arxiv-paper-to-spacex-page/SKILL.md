# arXiv Paper to SpaceX Page

将 arXiv 论文转化为 SpaceX 风格的落地页，包含专业公式渲染、技术配图生成、OG 分享卡片。

## 工作流概览

```
arXiv 论文 → HTML 提取 → 内容重组 → SpaceX 页面 → KaTeX 公式 → 暗黑配图 → OG 标签 → 部署
```

## 步骤 1：获取论文内容

### 下载 HTML 版本（推荐）

arXiv 提供 HTML 版本，比 PDF 更容易提取结构化内容：

```
URL: https://arxiv.org/html/{论文ID}v1
```

使用 webfetch 工具获取 HTML 格式，然后提取：
- 标题、作者、机构
- 摘要
- 核心算法与公式
- 实验设置与结果
- 边界条件与限制

### 提取关键信息

从论文中提取以下结构化信息：
1. **完整架构** — 系统组件、数据流
2. **核心算法** — 数学公式、超参数
3. **进化/工作流程** — 详细步骤
4. **实验设置** — 基准、基线、超参数
5. **关键结果** — 所有实验数据表格
6. **边界条件** — 适用范围、限制
7. **成本分析** — 计算开销估算
8. **案例研究** — 具体示例

## 步骤 2：安装 SpaceX 设计系统

```bash
npx getdesign@latest add spacex
cp spacex/DESIGN.md ./DESIGN.md
```

### SpaceX 风格核心特征

| 特征 | 值 |
|------|-----|
| 背景 | 纯黑 `#000000` |
| 文字 | 光谱白 `#f0f0fa`（带蓝紫偏色） |
| 字体 | D-DIN（工业 DIN 传承） |
| 排版 | 全大写 + 正字间距（0.96px-1.17px） |
| 按钮 | 幽灵按钮 `rgba(240,240,250,0.1)` + `rgba(240,240,250,0.35)` 边框，32px 圆角 |
| 图片 | 全视口摄影，`background-attachment: fixed` 视差 |
| 装饰 | 零阴影、零卡片、零渐变 |

## 步骤 3：创建页面结构

### 基本 HTML 骨架

```html
---
layout: false
isPage: true
---
<!doctype html>
<html lang="zh-CN">
  <head>
    <!-- 见步骤 5：OG 标签 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
    <style>
      /* 见下方 CSS 核心样式 */
    </style>
  </head>
  <body>
    <!-- 导航、Hero、各章节、页脚 -->
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    <script>
      // 见步骤 4：KaTeX 初始化
    </script>
  </body>
</html>
```

### 核心 CSS

```css
:root {
  --black: #000000;
  --white: #f0f0fa;
  --ghost-bg: rgba(240, 240, 250, 0.1);
  --ghost-border: rgba(240, 240, 250, 0.35);
  --overlay: rgba(0, 0, 0, 0.65);
}

.section {
  min-height: 100vh;
  display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
  padding: 100px 8vw;
  position: relative;
  background-size: cover; background-position: center; background-attachment: fixed;
}
.section::before {
  content: ''; position: absolute; inset: 0;
  background: var(--overlay); z-index: 0;
}
.section > * { position: relative; z-index: 1; }

.arch-img {
  width: 100%; max-width: 1000px; border-radius: 4px; margin: 32px 0;
  border: 1px solid rgba(240,240,250,0.1);
  background: #0a0a0c;
  padding: 16px;
}

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 14px 32px;
  background: var(--ghost-bg);
  border: 1px solid var(--ghost-border);
  border-radius: 32px;
  color: var(--white);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-size: 12px; font-weight: 700;
  transition: background 0.3s, border-color 0.3s, transform 0.2s;
}
```

### 页面章节建议

1. **Hero** — 标题、副标题、一句话摘要（无 CTA 按钮，引导向下滚动）
2. **摘要** — 论文核心贡献
3. **核心概念** — 2-4 个关键概念卡片
4. **范式转换** — 新旧方法对比
5. **系统架构** — 架构图 + 组件说明
6. **核心算法** — 公式 + 解释
7. **工作流程** — 流程图 + 步骤详解
8. **实验设置** — 基准、基线、超参数
9. **实验结果** — 数据表格 + 图表
10. **边界与限制** — 适用范围、风险
11. **Footer** — CTA 按钮（阅读论文/查看代码）+ 相关链接

## 步骤 4：KaTeX 公式渲染

### 初始化脚本

```html
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", function() {
    // @ts-ignore
    renderMathInElement(document.body, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '\\[', right: '\\]', display: true},
        {left: '\\(', right: '\\)', display: false}
      ],
      throwOnError: false
    });
  });
</script>
```

### 公式语法

| 类型 | 语法 | 示例 |
|------|------|------|
| 独立公式 | `` {`$$...$$`} `` | `` {`$$d(i,j) = 1 - \\frac{z_i^\\top z_j}{\\|z_i\\|_2}$$`} `` |
| 行内公式 | `` {`\\(...\\)`} `` | `` {`\\(z_i \\in \\{0,1\\}^D\\)`} `` |

### ⚠️ 关键避坑

1. **必须用模板字面量包裹**：Astro 会把 `{}` 当作模板表达式解析，必须用 `` {`$$...$$`} `` 或 `` {`\\(...\\)`} `` 包裹
2. **反斜杠必须双写**：LaTeX 的 `\frac` 要写成 `\\frac`，`\mathcal` 写成 `\\mathcal`
3. **花括号必须转义**：`{0,1}` 写成 `\\{0,1\\}`
4. **`// @ts-ignore` 不可少**：`renderMathInElement` 是 CDN 加载的全局函数，TypeScript 不认识

## 步骤 5：OG 分享标签

```html
<meta name="description" content="..." />
<meta property="og:title" content="GEA — 群体进化智能体" />
<meta property="og:description" content="..." />
<meta property="og:image" content="https://www.theoku.com/gea-architecture-dark.png" />
<meta property="og:url" content="https://www.theoku.com/gea-cn/" />
<meta property="og:type" content="article" />
<meta property="og:locale" content="zh_CN" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="GEA — 群体进化智能体" />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="https://www.theoku.com/gea-architecture-dark.png" />
```

## 步骤 6：图片生成（baoyu-imagine）

### 配置

```bash
# 环境变量
export DASHSCOPE_API_KEY="sk-xxx"

# EXTEND.md (~/.baoyu-skills/baoyu-imagine/EXTEND.md)
---
default_provider: dashscope
default_quality: 2k
default_model:
  dashscope: qwen-image-2.0-pro
---
```

### 生成命令

```bash
npx -y bun ~/.agents/skills/baoyu-imagine/scripts/main.ts \
  --prompt "提示词" \
  --image 输出文件名.png \
  --size 1920*1080 \
  --provider dashscope \
  --model qwen-image-2.0-pro
```

### SpaceX 风格提示词模板

```
A clean, minimal technical [diagram type] on a pure black background.
[具体内容描述].
Style: SpaceX aesthetic - pure black background, thin spectral white lines (#f0f0fa),
Electric Blue accent, uppercase geometric sans-serif text with wide letter-spacing,
no shadows, no gradients, ultra-clean minimalist technical diagram,
aerospace engineering documentation style
```

### 推荐生成的图片

| 图片 | 提示词要点 |
|------|-----------|
| 架构图 | 三组件水平排列，箭头连接，标签 |
| 进化循环图 | 5 步环形排列，顺时针箭头 |
| 对比图 | 左右分栏，左侧树状隔离，右侧网状互联 |
| 数据图表 | 柱状图/折线图，深色背景，蓝/灰配色 |

### ⚠️ 关键避坑

1. **频率限制**：DashScope 有 RPM 限制，连续生成会触发 429 错误。每次生成间隔 30-45 秒
2. **白底问题**：AI 生成的图默认白底。不要用 `mix-blend-mode: multiply`（会把整张图变黑），改用深色容器包裹：
   ```css
   .arch-img {
     background: #0a0a0c;
     padding: 16px;
     border: 1px solid rgba(240,240,250,0.1);
   }
   ```
3. **图片命名**：加 `-dark` 后缀区分暗色版本，如 `gea-architecture-dark.png`
4. **静态资源目录**：图片放 `public/` 目录，Astro 构建时会自动复制

## 步骤 7：背景图片

使用 Unsplash 免费高清图库，直接外链：

```
https://images.unsplash.com/photo-{ID}?auto=format&fit=crop&w=1920&q=80
```

推荐太空/航天主题（搜索关键词：space, rocket, mars, nasa, telescope）。

## 完整避坑清单

### Astro 模板解析

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `{}` 被当作 JS 表达式 | Astro 模板语法 | 用 `` {`...`} `` 包裹 |
| `getElementById` 返回 null | TypeScript 严格检查 | 加 `if (!el) return;` 守卫 |
| CDN 全局函数报错 | TS 不认识全局变量 | 加 `// @ts-ignore` |
| `layout: false` 警告 | Astro 的 frontmatter 检查 | 忽略，不影响构建 |

### 图片相关

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 白底图片在暗色页面刺眼 | AI 生成默认白底 | 深色容器包裹 + 内边距 |
| `mix-blend-mode` 整图变黑 | multiply 混合模式对白色无效 | 改用 `background: #0a0a0c` 容器 |
| 429 频率限制 | DashScope RPM 限制 | 每次间隔 30-45 秒 |
| 401 API Key 无效 | Key 格式错误或未开通服务 | 确认 `sk-` 前缀，检查阿里云控制台 |

### 分享卡片

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 微信只显示 URL | 缺少 OG 标签 | 添加完整的 og:title/description/image/url |
| 分享图不显示 | 图片必须是绝对 URL | 用 `https://域名/图片路径` |
| 微信缓存旧图 | 微信有分享缓存 | 清除缓存或换测试链接 |

### 部署

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| Cloudflare 显示 Preview | 推送的是非 master 分支 | Preview 是正常的，合并到 master 后自动变 Production |
| `astro check` 报错但 `astro build` 正常 | TS 严格模式 vs 运行时 | 用 `// @ts-ignore` 处理 CDN 全局函数 |

## 文件清单

```
public/
  gea-architecture-dark.png    # 架构图
  gea-evolution-cycle-dark.png # 进化循环图
  gea-tree-vs-group-dark.png   # 对比图
  gea-benchmark-dark.png       # 数据图表
src/pages/
  gea-cn.astro                  # 主页面
DESIGN.md                       # SpaceX 设计系统
spacex/DESIGN.md                # 原始设计系统文件
```
