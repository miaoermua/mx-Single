# Single

Dreamer-Paul 的 Typecho 主题 Single 的 Mix Space 重写版，保留原版克制的排版与交互

[

miaoermua/mx-Single

Single theme for Mix Space — a Next.js rewrite of paugram.com.

](https://github.com/miaoermua/mx-Single)

## 概述

> **注意！**
>
> **Single 不是 Shiro 的社区分支**，它是 [paugram.com](https://paugram.com) 所用 Typecho 主题的独立重写，DOM 结构与 CSS 均按原主题复刻。
>
> **版本要求**：目前 Single **仅支持 Mix Space Core 12.x（API v2）**，不兼容 13.x / API v3。

基于 Next.js 14 App Router + React 18 重写的 Single 主题，数据层对接 Mix Space Core 的 `/api/v2`。视觉、class 名、评论嵌套、目录树、夜间模式等交互都对齐原版，同时补上了 Mix Space 生态的评论、点赞、阅读量、日记、说说、时间轴、友链自助申请等能力。

原主题的 PHP 源码保留在仓库 `legacy/` 目录，仅作视觉参考，不参与构建。

## 部署指南

### 前端部署

#### Vercel 一键部署（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmiaoermua%2Fmx-Single&env=MX_CORE_URL&envDescription=Mix%20Space%20Core%20%E5%9C%B0%E5%9D%80%EF%BC%8C%E4%B8%8D%E5%B8%A6%20%2Fapi%2Fv2&project-name=mx-single&repository-name=mx-single)

也可以手动导入：Vercel → **Add New → Project** → 选择仓库 → Framework Preset 自动识别为 Next.js（Build Command `npm run build`，Output Directory `.next`，其余保持默认）。

#### 环境变量说明

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `MX_CORE_URL` | ✅ | Mix Space Core 地址，如 `https://api.example.com`。**不要**带 `/api/v2` |
| `MX_API_PREFIX` | ❌ | API 前缀，默认 `/api/v2`，一般无需修改 |
| `MX_SSR_UA` | ❌ | SSR 请求 UA，默认 `mx-space-single-frontend/0.1.0`。**必须包含 `mx-space`**，否则会被 Core 的 SpiderGuard 拦截并返回 403 |
| `DOCKER_BUILD` | ❌ | 仅构建 Docker 镜像时设为 `1`，启用 `standalone` 输出。部署到 Vercel **不要**设置 |

> **注意！**
>
> `next.config.js` 中的 `rewrites()`（`/feed`、`/atom.xml`、`/sitemap.xml` 反代 Core）在**构建时**读取 `MX_CORE_URL`。修改该变量后必须重新部署（Redeploy），仅保存环境变量不会生效。

#### 其他方式部署

自建服务器：

```bash
git clone https://github.com/miaoermua/mx-Single.git
cd mx-Single
npm ci
npm run build
npm run start    # 默认 3000 端口，可用 PORT 覆盖
```

Docker 构建时传入 `DOCKER_BUILD=1` 以启用 `standalone` 输出。

### 后端配置

1. 在 Mix Space 后台进入 **其他 → 配置与云函数**
2. 新建一项：名称为 `single`，引用为 `theme`，数据类型为 `YAML`，公开为 `是`
3. 填入以下内容并按需修改

```yaml
name: single

# 站点图标（不填使用默认 /img/icon.png）
favicon:

# 站点背景：一张图片地址；填壁纸 API 即为随机背景
background: https://api.paugram.com/wallpaper?source=gt

# 自定义社交链接（首页 .home-social），不填则不输出
home_social:
  - title: GitHub
    url: https://github.com/Dreamer-Paul
    icon: fa-github
  - title: Bilibili
    url: https://space.bilibili.com/
    icon: fa-tv
  - title: 邮件
    url: mailto:i@example.com
    icon: fa-envelope

# 自定义样式表，注入在 single.css 之后
custom_css: |-
  body::before{mix-blend-mode:multiply}
  .dark-theme::before{opacity:.4}

# 统计代码，需要完整 <script> 标签，原样输出
custom_script: ''

# 作者信息，显示在文章底部 .author-info
author_text: ''

# 夜间模式：'0' 关闭 | '1' 22:00-5:00 自动 | '2' 始终
night_mode: '0'

# 复制提示：'0' 关闭 | '1' 开启
copy_notice: '1'

# 页尾信息栏（最新文章 / 最近评论 / 时光机）：'0' 关闭 | '1' 开启
widget_set: '1'

# 首页、归档页属性显示（每项一个开关）
# 可用键：show_category / show_tags / show_comments
archive_meta:
  - show_category: true
  - show_comments: true

# 文章页属性显示（原主题无 show_tags）
post_meta:
  - show_category: true
  - show_comments: true

# 随机背景增强：api 失败时回退 cdn
wallpaper:
  enabled: true
  source: api              # api | cdn | static
  fallback: cdn
  cdnList:
    - https://cdn.jsdelivr.net/gh/Dreamer-Paul/Anime-Wallpaper@master/{n}.jpg
  range: [1, 120]
  static_url: ''

# mx 新增页面的导航开关
nav_extra:
  archive: true
  notes: true
  says: true
  timeline: true
  friends: true

# ICP 备案号，显示在页脚 Single 右边，不填则不输出
beian:
```

> **注意！**
>
> `archive_meta` 与 `post_meta` 必须是**对象列表**（每项一个 `show_*` 布尔开关），不能写成裸字符串列表，否则前端解析不到开关状态。

配置保存后可通过以下接口自查是否生效：

```bash
curl "https://api.example.com/api/v2/aggregate?theme=single"
curl "https://api.example.com/api/v2/snippets/theme/single"
```

## 配置项说明

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `favicon` | string | `/img/icon.png` | 站点图标。当前版本页头图标仍为内置文件，此项预留给后续接入 |
| `background` | string | paugram 壁纸 API | 站点背景图地址，不填则显示纯色 |
| `home_social` | object[] | `[]` | 首页社交链接，每项含 `title` / `url` / `icon`，可选 `svg` 内联图标 |
| `custom_css` | string | `''` | 追加样式，输出在 `single.css` 之后 |
| `custom_script` | string | `''` | 追加脚本，需带 `<script>` 标签，原样输出 |
| `author_text` | string | `''` | 文章底部作者信息，支持 HTML |
| `night_mode` | `'0'\|'1'\|'2'` | `'0'` | 夜间模式：关闭 / 按时段自动 / 始终开启 |
| `copy_notice` | `'0'\|'1'` | `'1'` | 访客复制正文时是否提示版权 |
| `widget_set` | `'0'\|'1'` | `'1'` | 页尾三栏信息是否显示 |
| `archive_meta` | object[] | 分类 + 评论数 | 列表页显示的元信息开关 |
| `post_meta` | object[] | 分类 + 评论数 | 文章页显示的元信息开关 |
| `wallpaper` | object | 见上文 | 随机背景配置，支持 API 失败后回退 CDN 或固定图 |
| `nav_extra` | object | 全部 `true` | 归档 / 日记 / 说说 / 时间轴 / 友链的导航入口开关 |
| `beian` | string | `''` | ICP 备案号，不填则不输出 |

## 功能

- 文章、页面、分类、标签、归档、搜索
- 评论：嵌套回复、分页、审核提示、Markdown 渲染、外链自动转链接
- 点赞、阅读量上报（`/api/like`、`/api/ack`）
- 日记（notes）、说说（says）、时间轴（timeline）
- 友链页与自助申请
- Markdown 目录树、代码高亮、图片灯箱、链接卡片
- 夜间模式、复制提示、返回顶部、移动端抽屉目录

原主题没有、mx 版新增的能力见 [EXTRA_FEATURES.md](./EXTRA_FEATURES.md)。

## 预览

### 本地开发

```bash
git clone https://github.com/miaoermua/mx-Single.git
cd mx-Single
npm install
cp .env.example .env.local   # 填入 MX_CORE_URL
npm run dev
```

不配置 `MX_CORE_URL` 时，前端会使用内置 mock 数据，方便离线调整样式。

### 线上

- 主题作者站点：<https://paugram.com>

## 相关文档

- [部署与配置](./README.md)
- [Core 版本兼容性](./COMPATIBILITY.md)
- [额外功能清单](./EXTRA_FEATURES.md)
- [前端实现方案](./FRONTEND_PLAN.md)
