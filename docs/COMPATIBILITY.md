# Single 主题 × Mix Space 前端移植：兼容性表单（v2）

> **v2 修订说明（2026-11-05）**：用户明确了优先级 —— **优先完成 mx 实现，不为兼容 PHP/Typecho 版本妥协；可以大胆魔改 DOM 与实现，但前端视觉样式必须一致**。
> 相较 v1 有三处方向性改写：
> ① 「一致」的定义从 **DOM/实现一致** 收窄为 **视觉输出一致**；
> ② 原本判「❌ 不支持」的 Typecho 专属机制，多数改判为「🟡 用 mx 方式重做」，❌ 项从 14 条收敛到 4 条；
> ③ 新增「线上完整版参考」「mx 特性优先承载」「随机背景图」三组，友链 / 归档从「主动放弃」改为 **必须实现**。
> v1 的「不能支持」是「为 1:1 兼容 PHP」这一前提下的结论，该前提已撤销。

---

## 1. 硬约束与判定口径

### 1.1 三条约束（按优先级排序）

| 优先级 | 约束 | 含义 |
| --- | --- | --- |
| **P0** | **前端样式必须一致** | 布局、间距、配色、字体、图标、动效、响应式断点、夜间模式、打印样式，与线上 <https://paugram.com> 观感一致。**这是唯一不可让步的项** |
| **P1** | **优先完成 mx 实现** | 能用 mx/core 原生能力做的，一律用 mx 做；友链、归档、日记、说说、时间轴、搜索、订阅、点赞要落地，不能因为「PHP 版没有」就砍掉 |
| **P2** | **大胆魔改，实现不必一致** | DOM 结构、class 命名、脚本组织、框架、渲染方式全部可换。Typecho 的会话态、Widget、模板选择机制不需要复刻，用 mx 等价物替代 |

**「样式一致」的准确口径**：一致的是**浏览器最终呈现的视觉结果**，不是 HTML 字符串。允许把 `<?php while($this->next()): ?>` 换成 React `map()`、把 `new Paul_Single()` 换成 hooks、把 `themeConfig` 换成 core Snippet；但不允许出现「按钮圆角变了」「目录树不贴右边」「暗色模式图片没降亮」「首页列表少了逐条淡入」这类视觉偏差。

### 1.2 判定标记

| 标记 | 含义 |
| --- | --- |
| ✅ **直接复用** | 资源或数据可直接拿过来，无需改写即可保持视觉一致 |
| 🟡 **mx 方式重做** | 能力存在，用 mx 数据/组件重新实现；视觉可保持一致，实现必然不同 |
| ⚠️ **语义降级** | 后端语义不等价，需要约定替代行为（通常不影响视觉） |
| ❌ **确实做不到** | mx 架构下无对应物，且无法用前端手段等价还原 |

---

## 2. 版本轴与前置假设（**已确认：只支持 v12.x**）

审计发现 core 仓库里同时存在多个代际的源码，这是所有接口/字段结论的前提。

| 代 | 版本 / 提交 | 日期 | API 前缀 | SDK | 来源 |
| --- | --- | --- | --- | --- | --- |
| 官方文档站 | v3.36.4（示例值） | 2022-09 止 | `/api/v2` | 文档仅称 beta | `D:src/deploy/index.md:204` |
| 工作树检出 | core **v6.0.1-79** `2e180ddee` | 2024-07-29 | `/api/v2` | 1.13.1 | `C:apps/core/package.json:3` |
| **my-kami 同代** | core **v12.10.0** `76a9667bc` | 2026-05-20 | `/api/v2` | **4.4.0** | `git show v12.10.0:packages/api-client/package.json` |
| `/api/v3` 起点 | core **v13.0.0** `22d39cf6c`（分界 `f84b9463d` / PR #2729） | 2026-05-22 | `/api/v3` | 5.0.2-next.10 | 同上 |
| 当前上游 | core **v16.4.1** `8cfb91a94` | 2026-11-04 | `/api/v3` | 5.13.1 | `upstream/master` |

> **易误读点**：PR #2729 标题「refactor(api): **V2 response envelope**, snake_case schema, named views」里的「V2」指**响应信封第 2 版设计 `{data, meta}`**，不是 API v2 路由；这个提交恰恰把前缀升到了 `/api/v3`。

