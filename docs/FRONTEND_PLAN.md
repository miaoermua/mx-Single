# Single 主题 × Mix Space 前端适配：实施方案

> 配套文档：[`COMPATIBILITY.md`](./COMPATIBILITY.md)（兼容性表单 v2）
> 本文只解决一件事：**在「mx 特性优先 + 视觉完全一致 + 实现可以大胆魔改」三条约束下，怎么把这套 Typecho PHP 主题变成 mx 前端。**

---

## 1. 目标与验收口径

### 1.1 三条约束的转换

| 约束 | 工程含义 | 验收方式 |
| --- | --- | --- |
| **P0 样式完全一致** | 浏览器最终渲染结果与 <https://paugram.com> 一致 | 逐页面视觉 diff（第 12 节清单） |
| **P1 mx 实现优先** | 友链、归档、日记、说说、时间轴、搜索、订阅、点赞等用 core 原生数据落地 | 接口调用清单 + 功能冒烟 |
| **P2 实现可大胆魔改** | DOM / class / 脚本 / 框架 / 渲染方式不受原主题约束 | 不设「代码结构一致性」检查 |

**关键取舍**：P0 靠**逐字节复用样式表**保证，P1 靠**组件内的数据源**保证，P2 允许把 PHP 模板、jQuery 式脚本、Typecho Widget 全部丢掉。三者不冲突——CSS 是稳定契约，DOM 只是生成这些 class 的载体。

### 1.2 视觉基线（已实测）

| 资源 | 处置 | 证据 |
| --- | --- | --- |
| `static/kico.css`（1472 行） | **逐字节复制**，线上 SHA-256 与仓库完全一致 | `COMPATIBILITY.md` 第 3 节 |
| `static/single.css`（940 行） | **逐字节复制 + 补 5 行** `.comment-list .comment-single:after{content:"";clear:both;display:block;}` | 线上 945 行，diff 仅此一处 |
| `static/single.js`（190 行） | **不复制**，作为「行为规格」逐条重写为 React effects | 线上同版 |
| `static/kico.js`（417 行） | **不复制**，只保留「灯箱 + notice + 平滑滚动」三个行为 | 线上同版 |
| `static/prism.js`（Prism 1.21.0，98 KB） | 可原样保留，或换 `prismjs` npm 包 + 同款 token 配色 | `single.css:920-940` 已含 token 样式 |
| `img/icon.png`、`img/404.png` | 原样复制 | `header.php:15`、`404.php:9` |
| Font Awesome **4.7.0** | 锁定版本（CDN 或自托管），**不可升 5/6** | 20+ 处 `content:"\fXXX"` 依赖 4.x 码位 |

**加载顺序（不可调换）**：`kico.css` → `single.css` → Font Awesome → `<style>`(背景图) → `<style>`(custom_css)。任何 CSS 框架的 preflight 都不许插到 `kico.css` 之前。

---

## 2. 技术选型

### 2.1 三个方案

| | 方案 A（**推荐**）新建轻量 Next.js + 按需移植 my-kami 逻辑模块 | 方案 B 以 my-kami 为底座换视图层 | 方案 C 在 my-kami 上叠 Single CSS 覆盖 |
| --- | --- | --- | --- |
| 做法 | 新起 App Router 项目，样式直接用 Single CSS；从 `my-kami` **拷贝** `utils/client.ts`、`atoms/collections` 评论/文章状态机、`ui/Markdown` 渲染器、配置合并链路 | 保留 my-kami 全部 19 路由与逻辑层，替换 `layouts`/`pages` 的 JSX、清空 6 个全局 CSS、移除 WindiCSS、冻结 i18n | 保留 my-kami 原样，追加 Single CSS 覆盖 |
| P0 样式一致 | **高**：DOM 从零按 Single 版式生成，无历史样式干扰 | 中：需先彻底拆除 WindiCSS 与 `#write` 体系 | **低**：两套全局裸标签规则必然打架 |
| P1 mx 特性 | **高**：需要的特性逐个接，不背 19 路由包袱 | 最高：现有特性全在 | 高，但视觉不可控 |
| 存量负担 | 无 | 350 个 `src` 文件、24691 行 tsx、55 个 CSS（49 modules，33 个含 165 处 `@apply`）、81 个文件引用 i18n、82 个依赖 | 同上，且冲突更多 |
| 主要工作 | 12 个路由 + 数据层 + 评论/Markdown 组件移植 | 视图层全量重写 + 三层样式拆除 + i18n 决策 | 无止境的 specificity 修补 |
| 长期风险 | 低 | my-kami README 自述「Compatible Plan / Sunsetting / 推荐 Shiro」，且为第三方 fork 链 | 高 |

**方案 C 直接排除**：`my-kami` 的 `theme.css`、`shizuku.css`、`extra.css` 共约 1200 行全局裸标签规则（含 `html/body/h1..h6/article img/:not(pre)>code/blockquote/table`）与 `kico.css` 的 reset 正面冲突，叠加覆盖不可控。

### 2.2 为什么推荐 A 而不是 B

B 看似「省了 mx 实现」，但它有价值的部分其实只有**可移植的独立模块**（api-client 封装、评论状态机、Markdown 渲染器、Snippet 配置合并），这些在 A 里照样能整包拷过来。而 B 要付的代价是：

- 移除 WindiCSS 后，33 个含 `@apply` 的 CSS 文件（165 处）编译失败、73 个 tsx 的原子类 className 失去样式；
- 49 个 CSS Modules 的 `styles['foo']` 与 Single 的全局字面类名机制不兼容；
- 81 个文件引用 `useTranslations`，`[locale]` 路由段与 middleware 需要决策；
- `ArticleLayout` 的 framer-motion 动画包裹会破坏 `.post-item:nth-child(n)` 逐条淡入的时序；
- 私有外部资源需替换：Prism CDN `static.miaoer.net`、字体 `fonts.loli.net`、OperatorMono。

