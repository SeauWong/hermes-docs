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

## 步骤 1.5：内容设计（Content Design）

> **核心原则：让读者理解，而不是让读者看到。**
> SpaceX 风格是纯黑背景上的摄影展。术语表、字典式附录、密密麻麻的参考链接——这些会像把 Excel 贴进美术馆。**溶解**而非**附加**。

### 1.5.1 面向实践者的认知路径

实践者读者关心的不是理论贡献，而是：
- **这能解决我的什么问题？**
- **我要怎么做才能用？**
- **代价是什么？**

页面章节应该服务于这个认知路径，而不是按论文结构线性搬运。推荐阅读顺序的认知目的：

| 章节 | 认知任务 | 不是… | 而是… |
|------|----------|-------|-------|
| Hero | Hook：一句话让人想往下看 | 标题 + 作者列表 | "这解决了 X，用 Y，效果是 Z" |
| 核心洞察 | "Aha moment" | 论文摘要的改写 | 白话：旧方法为什么不行 |
| 概念 | 建立心智模型 | 术语定义堆砌 | 2-4 个读者必须懂的直觉 |
| 架构 | 系统长什么样 | 组件说明书 | 数据怎么流动 |
| 算法 | 怎么工作的 | 公式列表 | 每个公式的"所以呢" |
| 案例 | 具体跑一次会怎样 | 伪代码 | "想象你在做这件事…" |
| 结果 | 数据 | 表格搬运 | "你应该看哪里" + 关键结论 |
| 边界 | 什么时候会失效 | 免责声明 | 哪些假设被违背就崩 |

### 1.5.2 术语溶解（Dissolution）

**不要**做术语表。**做**以下三件事：

1. **首次出现时 inline 解释**——不需要提前给读者上一堂课。
   ```
   ✅ "Archive（档案库）——存储进化过程中发现的所有智能体。"
   ❌ "术语表：Archive —— 进化过程中发现的所有智能体的集合。"
   ```

2. **用口语化白话，不是定义体**：
   ```
   ✅ "余弦距离：越大表示两个智能体的能力分布越不同"
   ❌ "余弦距离：衡量两个向量夹角大小的度量，范围 [0, 2]"
   ```

3. **最多 12 个字的解释**——超过就拆成自己的章节，用一整屏摄影背景 + 一个概念的方式讲。

**只解释"不解释就读不懂"的术语**——区分"领域读者"和"实践者读者"，取交集。

### 1.5.3 关键洞察专节（The "Aha Moment"）

在 Hero 之后、概念之前，增加一个 **关键洞察** 章节：

```html
<section class="section" style="background-image: url('...');">
  <h3>核心洞察</h3>
  <p style="font-size: clamp(20px, 3vw, 32px); max-width: 900px;">
    用一句话说清楚：旧方法的根本缺陷是什么？这篇论文发现了什么别人没看到的东西？
  </p>
  <p style="max-width: 800px;">
    展开 2-3 句：为什么这个洞察重要？它解决了什么旧方法本质上无法解决的问题？
  </p>
</section>
```

这一节应该是一整屏摄影背景上的 1-2 段话——cinematic，像 SpaceX 官网上一句 "MAKING LIFE MULTIPLANETARY" 一样有冲击力。

### 1.5.4 公式的渐进式解释

SKILL.md 的 KaTeX 步骤教了**怎么渲染公式**，但公式的**内容设计**需要遵循：

**四步结构**（每步不超过一行）：

| 步骤 | 内容 | 示例（GEA cosine distance） |
|------|------|---------------------------|
| 1. 直觉 | 白话：这个公式在干什么 | "衡量两个智能体能力分布的差异" |
| 2. 公式 | LaTeX 渲染 | `$$d(i,j) = 1 - \frac{z_i^T z_j}{\|z_i\|_2 \|z_j\|_2 + \varepsilon}$$` |
| 3. 变量 | 关键变量一句话含义 | "z 是任务成功向量，越大越不同" |
| 4. 为什么 | 为什么是这个形式 | "用余弦而非欧氏，因为关注方向（能力类型）而非幅度（任务数量）" |

### 1.5.5 案例 Walk-through

SKILL.md 提取了"案例研究"但没给页面结构。加一个 **案例** 章节：

```html
<section class="section" id="case-study" style="background-image: url('...');">
  <h2>实战走一遍</h2>
  <p>假设你现在要为一个具体的场景（如：用 GEA 改进一个代码修复 agent）运行这个系统……</p>
  <ol class="step-list">
    <li><strong>初始化</strong>：你准备了 K=2 个初始 agent，它们的系统提示是……</li>
    <li><strong>第一轮进化</strong>：它们各自跑了任务，产生了这些补丁……</li>
    <li><strong>经验共享</strong>：这些补丁被聚合到共享池，子代 agent 看到了……</li>
    <li><strong>结果</strong>：经过 N 轮后，top agent 学会了……</li>
  </ol>
</section>
```

### 1.5.6 结果解读（"So What?"）

不要只搬表格。告诉读者**应该看哪里**：

```
✅ "SWE-bench 上 GEA 达到 71.0%，比 DGM 的 56.7% 高出 14.3 个百分点——
    这相当于之前需要手动优化的系统才能达到的水平，现在自动达到了。"
❌ "SWE-bench: GEA 71.0%, DGM 56.7%"
```

每个表格/图表配一段解读：
- **哪个数字最重要**？（不是最大的，是最有意义的）
- **这意味着什么**？（对实践者的影响）
- **统计显著吗**？（方差、置信区间、如果论文提供了的话）

### 1.5.7 边界与限制（深度版）

现有 3 张卡片太浅。补充以下维度：

| 维度 | 内容 |
|------|------|
| **失效条件** | 什么情况下系统会退化或崩溃？ |
| **隐含假设** | 哪些假设如果被违背，整个方案就不成立？ |
| **失败模式** | 已知会出问题的场景？（不是"未来可能"，是"已经发现"） |
| **适用范围** | 这个设计决策在什么规模/领域/约束下最优？ |

用与现有边界章节相同的卡片风格——不引入新组件，保持视觉一致性。

### 1.5.8 美感检查清单

内容补充后，逐项确认：

- [ ] 没有引入表格形式的术语表/附录/参考
- [ ] 所有文字都是 left-aligned text block on photography pattern
- [ ] 没有引入卡片/面板/容器之外的新视觉元素
- [ ] 每个新章节都是一整屏摄影背景 + 文字
- [ ] 颜色仍是黑 + 光谱白，无新颜色
- [ ] 字体/字间距/大写遵循 DESIGN.md
- [ ] 每个新增概念都有 inline 白话解释
- [ ] 公式有"直觉 → 公式 → 变量 → 为什么"四步

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