**✅ 已定案（2026-11-05）**：**只支持 v12.x（`/api/v2`，配 SDK 4.4.0）**，不写 v13+/v16 双分支。
- 本文接口路径中的 `/api/vN` 实施时固定为 `/api/v2`。
- 取舍理由：v12.x 与 `my-kami` 同代，无需处理统一信封 / `meta.pagination` / 评论 thread / Lexical 正文，工期最短；v13+ 差异保留在第 11 节**留档备查**，日后升级 core 再补分支。

其余代际事实：
- 官方文档站（2022）**没有接口清单 / 数据模型 / OpenAPI 规范**，只有路由约定与 Kami 配置项；其 Swagger `/api-docs`、GraphQL `/graphql`、120+ 接口的说法在 v6 与 v16 **均未以同样形式回归**。v16 只有一份构建时静态 `apps/core/openapi.json`（**27 operation / 23 path**，面向 iOS 客户端的子集），不是全量规范、无运行时文档服务。
- 因此**所有接口与字段结论以 core 源码为准**，文档只用于确认设计意图与路由约定。
- `D:src/dev/frontend.md:11-13,17-36` 的路由表「强制/建议/可选」是**给主题作者的建议分级**（原文「我希望…能够遵守这一个约定」），不是技术约束；`my-kami` 用 `/:slug` 而非「强制」的 `/pages/:slug` 即为例证。

---

## 3. 视觉基线：线上完整版实测（P0 的验收对象）

2026-11-05 对 <https://paugram.com> 做了原始 HTML / CSS / JS 抓取与哈希比对。

| 项 | 实测结果 | 结论 |
| --- | --- | --- |
| 线上是否重写过前端 | **否**。仍引用 `/usr/themes/single/static/kico.css`、`single.css`、`single.js`、`prism.js` 与 `img/icon.png` | 「线上完整版」= 同一套 Single 主题 + 作者自建自定义页面模板 + 插件，不是另一套前端 |
| `kico.css` | 线上与仓库 **SHA-256 完全一致**（1472 行） | ✅ 逐字节复用 |
| `single.js` | 线上与仓库 **SHA-256 完全一致**（190 行） | ✅ 行为基线准确 |
| `single.css` | 线上 945 行 / 仓库 940 行，差异仅 **1 处 5 行**：`.comment-list .comment-single:after{content:"";clear:both;display:block;}`（评论浮动 clearfix，位于仓库版 `:655` 之后） | ✅ 以仓库版为基线 + 补这 5 行 |
| 字体 / 图标 | `kico.css :root` 的中文字体栈；`font-awesome@4.7.0`（`fastly.jsdelivr.net`） | ✅ 锁版本，不可换 5/6 |
| 随机背景 | `<style>body:before{content:'';background-image:url(https://api.paugram.com/wallpaper?source=gt)}</style>` | 🟡 主题配置 `background` 直接填该 API，见第 8 节 |
| 作者自定义 CSS | `body::before{mix-blend-mode:multiply}`、`.dark-theme::before{opacity:.4}`、`em` 用 `color-mix(var(--blue),#fff 70%)`、`.pio-container`/`sqp` 暗色降亮 | 🟡 归入 `custom_css` 配置项，不写死 |
| 首页文章列表 DOM | `.post-item > h2 > a`、`p` 摘要、`.post-meta > time.date / span.category / span.comments`（`n °C`） | 与 `S:index.php:31-49` 完全一致 |
| 页脚信息栏 | 已开启 `widget_set=1`；线上把「最新文章」改成「**热门文章**」，保留「时光机」（`/2026/10/` 按月）与「最近评论」6 条 | 🟡 用 mx 数据重做，见第 6 节 |
| 第三方脚本 | 百度统计、Microsoft Clarity、Pio 看板娘插件；`fetch("https://paul.ren/api/note/?size=1")` 拉最新日记 | 🟡 归入 `custom_script` / 可选组件 |

**结论**：仓库 `static/` 下的 5 个文件就是**准确的视觉基线**，不需要去猜线上版式。移植时原样复制 + 补 5 行 clearfix 即可，这是达成 P0 成本最低、风险最小的路径。

---

## 4. 线上完整版 vs 开源版：必须补齐的两块