**本质**：无论 A 还是 B，视图层都要按 Single 重写一遍。B 多出来的只是「拆除存量」这一步。因此当目标是「视觉一致 + mx 特性按需落地」时，A 更短。

> **何时改选 B**：如果后续确定要把 my-kami 的音乐 / 追番 / 项目 / AI 摘要 / 多语言全套保留，B 的 19 个既有路由就变成净收益，此时值得付拆除成本。

### 2.3 框架与依赖（方案 A）

| 项 | 选择 | 理由 |
| --- | --- | --- |
| 框架 | **Next.js App Router + SSR** | 官方建议带 SSR（`D:src/dev/frontend.md:38-48`）；SSR 才能读 cookie 输出 `dark-theme` 防闪屏、注入 SEO/OG、保证首屏列表动画时序 |
| 数据层 | `@mx-space/api-client` **4.4.0**（已定案 v12.x，与 my-kami 同代） | 自动把 HTTP 的 snake_case 转 camelCase |
| Markdown | `marked`（与 core 同款解析器）+ `prismjs` | 保证 Markdown 扩展语法与后端一致；token 配色已在 `single.css` |
| 样式 | **纯全局 CSS，零 CSS 框架** | 不引 Tailwind / WindiCSS / CSS Modules / CSS-in-JS |
| 状态 | 轻量：URL 状态 + 少量 React Context（主题、登录态） | 无需 zustand/swr 全家桶；需要时再引 |
| 部署 | standalone Node 或 Docker；`/feed`、`/atom.xml`、`/sitemap` 反代 core | 见第 6 节 |

---

## 3. 目录结构（已定案：直接覆盖 Single 根目录，旧主题挪入 `legacy/`）

> 2026-11-05 用户决定：不做 `web/` 子目录，**新前端直接占据 `Single/` 根目录**；旧 Typecho 主题（12 个 PHP 模板 + `static/` + `img/` + `functions.php` 等）整体挪进 `legacy/` 文件夹做只读参考。`docs/` 两篇文档保留原位。视觉基线从 `legacy/static/` **复制**（不是引用）到 `styles/`。

```
Single/
├── docs/                       # 本次交付的两篇文档（保留原位）
├── legacy/                     # 旧 Typecho 主题整体挪入，只读参考
│   ├── *.php                   # index/post/page/archive/tags/comments/header/footer/404/custom/functions
│   ├── static/                 # kico.css / single.css / single.js / kico.js / prism.js（视觉基线）
│   └── img/                    # icon.png / 404.png
├── app/                        # Next.js App Router（新前端）
│   ├── layout.tsx              # <html><body class?><Header/><Footer/> + 全局样式引入
│   ├── page.tsx                # 首页 index.php
│   ├── posts/page.tsx          # 文章列表
│   ├── posts/[category]/[slug]/page.tsx   # 文章详情 post.php
│   ├── pages/[slug]/page.tsx              # 独立页面 page.php
│   ├── category/[slug]/page.tsx           # 分类 archive.php
│   ├── tag/[name]/page.tsx                # 标签 archive.php
│   ├── search/page.tsx                    # 搜索结果 archive.php
│   ├── archive/page.tsx                   # 归档（线上完整版）
│   ├── friends/page.tsx                   # 友链（线上完整版）
│   ├── notes/[nid]/page.tsx               # 日记（mx 特性）
│   ├── says/page.tsx  ·  timeline/page.tsx · recently/page.tsx
│   ├── not-found.tsx                      # 404.php
│   └── feed/ · sitemap/                   # 反代 core 根路径
├── components/
│   ├── layout/{Header,Footer,BackToTop,ArticleTree}.tsx
│   ├── post/{PostItem,PostMeta,PostNear,PostTags,PostAuthor}.tsx
│   ├── comment/{CommentList,CommentForm,CommentItem}.tsx
│   ├── content/{Markdown,CodeBlock,Lightbox}.tsx
│   ├── friends/{FriendCard,FriendGroup,ApplyForm}.tsx
│   └── archive/{ArchivesHead,ArchivesList}.tsx
├── styles/
│   ├── kico.css                # 从 legacy/static/ 逐字节复制
│   ├── single.css              # 从 legacy/static/ 逐字节复制 + 5 行 clearfix
│   └── custom.css              # 线上友链页 / 归档页的内联 <style> 提取成独立文件
├── lib/
│   ├── api/                    # api-client 封装、v12.x 数据适配（见第 5 节）
│   ├── theme-config.ts         # Snippet 主题配置读取与默认值合并
│   ├── markdown.ts             # marked + Prism + TOC + 外链 + 图片
│   └── wallpaper.ts            # 随机背景图（见第 10 节）
└── public/{img,fonts,vendor}   # icon.png / 404.png / prism.js / font-awesome 4.7
```

---

## 4. 从 PHP 模板到 React 组件：DOM 契约表

P0 的落地关键。**组件内部怎么实现随意，但必须产出右列的 class 树**，否则样式表不生效。