用户指出「开源版本没有友链和归档」。实测确认：开源主题只有 `tags.php`（标签云）与 `custom.php`（二次开发示例）两个自定义模板，**没有友链页和归档页**；线上站是作者用 Typecho 自定义页面模板自建的。P1 要求用 **mx 原生能力**实现，而不是把这两个 PHP 模板翻译一遍。

| 页面 | 线上 URL 与 DOM（实测） | 开源版 | mx 原生数据来源 | 判定 |
| --- | --- | --- | --- | --- |
| **朋友们 / 友链** | `/friends` → `.page-title` + `article.page-content.is-special`；内联 `.link-friend` 卡片样式；`.row > .col-6.col-m-4` 栅格；按 `<h1>` 分组（我的相关 / 参与社团 / 团队成员 / 博客导航 / 我的朋友们）；末尾挂评论区当「友链申请」 | 无 | `GET /api/vN/links/all`（或 `/friends/all`），公开返回 `name/url/avatar/description/type/state`；`GET /links/audit` → `{can}`、`POST /links/audit` 自助申请 | 🟡 **必须实现，且比 PHP 版更好**：卡片用 Link 数据渲染、分组用 `type`/自定义字段、申请用原生审核接口取代「在评论区留言」 |
| **归档** | `/archive` → `.page-title` + `article.page-content`；`.archives-head` 分类计数胶囊（如「随笔与杂谈 (40)」）；`.archives-list` 按分类 `<h1>` 分组，`<li><a>标题</a><span class="date">26-10-13</span></li>` | 无 | `GET /api/vN/aggregate/timeline?type=post&year=&sort=`、`GET /api/vN/posts?year=&size=50`、`GET /api/vN/categories`（带 `count`） | 🟡 **必须实现**：分类计数直接用 `categories[].count`，文章列表用 timeline/posts 聚合；日期格式前端按 `YY-MM-DD` 输出 |
| 关于我 | `/about` → `.page-title` + `article.page-content` + 评论区 | `page.php` 可承载 | `GET /api/vN/pages/slug/about` | ✅ |
| 标签云 | 线上未在导航露出 | `tags.php` 有 | `GET /api/vN/categories?type=tag` → `[{name,count}]` | ✅ 可保留并升级 |
| 导航 | 首页 / 分类（下拉 5 项）/ 关于我 / 朋友们 | 分类下拉 + 独立页面列表 | `categories` + `pages` + 路由表 | 🟡 建议补「归档」「日记」入口 |

> **`.is-special` 的谜底**：线上友链页用了 `article.page-content.is-special`，正是 `S:static/single.js:15,185` 里 `.page-content:not(.is-special)` 要排除的类 —— 自定义页面用它跳过目录树 / 灯箱 / 外链处理。移植时保留这个 class 作为「特殊页面」开关即可，实现可换成组件 prop。

---

## 5. 兼容性表单：视觉与交互层（P0）