| 源模板 | 组件 | 必须产出的 DOM / class |
| --- | --- | --- |
| `header.php` | `Header` | `<header>` > `.head-title>h4`、`.head-action>(.toggle-btn,.light-btn,.search-btn)`、`form.head-search>input[name=s]`、`nav.head-menu > a` 与 `.has-child > a + .sub-menu > a` |
| `index.php` | `HomePage` | `main > .wrap.min > section.home-title > h1 + span + .home-social`；`section.home-posts > .post-item*`（`h2>a`、`p`、`.post-meta > time.date / span.category / span.tags / span.comments`）；`section.page-navigator > span` |
| `post.php` | `PostPage` | `section.post-title > h2 + .post-meta`；`article.post-content`（内部为 Markdown 渲染结果）；`section.post-near > ul>li*2`；`section.post-tags`；`section.post-author > figure.author-avatar + .author-info`；`section#comments.post-comments` |
| `page.php` | `PagePage` | `section.page-title > h2`；`article.page-content`（特殊页加 `.is-special`） |
| `archive.php` | `ArchivePage` | `section.home-title > h1`（各类型标题文案）+ `section.home-posts` 同首页；无结果时输出「没有找到结果 (QWQ)」 |
| `tags.php` | `TagsPage` | `section.page-title` + `section.page-content > .tags-list > a*` |
| `comments.php` | `Comment*` | `section.post-comments > h3`；`.comment-form`；`.comment-list > .comment-single[.comment-child] > img.avatar + .comment-meta(.comment-author,.comment-time,.comment-reply) + p.comment-content`；`div.page-navigator` |
| `footer.php` | `Footer` | `footer > .buttons > button.to-top`（+ 动态 `.toggle-list`）；`.wrap.min > section.widget > .row > .col-m-4*3`（`h3.title-recent/.title-date/.title-comments` + `ul>li`）；`section.sub-footer > p` |
| `404.php` | `NotFound` | `main > .wrap > .error-page > h1 + p + img` |
| 线上 `/friends` | `FriendsPage` | `section.page-title` + `article.page-content.is-special`；分组 `<h1>`；`.row > .col-6.col-m-4 > a.link-friend > img + h4 + p` |
| 线上 `/archive` | `ArchiveIndexPage` | `section.page-title` + `article.page-content`；`.archives-head > a*`；分组 `<h1>` + `ul.archives-list > li > a + span.date` |
| `single.js:tree()` | `ArticleTree` | `body.has-trees`；`section.article-list > h4>span.title` + `a.item-{1..6}[href=#title-N]`；`footer .buttons > button.toggle-list`；正文标题 `id="title-{index}"` |

> **线上友链/归档页的内联 `<style>`** 建议提取成 `styles/custom.css`（`.link-friend`、`.archives-head`、`.archives-list` 三组规则），不要在每个页面里重复内联；这也是 P2 允许的「实现不同」。

### 4.1 脚本行为逐条重写（行为规格来自 `single.js`）

| 原行为 | 证据 | React 实现 | 验收点 |
| --- | --- | --- | --- |
| 菜单折叠 | `:21-23` | `Header` 的 `useState` 切换 `.head-menu.active` | 移动端 <600px 展开高度 18rem |
| 夜间切换 + cookie `night`（max-age 21600） | `:36-45` | Context + `document.cookie` + `body.classList` | 刷新不闪屏；SSR 已按 cookie 输出 class |
| 22:00–05:00 自动夜间；无 cookie 才生效 | `:159-174` | 客户端 effect，读 `night_mode` 配置 | 「始终」模式常暗、「关闭」模式不自动 |
| 搜索框展开 | `:27-32` | `useState` 切 `.head-search.active`；提交走 `/search` | 输入框宽度 10em、圆角 3em 不变 |
| 目录树生成 | `:48-106` | `ArticleTree` 从 Markdown 渲染结果取 `h1~h6`，算 `firstLevel`，输出 `.item-N` 与 `title-{index}` | 桌面 ≥800px 贴右 15em 且 `body` 让出 margin；<800px 为底部抽屉 |
| 外链 `target=_blank` | `:109-119` | Markdown 的 `a` 渲染器统一处理 | 站内链接不加 target |
| 图片灯箱 | `:185` + `kico.js:165-244` | `Lightbox` 组件（点击放大、左右切换、loading） | 只对 `.post-content:not(.is-special) img` 生效 |
| 复制提示 | `:177-181` | `document.oncopy` effect + 自定义 toast | 视觉对齐 Kico `.ks-notice.yellow` |
| 返回顶部 | `:136-156` | scroll listener + `.to-top.active` | 滚动过半屏出现、平滑回顶 |
| 评论 @ 引用高亮 | `:121-133` | `CommentItem` 的 `onMouseEnter/Leave` | 目标 `.comment-single.active` 放大 1.05 |
| 平滑滚动 | `kico.css:61-63` | CSS 原生 `scroll-behavior:smooth` | `prefers-reduced-motion` 下关闭 |

**SPA 陷阱（必须处理）**：原脚本是「页面加载时执行一次」的全局构造器。React 里所有 effect 必须在**路由变更 / 正文内容就绪后重新绑定**，并在卸载时清理 `scroll` / `oncopy` 监听，否则会出现菜单按钮失效、灯箱不响应、监听重复叠加。建议用一个 `<SingleRuntime>` 客户端组件挂在 `layout.tsx`，以 `usePathname()` 作为 effect 依赖。

---

## 5. 数据层（已定案：v12.x 单分支，`/api/v2` + SDK 4.4.0）

### 5.1 请求基址与响应规范

| 项 | 规则（v12.x） | 证据 |
| --- | --- | --- |
| 前缀 | 生产由 `@ApiController` 拼接 `/api/v2`；**开发环境为空串** | `C:common/decorators/api-controller.decorator.ts` |
| HTTP 字段 | **snake_case**（全局拦截器递归转换）；用 SDK 4.4.0 自动转 camelCase；**自己 fetch 必须按 snake_case 读** | `C:common/interceptors/json-transform.interceptor.ts` |
| 响应信封 | 对象原样 / 数组包 `{data}`（v12.x 形态，无统一信封） | `COMPATIBILITY.md` 第 11 节左列 |
| 分页 | 顶层 `pagination` 六字段 | 同上 |
| 时间/计数 | `created/modified`、`count.read/like`（**不是** `createdAt/readCount`） | 同上 |
| 正文 | `text`（Markdown 原文），无 Lexical | 同上 |
| 公开/私有 | 按 `@Auth()` 装饰器划分，**不是按路由前缀**；`/options`、`/config` 私有 | `C:common/decorators/auth.decorator.ts` |
| 爬虫守卫 | 生产会拦截含 `axios` 且不含 `mx-space` 的 UA —— **SSR 请求务必设置自定义 UA** | `C:common/guards/spider.guard.ts` |
| 缓存 | 游客 GET 默认 15 秒 Redis 缓存；实时性要求高可加 `ts` 参数绕过 | `C:common/interceptors/cache.interceptor.ts` |

**仍要写 `lib/api/adapter.ts`**，但只做一件事：把「信封拆包、分页字段、时间/计数字段、评论树 `children` 嵌套」整理成统一 camelCase 模型。v13+/v16 差异（统一信封、`meta.pagination`、thread 评论树、Lexical）**不实现**，留档在 `COMPATIBILITY.md` 第 11 节右列，日后升级 core 再补。

### 5.2 站点初始化数据（SSR 一次拿齐）

```
GET /api/v2/aggregate?theme=single   → user, seo, url(去 adminUrl), theme, categories, pageMeta（v12.x 聚合根已含分类与页面，一次拿齐）
GET /api/v2/categories?type=tag     → 标签云（tags 页）
```

`theme` 来自 core Snippet（`reference='theme'`、公开），承载 Single 的 11 项主题配置。

### 5.3 主题配置迁移表（`functions.php` 全部 11 项 + 新增）

| 配置项 | 默认值 | 落点 | 实现 |
| --- | --- | --- | --- |
| `favicon` | `img/icon.png` 192×192 | Snippet | SSR 输出 `<link rel="icon" sizes="192x192">` |
| `background` | 空（纯色） | Snippet | **填随机壁纸 API**，见第 10 节 |
| `home_social` | 空 | Snippet | 原为**原始 HTML**；改成结构化数组 `{title,url,icon,svg?}`，组件渲染出 `<a><i class="fa fa-xxx">` 或内联 SVG |
| `custom_css` | 空 | Snippet | SSR `<style>`，顺序在 `single.css` 之后 |
| `custom_script` | 空 | Snippet | 客户端注入；需 CSP 与消毒策略 |
| `author_text` | 空 | Snippet | 作者名从 `aggregate.user.name` 取 |
| `night_mode` | `1`（按时） | Snippet | SSR 读 cookie + 客户端时间段判定 |
| `copy_notice` | `1` | Snippet | 控制 `document.oncopy` |
| `widget_set` | `0` | Snippet | 线上版建议设 `1` |
| `archive_meta` | 分类 + 评论数 | Snippet | 控制 `.post-meta` 三个 span |
| `post_meta` | 分类 + 评论数 | Snippet | 同上 |
| **新增** `wallpaper` | — | Snippet | `{enabled, source, fallback, cdnList[]}`，见第 10 节 |
| **新增** `nav_extra` | — | Snippet | 归档 / 日记 / 说说等 mx 新页面的菜单开关 |
| **新增** `beian` | 空 | Snippet | ICP 备案号（额外实现），见 `docs/EXTRA_FEATURES.md` |

---

## 6. 路由表

| 路径 | 来源 | 数据源 | 版式 |
| --- | --- | --- | --- |
| `/` | 开源 + 线上 | `posts` 列表 + `aggregate` | `index.php` |
| `/posts` | mx 约定 | `posts` | `archive.php` 列表 |
| `/posts/:category/:slug` | mx 约定（强制） | `posts/:category/:slug` | `post.php` |
| `/{category}/{slug}.html` | 线上旧链 | 301 → 上行 | — |
| `/pages/:slug` | mx 约定（强制） | `pages/slug/:slug` | `page.php` |
| `/about`、`/friends` | 线上 | Page / **Link** | `page.php` / 友链版式 |
| `/category/:slug` | mx 建议 | `categories/:query` | `archive.php` |
| `/tag/:name` | 开源 `tags.php` | `categories/:query?tag=true` | `archive.php` |
| `/search` | 顶栏搜索框 | `search/post?keyword=` | `archive.php` |
| `/archive` | **线上完整版** | `timeline` + `posts` + `categories` | 归档版式 |
| `/tags` | 开源 | `categories?type=tag` | `tags.php` |
| `/notes/:nid` | mx 约定（强制） | `notes/nid/:nid` | 复用 `post.php` |
| `/notes`、`/says`、`/recently`、`/timeline` | mx 特性 | 对应模块 | 复用 `home-posts` / `page-title` |
| `/feed`、`/atom.xml`、`/sitemap` | mx + 2022 文档 | **反代 core 根路径 XML** | 不渲染 |
| `/404` | 开源 | — | `404.php` |

> **反代 RSS 的价值**：core 的 `/feed`、`/atom.xml`、`/sitemap` 是**根路径、不带 `/api/vN` 前缀**的裸 XML（v12 `@Bypass` / v16 `@RawResponse`），不经过响应信封。直接反代既回归了 2022 文档「`/feed` 为前端强制路由」的设计意图，也绕开了 my-kami 自建 API Route 里已确认的两处缺陷（时间字段 `createdAt`/`modifiedAt` 实为 `created`/`modified`；v13+ 未拆 `{data}` 信封导致 `data.map` 抛错）。

---

## 7. 正文渲染管线（P0 风险最高的一处）