| # | 特性 | 证据 | 判定 | 实施口径 |
| --- | --- | --- | --- | --- |
| V1 | `kico.css` 全量（reset、`:root` 变量、`.wrap`/`.row`/`.col-*`、动画 keyframes） | `S:static/kico.css`；线上哈希一致 | ✅ | 逐字节复制，全局引入，**顺序在其它样式之前** |
| V2 | `single.css` 全量（941 行 + 5 行 clearfix） | `S:static/single.css`；线上 diff | ✅ | 逐字节复制 + 补 clearfix |
| V3 | 响应式断点 599/600/768/799/800/1921px | `S:static/single.css:189,218,248,271,369,616,711,767,780,850` | ✅ | 纯媒体查询，自动生效 |
| V4 | 夜间模式 `body.dark-theme`（变量覆写 + 图片降亮 60%） | `S:static/single.css:118-163` | 🟡 | SSR 读 `night` cookie 输出 class 防闪屏；切换逻辑用 React state + cookie，无需 `new Paul_Single()` |
| V5 | 入场动画 `fade-in-top/bottom`、`.post-item:nth-child(n)` 逐条延迟 | `S:static/single.css:438-447`；`kico.css:1120-1170` | 🟡 | 保持 DOM 顺序与 class 即可；若用虚拟化列表会破坏 `nth-child`，**禁止虚拟化首屏列表** |
| V6 | Font Awesome 4.7 图标（`\f0c9`/`\f0eb`/`\f002`、`.post-meta` 系列、页脚图标等 20+ 处） | `S:header.php:19`；`single.css` 多处 `content` | ✅ | 锁 4.7.0；社交链接既可继续输出 `<i class="fa fa-xxx">`，也可改内联 SVG（线上 BiliBili 即内联 SVG），只要视觉一致 |
| V7 | 中文字体栈、滚动条、打印样式、Prism token 配色 | `kico.css:46-50,77-90`；`single.css:48-59,900-940` | ✅ | 随 CSS 生效 |
| V8 | `body:before` 背景图（fixed / cover / opacity .1 / z-index -1） | `S:header.php:21-23`；`single.css:36-46` | 🟡 | 值改为随机壁纸 API，见第 8 节 |
| V9 | 自定义 CSS / JS 注入 | `S:header.php:24-26`、`S:footer.php:45` | 🟡 | 从 Snippet 读，SSR 注入 `<style>`（顺序在 `single.css` 后）/ 客户端注入脚本 |
| V10 | `.post-meta .view:before` 阅读量图标（CSS 已定义、模板未输出） | `S:static/single.css:492` | 🟡 | **mx 优先**：现在有 `count.read` / `readCount`，建议启用，但需保持与既有 meta 行一致的图标间距 |
| V11 | 顶部菜单折叠、夜间切换、搜索框展开、目录树、外链、灯箱、复制提示、返回顶部、评论引用高亮、平滑滚动 | `S:static/single.js:18-190`、`S:static/kico.js:165-244,390-413` | 🟡 | **全部用 React effects / 组件事件重写**，行为对齐即可，不要求保留 `Paul_Single` 构造器。见 `FRONTEND_PLAN.md` 第 4 节逐条映射 |
| V12 | 文章标题 `#` 前缀、TOC 侧栏贴右、`body.has-trees{margin-right:15em}` | `S:static/single.css:552-561,715-792` | 🟡 | TOC 从 Markdown/Lexical 渲染结果生成；core **无 TOC 接口**，必须前端自建 |
| V13 | 引入 Tailwind / WindiCSS 覆盖层 | — | ⚠️ | v1 判「禁止」，v2 放宽为**允许但需隔离**：其 preflight 会与 `kico.css` reset 和 `--blue/--primary` 变量冲突。**推荐直接不用**，样式表已足够 |

---

## 6. 兼容性表单：页面、数据与交互（P1 优先用 mx）

| # | Single / 线上能力 | mx 对应 | 判定 | 说明 |
| --- | --- | --- | --- | --- |
| A1 | 首页文章列表 + 分页 | `GET /api/vN/posts?page=&size=&truncate=`、`GET /api/vN/aggregate` | 🟡 | 摘要优先用 `summary`，无值回退 `truncate`（`truncate` 按字符截 Markdown 原文，可能截断代码围栏） |
| A2 | 文章详情 | `GET /api/vN/posts/:category/:slug` | 🟡 | 用 mx 路由 `/posts/:category/:slug`；旧 `/{category}/{slug}.html` 做 301 |
| A3 | 独立页面（关于/友链/归档） | `GET /api/vN/pages/slug/:slug` + 前端路由 | 🟡 | 友链、归档**不再用 Page 存 HTML**，改用 Link / Timeline 数据渲染组件 |
| A4 | 分类页 `/{category}` | `GET /api/vN/categories/:query`、`?tag=true` | 🟡 | 归档页的分类计数胶囊直接用 `categories[].count` |
| A5 | 搜索（`<form method="post" name="s">`） | `GET /api/vN/search/post?keyword=` / `/search` | 🟡 | 改成前端请求 + 用 `archive.php` 同款版式渲染结果，无需整页 POST |
| A6 | 标签云 | `GET /api/vN/categories?type=tag` | 🟡 | 标签是 `Post.tags: string[]`（无独立实体），链接自定义为 `/tag/:name` |
| A7 | 404 页 | 前端 404 路由 | ✅ | `.error-page` + `img/404.png` 原样 |
| A8 | `thePrev` / `theNext` 上下篇 | Post 详情**不含** prev/next（Note 才有） | 🟡 | 前端按 `created`/`createdAt` 额外查相邻两条，文案「看完啦 (つд⊂)」保留 |
| A9 | 180 天修改提示 | `post.modified` / `modifiedAt` | 🟡 | 阈值 15552000 秒，`ceil` 天数照旧 |
| A10 | OG meta / SEO | `aggregate.seo`（v16 另含 `icon/iconDark/i18n`） | 🟡 | og:image 从 `images[0]` / `cover` 取，替代 `Single::post_image()` 的正则 |
| A11 | 作者信息块 + 头像 | `aggregate.user` / `GET /api/vN/owner` | 🟡 | 66% 圆角、移动端绝对定位照旧 |
| A12 | 评论表单 / 层级回复 / 分页 | `GET /comments/ref/:id`、`POST /comments/guest/:id` 与 `/reader/:id`、对应 `/reply/` | 🟡 | 见第 7 节 |
| A13 | 编辑链接 / 进入后台 | 前台无 Typecho 会话 | 🟡 | 后台地址单独配置（Snippet `adminUrl` 或环境变量）；v12.x 无 Better Auth Reader 体系，登录态判定留待日后升级。`aggregate.url` 会 omit `adminUrl` |
| A14 | 主题更新检测 `api.paugram.com/update` | 无对应物 | ❌ | Typecho 后台钩子，直接丢弃（不影响视觉） |
| A15 | `$this->header()` 的 Typecho 元数据 | 无对应物 | 🟡 | 手工补 RSS `<link rel="alternate">`（线上有三种 feed 声明） |
| A16 | 页脚「热门文章 / 时光机 / 最近评论」 | `posts?sortBy`、`/aggregate/timeline`、`/activity/recent` | ⚠️ | 时光机按月分组需前端聚合（core 只有 `?year=`）；`/activity/recent` 硬编码最近 **3 条**评论，线上是 6 条 → 要么接受 3 条，要么用其它公开数据补齐。**不影响版式** |
| A17 | 友链申请（线上用评论区留言） | `POST /api/vN/links/audit` | 🟡 | 原生自助申请，明显优于 PHP 版 |
| A18 | 自定义模板选择（Typecho） | 无模板字段 | 🟡 | 按 slug 白名单映射路由组件 |

---

## 7. 评论：用 mx 原生能力重做

| # | Typecho 行为 | mx 现状 | 判定 | 处置 |
| --- | --- | --- | --- | --- |
| C1 | `author/mail/url/text` 四字段 | `CommentDto` 同四字段 | ✅ | 直接映射（注意 HTTP 层 snake_case，SDK 转 camelCase） |
| C2 | `commentsRequireMail` 可让邮箱非必填 | `mail` 后端强制合法邮箱 | ⚠️ | 前端必须要求邮箱；表单校验提示同步 |
| C3 | 昵称 / 内容长度不限 | `author ≤ 20`、`text ≤ 500` | ⚠️ | 前端同步校验文案 |
| C4 | 已登录简化表单 | Reader / Better Auth 登录态 | 🟡 | 用 mx 登录态判断，替换 `$this->user->hasLogin()` |
| C5 | `remember()` 回填 | 无 | 🟡 | localStorage |
| C6 | 待审核 `waiting` 提示 | `commentShouldAudit` 开启时公开列表只返回 `state: Read` | ⚠️ | 提交成功后本地提示「你的评论正等待审核」，文案视觉一致 |
| C7 | `threadedComments` 嵌套 + `.comment-child` | v12.x：`children` 嵌套（≤10 层）；v13+：`parentCommentId/rootCommentId/thread` | 🟡 | **已定案 v12.x**：直接用 `children` 嵌套建树；v13+ thread 结构留档不实现。DOM 仍输出 `.comment-single.comment-child` |
| C8 | 回复 `@父作者` + `cancelReply` | `parent` / `parentCommentId` | 🟡 | 复刻 `#comment-{id}` 锚点，供 `comment_list` hover 高亮 |
| C9 | QQ 邮箱头像 / Gravatar robohash | `CommentFilterEmailInterceptor` 删 `mail`，后端 `fillAndReplaceAvatarUrl` 生成 `avatar` | 🟡 | 直接用 `avatar` 字段；**不要**在前端按邮箱推导（邮箱对游客不可见） |
| C10 | 关闭评论 `allow('comment')` | `post.allowComment` + `commentOptions.disableComment` | ✅ | 控制表单显隐；v16 `aggregate.commentOptions` 可直接读 |
| C11 | 悄悄话 / 置顶 / IP 属地 / 举报 | mx 独有 `isWhispers/pin/location/report` | 🟡 | **mx 优先**：可做成管理员态的小标记，不破坏版式 |
| C12 | 管理员标识 | v16 新增 `isOwnerReply`；v12 需 `author === owner.name` | 🟡 | 做一个「博主」角标，样式沿用 `.comment-author` |