Typecho 的 `$this->content()` 输出**已渲染的 HTML**；mx 的 `post.text` 是 **Markdown 原文**（v12.x 已定案，无 Lexical）。管线必须产出与原主题一致形状的 DOM：

```
text (markdown)
  → 解析（marked，与 core 同款）
  → 规范化 AST/HTML：
      h1~h6          加 id="title-{index}"（供目录树与 scroll-margin-top:5em）
      pre>code       加 class="language-xxx"；Prism 高亮产出 .token.*
      img            保留 src，交给 Lightbox；暗色由 CSS 统一 brightness(60%)
      a              站外加 target=_blank rel=noreferrer
      blockquote/table/ul/ol/hr/em   保持原生标签（single.css / kico.css 已定义）
  → 注入 <article class="post-content">（页面用 .page-content）
  → 客户端：Prism.highlightAll → TOC 扫描 → Lightbox 绑定
```

**必须复刻的细节**：`article h1/h2/h3::before{content:"#"}`、`h1/h2/h3{margin-top:3rem;scroll-margin-top:5em}`、`pre` 的斑马纹渐变、`blockquote` 蓝边、暗色下 `:not(pre)>code` 红字。这些都在 `single.css:90-115,541-561`，只要标签形状对就自动生效。

**TOC 无后端接口**（core 全仓零命中），必须前端生成；生成规则照抄 `single.js:48-106`：统计各级标题数得出 `firstLevel`，`level = tagLevel - firstLevel + 1`，输出 `.item-N`，并给 `body` 加 `has-trees`。

**文本宏 `[[ ]]`** 在服务端替换（`textOptions.macros`）。若前端自渲染，需二选一：调用 `GET /api/vN/markdown/render/structure/:id` 拿后端渲染结果（会引入其固定 CDN 脚本与主题 CSS，**不推荐**，可能破坏 P0），或在管线里做同样的宏替换。

### 7.1 链接卡片 LinkCard（**额外实现，非 Single 标准**，2026-11-05 已落地）

> kami 扩展能力移植：原 Single（Typecho 主题）正文内链接就是普通 `<a>`，没有卡片能力。以下全部为新增实现，与 P0 视觉基线无关。

**语法（与 kami KamiMarkdown 对齐）**：`[^N]: URL` 定义卡片，`[^N]` 在正文引用处渲染卡片。自动识别两种：`notes/{nid}`、`posts/{分类}/{slug}` 走 self；其他 http/https 走 external。gh 源不自动识别，仅支持 `<LinkCard id="owner/repo" source="gh" />` 手动组件用法（与 kami 一致）。代码围栏内的定义与引用不处理。

**实现（SSR 直出，与第 2.1 节纯 SSR 架构一致）**：

| 文件 | 职责 |
| --- | --- |
| `lib/link-cards.ts` | `extractFootnoteCards`（定义抽取 + 引用替换为占位注释）+ `resolveLinkCards`（self→core API、gh→GitHub API、external→`fetchLinkMetadata`，并发 + 6s 超时，单卡失败返回 null 降级） |
| `lib/link-preview.ts` | 外链 og metadata 抓取（平移 kami `pages/api/link-preview.tsx`：5s 超时 + SSRF 防护），供 SSR 预取与 API 路由共用 |
| `app/api/link-preview/route.ts` | `GET /api/link-preview?url=` 薄封装（App Router route handler，nodejs runtime） |
| `lib/markdown.ts` | `renderMarkdownSegments`：占位注释经 marked html block 透传后 split 成 `html/card` 分段数组；无卡片时单段输出，行为与 `renderMarkdown` 完全一致（TOC/Prism/Lightbox 均不受影响） |
| `components/content/LinkCard.tsx` | 展示组件，props 对齐 kami `LinkCardProps` + `data`（SSR 预取结果）；`data` 为 null 时降级为朴素链接卡（可点击、无图） |
| `styles/link-card.css` | 卡片样式（`link-card` 前缀类名）。kami 版 WindiCSS `@apply` 已展开为原生 CSS，暗色选择器 `html.dark` 已改 `body.dark-theme`。**独立文件，未修改 kico.css / single.css**，符合 2.3「零 CSS Modules」选型 |

**与 kami 的差异**：kami 在客户端进入视口后才 fetch（懒加载 + 骨架屏）；本工程 SSR 阶段预取完毕直出，无客户端 JS、SEO 完整，外链抓取失败的卡片降级为朴素链接卡不阻塞整页。接入点为 post 详情页 `app/posts/[category]/[slug]/page.tsx`（正文分段渲染）。

---

## 8. 评论实现要点

- 读取：`GET /api/v2/comments/ref/:id?page=&size=&ref=posts`；写入：`POST /comments/guest/:id` 或 `/reader/:id`，回复 `/guest/reply/:id`、`/reader/reply/:id`（SDK 4.4.0 方法名 `guestComment/guestReply/readerComment/readerReply`）。
- 建树：v12.x 用 `children` 嵌套（≤10 层），在适配层转成 `{id,parent,children}` 结构，组件只递归渲染 `.comment-single[.comment-child]`。
- 头像：直接用后端 `avatar` 字段。游客响应会删 `mail`，**不要**在前端按 QQ 邮箱推导头像（原 `comments.php:14-20` 的逻辑作废）。
- 状态：`allowComment` / `commentOptions.disableComment` 控制表单；提交成功后本地提示「你的评论正等待审核」（后端审核开启时访客看不到待审项）。
- 表单校验：`author ≤ 20`、`text ≤ 500`、`mail` 必填且为合法邮箱、`url` 可选但需带协议；`remember()` 用 localStorage。
- 锚点：保留 `#comment-{id}`，供 `.comment-content [href^='#comment']` 的 hover 高亮（`.comment-single.active{transform:scale(1.05)}`）。