---

## 8. 随机背景图（用户指定的新增能力）

| 项 | 实测 / 证据 |
| --- | --- |
| 仓库 | `Dreamer-Paul/Anime-Wallpaper`，数字命名 `.jpg`（`1.jpg`、`103.jpg`、`114.jpg`…），**1920×1080**、白底动漫插图，最近更新 2023-01 |
| 官方 API | `https://api.paugram.com/wallpaper/`（README 写无斜杠版 `https://api.paugram.com/wallpaper` 亦可），**302 跳转到图片** |
| 文档 | `https://api.paugram.com/help/wallpaper`；文档 `source` 参数列 `sm/cp/sina/paul`，图片源状态表列 `sm`（sm.ms）/ `gh`（GitHub Pages）/ `jsd`（JSDelivr Fastly CDN）；`category` 参数标注「施工中」不可用 |
| **线上实际用法** | `body:before{content:'';background-image:url(https://api.paugram.com/wallpaper?source=gt)}` —— 注意 **`gt` 未在文档中列出**（推断为 Gitee 源），且用无斜杠路径 |
| 官方 CSS 示例 | `body:before{...opacity:.3;position:fixed;background:url(https://api.paugram.com/wallpaper/) center/cover}`；主题自带 `single.css:36-46` 已实现同样结构（opacity `.1`） |
| 许可证/约定 | 图片版权归原作者；使用即视为遵守 `https://api.paugram.com/notice`；文档明确允许「把仓库图片下载自用或创建自己的随机图片 API」 |

**判定：🟡 直接可用，且应做成配置化能力。**
- Single 的 `background` 主题配置项（`S:header.php:21-23`）本来就是往 `body:before` 注入 URL，把值填成壁纸 API 即可，**零 CSS 改动**。
- 建议增强（属于「大胆魔改」范围）：配置项支持 `source` 可选值 + 自建图源数组；SSR 阶段只输出 URL、由浏览器加载；加载失败回退纯色；夜间模式沿用线上 `mix-blend-mode:multiply` + `.dark-theme::before{opacity:.4}`；`prefers-reduced-motion` 下不做淡入。
- **风险登记**：该 API 是作者个人服务，文档注明「运营成本限制」，存在可用性/跨域/缓存不确定性。方案里必须提供「把壁纸仓库镜像到自己的 CDN + 前端随机取一张」的自建回退路径（仓库图片为数字命名 jpg，可用 jsDelivr `gh/Dreamer-Paul/Anime-Wallpaper@master/N.jpg`）。

---

## 9. mx 特性优先承载清单（P1，v1 的「放弃」已撤销）

| # | mx 特性 | 落地页面 / 位置 | 判定 | 说明 |
| --- | --- | --- | --- | --- |
| M1 | Link 友链 + 自助申请 | `/friends`，`.link-friend` 卡片 | ✅ | **必须做**，对应线上完整版 |
| M2 | Timeline / 年度归档 | `/archive`，`.archives-head` + `.archives-list` | ✅ | **必须做** |
| M3 | Note 日记（隐藏 / 密码 / 心情 / 天气 / 书签） | `/notes/:nid`，复用 `post.php` 版式 | 🟡 | 官方路由约定里的强制项；线上看板娘已在拉 `paul.ren/api/note/?size=1` |
| M4 | Say 一言 / Recently 动态 | `/says`、`/recently`，复用 `home-posts` 列表 | 🟡 | 可选，建议做 |
| M5 | 时间轴 Timeline | `/timeline` | 🟡 | 与 M2 共用数据 |
| M6 | 搜索 | 顶栏 `.head-search` + `/search` | ✅ | 用 `/search/post` 或 `/search` |
| M7 | RSS / Sitemap | 根路径 `/feed`、`/atom.xml`、`/sitemap` | ✅ | **直接反代 core 根路径 XML，不要自己生成**：v12 用 `@Bypass`、v16 用 `@RawResponse`，两代都是跳过信封的裸 XML；这也回归了 2022 文档「`/feed` 为前端强制路由」的设计意图 |
| M8 | 点赞 / 阅读数 | `.post-meta .view`（V10）、文章底部 | 🟡 | `POST /activity/like`、`POST /ack` 上报阅读 |
| M9 | 订阅 / 邮件通知 | 文章底部小按钮 | 🟡→**待做** | **第一期不做**（2026-11-05 用户决定：原主题无此功能）。接口 `POST /subscribe` 留档，列入待做任务 |
| M10 | 主题配置云端化（Snippet） | 承载 Single 的 11 项配置 + 新增项 | ✅ | `GET /api/vN/aggregate?theme=<name>` / `GET /snippets/theme/:name` 公开读取；v16 额外支持 `theme.<lang>` 覆盖与 `x-lang` |
| M11 | AI 摘要 / 文本宏 / Serverless | 文章页可选 | 🟡→**待做** | **AI 摘要第一期不做**（同上）；文本宏 `[[ ]]` 属正文管线，随 Markdown 渲染一起处理（前端做同样的宏替换） |
| M12 | 多语言（v16 原生 `?lang=` / `x-lang`） | 全站 | 🟡 | Single 中文硬编码，可冻结 zh；但 v16 的 `seo.i18n` 可直接用 |
| M13 | 实时通知（Socket.IO） | 可选 | ⚠️→**待做** | **第一期不做**（同上）。v12 `/web`、v16 `/ws/web` 留档 |
| M14 | 项目 / 收藏 / 音乐 / 追番 / 话题 | 可选路由 | ⚠️→**待做** | **第一期不做**（同上，版式无承载位）；要做就新开页面复用 `.page-title` 版式 |

**统计**：14 项 mx 特性里，第一期落地 10 项（M1–M8、M10、M12 中的冻结 zh），**4 项列入待做任务**（M9 订阅、M11 AI 摘要、M13 Socket.IO、M14 项目/收藏/音乐/追番）——2026-11-05 用户决定「先不做，写成待做任务，因为原主题没有」。主动放弃 0 项。

---

## 10. 真正无法等价还原的项（❌ 汇总，仅 4 项）

| # | 项 | 原因 | 是否影响视觉 |
| --- | --- | --- | --- |
| X1 | `Single::update()` 主题更新检测 | Typecho 后台钩子 + 第三方 API，非前台功能 | 否，直接丢弃 |
| X2 | Typecho 的 `generator/pingback/xmlrpc/wlw` 等元数据 | Typecho 专有 | 否，手工补 RSS link 即可 |
| X3 | 「邮箱可不填」「评论无长度限制」等 Typecho 可配置语义 | core DTO 硬校验 | 否，改前端校验文案 |
| X4 | 按月归档链接的**原始 URL 形状**（`/2026/10/`） | core 无按月归档资源，需新建 `/archive?month=2026-10` | 否，链接形状变了但页面视觉一致 |

> v1 里列的「编辑链接」「进入后台」「待审评论可见」「最近评论 6 条」「自定义头像规则」「按月归档」等 10 项 ❌，在 P1/P2 口径下已改判为 🟡/⚠️：用 mx 登录态、原生 Link/Timeline、后端 avatar、前端提示均可还原视觉，只是实现不同。

---

## 11. 版本分支对照（**留档备查**：已定案只支持 v12.x，下表右列仅供日后升级参考）