---

## 9. mx 特性落地清单（P1）

| 批次 | 特性 | 落点 | 数据接口 |
| --- | --- | --- | --- |
| 第一批（必须） | 友链 + 自助申请 | `/friends`，`.link-friend` 卡片 + 分组 `<h1>` | `GET /links/all`、`GET/POST /links/audit` |
| 第一批（必须） | 归档 | `/archive`，`.archives-head` + `.archives-list` | `GET /aggregate/timeline?type=post`、`GET /categories`、`GET /posts?year=` |
| 第一批（必须） | 搜索、RSS、Sitemap | 顶栏 / 反代 | `/search/post`、核心根路径 |
| 第一批（必须） | 主题配置云端化 | 全站 11+2 项 | `GET /aggregate?theme=single`、`GET /snippets/theme/:name`（公开） |
| 第二批 | 日记 Note、说说 Say、动态 Recently、时间轴 | 复用 `post.php` / `home-posts` 版式 | `/notes/nid/:nid`、`/says`、`/recently`、`/aggregate/timeline` |
| 第二批 | 点赞 / 阅读数 | `.post-meta .view`（V10）、文章底部 | `POST /activity/like`、`POST /ack` |
| 待做（第一期不做） | 订阅按钮、AI 摘要 | 文章底部 | `POST /subscribe`、`GET /ai/summaries/article/:id` |
| 待做（第一期不做） | 悄悄话标记、博主角标 | 评论区 | `isWhispers`、`author === owner.name` |
| 待做（第一期不做） | Socket.IO 实时通知 | 非视觉 | v12 `/web` |
| 待做（第一期不做） | 音乐 / 追番 / 项目 / 收藏 | 版式无承载位 | — |

> **2026-11-05 用户决定**：订阅、AI 摘要、Socket.IO、音乐/追番/项目/收藏等原主题没有的功能，第一期不做，统一写成待做任务清单（见第 14 节）。第一期只做视觉一致 + 必须落地的 mx 特性（友链、归档、搜索、RSS、配置云端化、日记、说说、时间轴、点赞/阅读数）。

**友链页比 PHP 版更好的地方**：线上靠「评论区留言」申请友链，mx 有原生 `POST /links/audit` 自助申请；分组可用 `LinkModel.type` 或 Snippet 自定义分组；`avatar/description` 直接渲染卡片，不必手写 HTML。

**归档页**：`.archives-head` 的分类计数直接取 `categories[].count`；列表按分类分组，日期用 `YY-MM-DD`（线上 `26-10-13`）；按月归档链接改为 `/archive?month=YYYY-MM`（core 无按月资源，URL 形状变化不影响视觉）。

---

## 10. 随机背景图实现

### 10.1 默认方案（与线上一致）

主题配置 `background` 填 `https://api.paugram.com/wallpaper?source=gt`，SSR 注入：

```html
<style>body:before{content:'';background-image:url(<配置值>)}</style>
```

`single.css:36-46` 已提供 `fixed / center/cover / opacity:.1 / z-index:-1`，**无需改 CSS**。线上另有 `body::before{mix-blend-mode:multiply}` 与 `.dark-theme::before{opacity:.4}`，放进 `custom_css` 配置项。

### 10.2 建议的健壮化（P2 允许的魔改）

`lib/wallpaper.ts` 提供三种可切换图源：

| 模式 | 实现 | 适用 |
| --- | --- | --- |
| `api`（默认） | 直接用 `api.paugram.com/wallpaper?source=<sm|gh|jsd|gt>` | 与线上一致 |
| `cdn`（推荐兜底） | 从 jsDelivr 取 `gh/Dreamer-Paul/Anime-Wallpaper@master/{N}.jpg`，前端按配置的数量范围随机 N | 个人 API 不可用时 |
| `static` | 单张固定图 URL | 纯色/固定背景需求 |

要点：
- **SSR 只输出 URL，不发起图片请求**；浏览器加载失败用 `new Image()` 探测后回退纯色。
- 图片规格 1920×1080 `.jpg`，建议 `<link rel="preload" as="image">` 或首屏内联 URL，避免暗色模式切换时重闪。
- 夜间模式沿用线上 `mix-blend-mode:multiply` + `.dark-theme::before{opacity:.4}`，与 `.dark-theme img{filter:brightness(60%)}` 不冲突（伪元素不是 img）。
- **风险**：该 API 是作者个人服务，文档标注「运营成本限制」，`source=gt` 未在文档参数表中列出（推断为 Gitee）。**已实测（2026-11-05）**：`GET /wallpaper?source=gt` 返回 302 → `i.loli.net` JPEG 1920×1080（129,526 字节），可用；但最终图床是第三方 i.loli.net，稳定性不受本项目控制，必须配置 `cdn` 兜底。
- **合规**：图片版权归原作者，使用即视为遵守 `https://api.paugram.com/notice`；自建 CDN 时保留仓库许可证与出处。

---

## 11. 实施分期

| 阶段 | 交付 | 完成标志 |
| --- | --- | --- |
| **S0 前提** | ~~确认部署 core 版本~~ → **已定案 v12.x（`/api/v2`，SDK 4.4.0）**；~~确认壁纸 API~~ → **已实测可用（api + cdn 兜底）** | 版本写入 `lib/api/config.ts` ✅ 前提已齐，可直接开工 |
| **S1 视觉骨架** | 复制 5 个静态资源 + 补 5 行 clearfix；`Header`/`Footer`/`layout`；首页与文章页 DOM 用假数据跑通 | 与线上首页、文章页视觉 diff 通过 |
| **S2 数据接通** | 适配层 + `aggregate`/`posts`/`categories`/`pages`；SSR 渲染；SEO/OG；夜间 cookie | 首屏无闪屏、无 hydration 警告、SEO 标签齐全 |
| **S3 正文与交互** | Markdown 管线、Prism、TOC、灯箱、外链、复制提示、返回顶部、菜单/搜索 | `single.js` 的 10 条行为逐条验收通过 |
| **S4 评论** | 评论列表/表单/树/头像/校验/分页 | 可发表、可回复、暗色与移动端版式一致 |
| **S5 mx 特性（P1）** | 友链页、归档页、搜索结果、RSS/Sitemap 反代、Note/说说、点赞阅读数 | 第 9 节第一、二批全部可用 |
| **S6 主题配置与背景** | Snippet 配置读取、13 项配置生效、随机背景三模式 | 后台改配置无需重新构建 |
| **S7 验收与灰度** | 第 12 节清单 + 旧链 301 + 性能检查 | 全清单通过 |

---

## 12. 视觉验收清单（P0 硬门槛）

逐页面与 <https://paugram.com> 对比，**任一项不过即不算完成**：

| # | 检查项 | 判定 |
| --- | --- | --- |
| 1 | `kico.css` 与线上 SHA-256 一致；`single.css` 仅多 5 行 clearfix | 哈希比对 |
| 2 | 字体（Microsoft Yahei / PingFang SC）、根字号 16px、`line-height:1.5` | 计算样式比对 |
| 3 | 顶栏固定 3.2em 高、居中菜单、<600px 折叠、下拉小三角 `:before` | 600px 断点截图 |
| 4 | 首页 `.home-title` 淡入、`.post-item` 前 10 条逐条 0.1s 递增淡入 | 录屏逐帧 |
| 5 | `.post-meta` 图标（时钟/文件夹/标签/评论）为 Font Awesome 4.7 码位 | 元素伪元素 content |
| 6 | 文章标题 `#` 前缀、TOC 桌面贴右 15em 且 `body` 让出 margin、<800px 底部抽屉 | 800px 断点截图 |
| 7 | 代码块斑马纹、`.token.*` 配色、`blockquote` 蓝边、暗色下红字行内 code | 代码块截图 |
| 8 | 夜间模式：`--blue` 覆写、图片 `brightness(60%)`、`iframe/em` 降透明、搜索框变灰 | 双主题全页 diff |
| 9 | 图片灯箱放大/左右切换/loading；复制弹窗；返回顶部过半屏出现 | 交互冒烟 |
| 10 | 评论头像 45px 圆形、hover 旋转 1turn、子级左缩进 2em、@ 引用放大 1.05 | 评论区截图 |
| 11 | 页脚三栏 `col-m-4`、标题右侧 FA 图标、`li:before` 箭头、版权行 | 页脚截图 |
| 12 | 打印样式隐藏 header/footer/评论/编辑链接 | 打印预览 |
| 13 | 友链 `.link-friend` 卡片（头像负 margin 上浮、hover 旋转）、归档 `.archives-head` 胶囊 | 新增页面截图 |
| 14 | 随机背景 `body:before` 生效、暗色混合模式、加载失败回退纯色 | 双主题 + 断网模拟 |

---

## 13. 风险登记

| # | 风险 | 影响 | 处置 |
| --- | --- | --- | --- |
| R1 | ~~目标 core 版本未定~~ **已定案 v12.x**（2026-11-05） | 前缀、信封、分页、字段、评论树全变 | 单分支实现，只按 `COMPATIBILITY.md` 第 11 节左列；v13+ 留档不实现 |
| R2 | 引入 CSS 框架覆盖层 | 与 `kico.css` reset / `--blue` 冲突 | 方案 A 明确不用任何 CSS 框架 |
| R3 | SPA 路由切换后脚本未重绑 | 菜单/夜间/目录/灯箱失效 | `<SingleRuntime>` 以 `usePathname()` 为依赖，effect 成对清理 |
| R4 | Markdown 管线产出 DOM 形状不符 | 标题 #、代码高亮、TOC、图片样式全丢 | 第 7 节规范化步骤 + 验收清单 6/7 |
| R5 | ~~Lexical 正文~~ **不适用**（v12.x 无 Lexical，正文只有 `text` Markdown） | — | 若日后升 v13+ 再按 `COMPATIBILITY.md` 第 11 节右列补 lexical renderer |
| R6 | 壁纸 API 为个人服务、`source=gt` 未文档化 | 背景随机失效 | 第 10.2 节三模式 + CDN 兜底 |
| R7 | SSR 请求被 `SpiderGuard` 拦截（含 axios 的默认 UA） | 首屏 403 | SSR 客户端设置含 `mx-space` 的自定义 UA |
| R8 | `/activity/recent` 只返回 3 条评论（线上 6 条） | 页脚信息栏条数不一致 | 接受 3 条或另找公开数据补齐；**不影响版式** |
| R9 | 自建 RSS/Sitemap 的字段与信封问题 | feed 时间为空 / 解析失败 | **直接反代 core 根路径裸 XML** |
| R10 | 若改选方案 B（my-kami 底座），已确认缺陷 | 局部功能失效 | 3 个同代内缺陷：`PATCH {hasMemory}` 写入无效（应改 `bookmark` 且登录态）、`notes/[id].tsx:112` 与 `socket/handler.ts:46,131-134` 读 `hide` 实为 `isPublished`（语义取反）、`api/feed/index.tsx:52-53` 读 `createdAt/modifiedAt` 实为 `created/modified`；另 v13+ 下 feed 未拆 `{data}` 信封会导致 `data.map` 抛错 |

---

## 14. 已定案决策、待做任务与下一步

### 14.1 已定案（2026-11-05 用户确认）