| 维度 | v12.x（`/api/v2`，SDK 4.4.0） | v13.0.0+（`/api/v3`） |
| --- | --- | --- |
| 通信前缀 | `/api/v2` | `/api/v3`（**与统一信封由同一 PR #2729 引入，必须一起改**） |
| 响应 | 对象原样 / 数组包 `{data}` | 统一 `{data, meta?}`，错误 `{error:{code,message}}` |
| 分页 | 顶层 `pagination` 六字段 | `meta.pagination:{page,size,total,totalPages}` |
| 时间/计数 | `created/modified`、`count.read/like` | `createdAt/modifiedAt`、`readCount/likeCount` |
| 正文 | `text`（Markdown） | `text` + `content`（Lexical JSON）+ `contentFormat` |
| 评论树 | `children` 嵌套 | `parentCommentId/rootCommentId/replyCount`，新增 thread 接口 |
| 评论写入 | `guest/reader`（同代 SDK 4.4.0 已对应） | 同左，另有举报 / 编辑 |
| 隐藏标志 | `isPublished` | `isPublished` |
| 站点图标 | 无 | `seo.icon` / `seo.iconDark` |
| 聚合根 | 含 `categories`、`pageMeta` | 不含（另调 `/categories`、`/pages`），新增 `commentOptions`/`ai` |
| WebSocket | namespace `/web` | path `/ws/web` |
| 多语言 | 无 | `?lang=` / `x-lang` / `seo.i18n` / `theme.<lang>` |
| 本文第 6/7/9 节结论 | 全部成立 | 全部成立，仅字段取值需按上表转换 |

**若参考实现 `my-kami` 作为底座**，其数据层与 v12.10.0 同代、`/api/v2` 正确；但已确认 3 个同代内缺陷与 1 个 v13+ 缺陷，详见 `FRONTEND_PLAN.md` 第 13 节风险登记。

---

## 12. 未决项与需实机验证

1. ~~**【唯一前提】部署的 core 版本号**~~ —— **已定案（2026-11-05）：只支持 v12.x（`/api/v2`，SDK 4.4.0）**，第 11 节只走左列；v13+ 分支不写、留档备查。
2. `aggregate?theme=<name>` 要求后台存在 `reference='theme'`、公开类型的 Snippet，字段命名与权限需实机确认。
3. 壁纸 API 的 `source=gt` **已实测可用**（2026-11-05）：`GET https://api.paugram.com/wallpaper?source=gt` 返回 302 → `i.loli.net` 图床 JPEG 1920×1080（实测 129,526 字节），跟随重定向后 200。但该值未在官方文档参数表列出，且图床为第三方（i.loli.net），仍建议按第 10 节配置 `cdn` 兜底。**图源已定案：paugram API 默认 + Anime-Wallpaper CDN 兜底。**
4. ~~v13+ 的 `contentFormat: 'lexical'` 正文渲染~~ —— 随 v12.x 定案**不适用**（v12 正文只有 `text` Markdown）。
5. `GET /api/vN/posts?truncate=100` 截断 Markdown 原文在代码围栏开头的文章上的表现。
6. Markdown 管线对 Typecho 时代正文内联 HTML（如 `<p align="right">`）的兼容。

**已定案的其余决定（2026-11-05）**：
- **项目落点**：直接覆盖 `Single` 仓库根目录建新前端；旧 Typecho 主题（12 模板 + `static/` + `img/`）整体挪进 `legacy/` 文件夹做只读参考；`docs/` 保留原位。
- **可选功能取舍**：M9 订阅、M11 AI 摘要、M13 Socket.IO、M14 项目/收藏/音乐/追番/话题页**第一期不做**，写成待做任务清单（原主题没有这些功能，先保视觉一致）。

---

## 13. 证据索引

| 前缀 | 根 / 来源 |
| --- | --- |
| `S:` | `/Users/miaoer/Documents/GitHub/Single/`（本次仅新增 `docs/`，源码未改） |
| `D:` | `/Users/miaoer/Documents/GitHub/docs/`（只读） |
| `C:` | `/Users/miaoer/Documents/GitHub/core/`（只读；含工作树 v6.0.1 与 `upstream/master` v16.4.1、git tag v12.10.0 / v13.0.0） |
| `K:` | `/Users/miaoer/Documents/GitHub/my-kami/`（只读） |
| `线上:` | <https://paugram.com> 原始 HTML/CSS/JS，抓取于 2026-11-05 |
| `壁纸:` | <https://github.com/Dreamer-Paul/Anime-Wallpaper> 与 <https://api.paugram.com/help/wallpaper>，抓取于 2026-11-05 |

核查方式：逐文件读取、全仓检索、`git log/describe/show`、`wc -l`、`shasum -a 256`、`curl` 原始 HTML。四个参考仓库 **全程只读，未写入任何文件**；此次交付只写入 `Single/docs/`。

配套文档：[`FRONTEND_PLAN.md`](./FRONTEND_PLAN.md) —— 在「mx 优先 + 样式一致」约束下的完整实施方案。