| # | 决策项 | 结论 |
| --- | --- | --- |
| 1 | **core 版本** | **只支持 v12.x**（`/api/v2` + SDK 4.4.0，与 my-kami 同代）。不写 v13+/v16 双分支；统一信封 / `meta.pagination` / 评论 thread / Lexical 均不实现，留档在 `COMPATIBILITY.md` 第 11 节右列 |
| 2 | **项目落点** | **直接覆盖 `Single` 根目录**建新前端；旧 Typecho 主题（12 模板 + `static/` + `img/` 等）整体挪进 `legacy/` 做只读参考；`docs/` 保留原位。视觉基线从 `legacy/static/` 复制。**不执行 git 提交** |
| 3 | **随机背景图源** | **paugram API（`source=gt`）默认 + Anime-Wallpaper CDN（jsDelivr）兜底**（API 已实测可用，最终图床 i.loli.net） |
| 4 | **可选功能取舍** | **第一期不做**，写成待做任务：M9 订阅、M11 AI 摘要、M13 Socket.IO、M14 音乐/追番/项目/收藏（原主题没有这些功能） |

### 14.2 待做任务清单（第一期不做，后续按需启动）

| # | 任务 | 数据接口 | 前置 |
| --- | --- | --- | --- |
| T1 | 订阅按钮 + 邮件通知 | `POST /subscribe` | 文章底部小按钮，不破坏版式 |
| T2 | AI 摘要 | `GET /ai/summaries/article/:id` | 文章页可选块 |
| T3 | Socket.IO 实时通知 | v12 namespace `/web` | 非视觉，独立客户端 |
| T4 | 音乐 / 追番 / 项目 / 收藏页 | 各自模块 | 新开页面复用 `.page-title` 版式 |
| T5 | 悄悄话标记、博主角标 | `isWhispers`、`author === owner.name` | 评论区小标记 |

### 14.3 下一步

1. **S1 视觉骨架开工**：`legacy/` 挪移 → 复制 5 个静态资源 + 补 5 行 clearfix → `Header`/`Footer`/`layout` → 首页与文章页假数据跑通 → 视觉 diff。
2. 次要待办：实测 `aggregate?theme=single` 的 Snippet 权限（需跑着的 core 实例，可在 S2 阶段做）。

> 说明：`core`、`docs`、`my-kami` 三个仓库在本次工作中**全程只读**；本次仅写入 `Single/docs/COMPATIBILITY.md` 与 `Single/docs/FRONTEND_PLAN.md`，未改动任何仓库源码，也未执行 git 提交。

---

## 15. 额外实现（原版 Single 无）

以下功能为 mx 适配版新增，原版 Typecho 主题没有对应实现，记录于此以便后续维护。

### 15.1 ICP 备案号

**背景**：原版 Single 面向个人博客，页脚只有 `© Year SiteName. All Rights Reserved. Theme By Single.`，无备案字段。mx 适配版后端常部署在国内，需展示 ICP 备案号以符合合规要求。

**配置**：Snippet（`ref=theme`、`name=single`）新增字段 `beian`，字符串类型，默认空（不输出）。

```yaml
# docs/config.test.yaml
beian: 鄂ICP备12345678号-1
```

**落点**：`components/layout/Footer.tsx`，页脚 `.sub-footer > p` 内，"Theme By Single." 右侧。

**DOM 输出**：
```html
<a href="https://beian.miit.gov.cn" target="_blank" rel="nofollow">鄂ICP备12345678号-1</a>
```

**不填则不输出**，不影响原版视觉。

**代码位置**：
- 类型定义：`lib/theme-config.ts` → `SingleThemeConfig.beian`
- 渲染逻辑：`components/layout/Footer.tsx` → `.sub-footer`
- 配置示例：`docs/config.test.yaml` → `beian`

### 15.2 友链页 + 自助申请

**背景**：原版 Single 没有独立的友链页模板（`legacy/` 里无 `links.php`/`friends.php`）。原版做法是在 Typecho 后台「独立页面」编辑器里手写 `<a class="link-friend">` HTML，主题只提供 `.link-friend` 的 CSS 样式和 `single.js:109` 的 `links()`（给外链加 `target="_blank"`），没有结构化数据源。

mx 适配版改为读 core 的友链数据，并提供自助申请入口。

**数据源**：`GET /links/all`（公开），返回友链数组，适配为 `{id, name, url, avatar, description, type, state}`。按 `type` 分组渲染。

**路由**：`app/friends/page.tsx`，复用 `.page-title` + `.page-content.is-special` 版式。

**DOM 契约**：
```html
<section class="page-title"><h2>朋友们</h2></section>
<article class="page-content is-special">
  <div><h1>{分组名}</h1>
    <div class="row">
      <div class="col-6 col-m-4">
        <a class="link-friend" href="{url}" target="_blank" rel="nofollow">
          <img src="{avatar}" alt="{name}" />
          <h4>{name}</h4>
          <p>{description}</p>
        </a>
      </div>
    </div>
  </div>
</article>
```

**自助申请表单**（`ApplyForm`）：替代原版评论区留言申请友链的方式，改用 mx 原生的友链审核接口。

- 表单字段：站点名称 `name`、地址 `url`、头像 `avatar`、描述 `description`、分组 `type`
- 提交走 `POST /api/friends/audit`（同源代理 route），转发到 core `POST /links/audit`
- 提交后提示「申请已提交，等待博主审核」

**代码位置**：
- 友链页：`app/friends/page.tsx`
- 申请表单：`components/friends/ApplyForm.tsx`
- 审核代理 route：`app/api/friends/audit/route.ts`
- 数据适配：`lib/api/adapter.ts` → `adaptFriend`、`lib/api/index.ts` → `fetchFriends`
