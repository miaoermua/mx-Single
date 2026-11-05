# AGENTS.md

给在本仓库工作的 AI 编码助手的约定。人类读者可先看 `README.md` 与 `docs/`。

## 1. 项目是什么

Single 主题的 Mix Space 适配版前端：把 paugram.com 的 Typecho 主题 Single 用 Next.js 重写，数据换成 Mix Space core 的 `/api/v2`。

- 视觉基线：<https://paugram.com>。改版式前先对照线上 DOM/样式，不要凭感觉重构。
- 只支持 core **v12.x**（`/api/v2`，SDK 4.4.0）。不写 v13+ 双分支，相关差异留档在 `docs/COMPATIBILITY.md` 第 11 节。
- 原主题 PHP 源码在 `legacy/`，**只读参考**，不要改、不要被 `tsc` 纳入编译（已在 `tsconfig.json` exclude）。

## 2. 常用命令

```bash
npm run dev        # 本地开发，默认 3000
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm run build      # 生产构建
```

改完代码至少跑 `typecheck`。涉及渲染的改动，用 `curl http://localhost:3000/<路径>` 检查 SSR 输出的 DOM 是否符合预期（本项目大量依赖 class 名做样式钩子，class 错了视觉就废）。

## 3. 目录与职责

| 路径 | 职责 |
| --- | --- |
| `app/` | App Router 路由。`app/page.tsx` 首页，`app/posts/[category]/[slug]/` 文章页，`app/api/` 前端 route handler 代理 |
| `components/layout/` | Header / Footer / `SingleRuntime`（客户端运行时行为） |
| `components/content/` | `ArticleTree`（目录树）、`Lightbox`（灯箱）、`LinkCard`（Markdown 链接卡片） |
| `components/post/` | `LikeButton`（点赞）、`ReadAck`（阅读上报） |
| `components/comment/` | 评论列表 / 表单 / 单条 / 正文 |
| `components/friends/` | 友链卡片与自助申请表单 |
| `lib/api/` | `config.ts`（core 连接）、`index.ts`（数据获取）、`adapter.ts`（字段适配）、`mock.ts` |
| `lib/markdown.ts` | `marked` + Prism 渲染管线 |
| `lib/theme-config.ts` | Snippet 主题配置模型与默认值 |
| `styles/` | `kico.css`（原主题基础，勿改）+ `single.css`（本主题样式）+ `custom.css` |
| `docs/` | 方案、兼容性、额外功能、使用说明 |
| `legacy/` | 原版 PHP 主题，只读 |

路径别名：`@/*` → 仓库根。

## 4. 数据层铁律

1. **SSR 直接打 core，浏览器不直连 core。** 客户端交互（评论、友链申请等）一律走 `app/api/*` 的 Route Handler 代理，避免跨域和 SpiderGuard 拦截。
2. **SSR 请求必须带含 `mx-space` 的 UA**（`MX_SSR_UA`），否则 core 的 `SpiderGuard` 返回 403。
3. **所有 core 字段映射集中在 `lib/api/adapter.ts`**，页面组件不直接读原始 JSON。已知 v12.x 陷阱：
   - 评论正文在 `text`，`content` 常为空；
   - 子评论在 `replies`，不是 `children`；
   - 父评论 ID 是 `parent_comment_id`；
   - 笔记正文在 `text`，`content` 常为空；
   - 分页字段是 `current_page` / `total_page` / `has_next_page`。
4. 4xx 由 `get()` 返回 `null` 走兜底，不要让它冒成 500。
5. 没有 `MX_CORE_URL` 时走 `lib/api/mock.ts`，方便离线调样式，别把 mock 数据写进组件。

## 5. 样式与 DOM 约定

- **不引入任何 CSS 框架**（Tailwind / UI 库都不要）。`kico.css` 的 reset 和 `--blue` 变量会被覆盖，视觉直接崩。
- 版式靠原主题的 class 名复刻：`.post-comments`、`.comment-list`、`.comment-single`、`.comment-child`、`.post-item`、`.home-title`、`.link-friend` 等。**改 class 名前先全局搜索 CSS 依赖**。
- 评论嵌套必须保持 `div.comment-list > div.comment-single[.comment-child] > div.comment-list ...`，缩进依赖 CSS 选择器 `.comment-list .comment-child`。
- 颜色/圆角优先用 CSS 变量（`--primary`、`--border`、`--radius`），保证暗色模式自动生效。
- 移动端断点：600px（顶栏折叠）、800px（TOC 抽屉）。
- 对外链统一 `target="_blank" rel="nofollow"`。

## 6. 客户端运行时

`components/layout/SingleRuntime.tsx` 承载原 `single.js` 的行为（夜间模式、目录、灯箱、复制提示、外链、返回顶部等）。

- App Router 切换路由不会重新执行脚本，所以所有绑定必须**以 `usePathname()` 为依赖**，effect 内成对清理监听器（风险 R3）。
- 新增全局副作用时，把清理函数写完整，避免切页后重复绑定。

## 7. 评论模块要点

- 结构：`CommentSection`（状态/分页/回复目标）→ `CommentList` → `CommentItem`（递归子评论）→ `CommentContent`（实体解码 + Markdown 转义还原 + URL 转链接）。
- 提交：`POST /api/comment` → core `POST /comments/guest/:id`；回复：`POST /api/comment/reply` → core `POST /comments/guest/reply/:id`。
- `url` 留空时**不要传空字符串**，core 会 422；传 `undefined` 让字段消失。
- 时间展示为 `YYYY.MM.DD`（对齐原主题），不用 `toLocaleString`。
- 子评论的 `@被回复者` 链接指向 `#comment-{父评论 id}`。
- 提交成功后通过 `onSubmitted` 让 `CommentSection` 强制重拉第 1 页。

## 8. 代码风格

- TypeScript `strict`，不用 `any` 逃逸；边界处用 `unknown` + 适配函数。
- 2 空格缩进、单引号、命名导出函数组件；分号等细节跟随所在文件的既有风格。
- 每个模块顶部写块注释：**职责 + 对应原主题文件 + 关键约束**（现有代码都是这个风格，保持一致）。
- 注释写「为什么」，不写「做了什么」。
- 客户端组件才加 `'use client'`，能留在服务端就别下放。

## 9. 文档维护

| 文件 | 内容 |
| --- | --- |
| `docs/FRONTEND_PLAN.md` | 总体方案、阶段、验收清单、风险登记 |
| `docs/COMPATIBILITY.md` | core 版本差异与 API 兼容性 |
| `docs/EXTRA_FEATURES.md` | 原主题没有、mx 版新增的功能 |
| `docs/README.md` | 简要使用方法（环境变量、部署、配置） |
| `docs/single.md` | 主题介绍页（概述、部署、后端 Snippet 配置、配置项说明），面向使用者 |
| `docs/config.test.yaml` | Snippet 主题配置示例 |

新增「原主题没有」的能力时，同步更新 `docs/EXTRA_FEATURES.md`；改动运行/配置方式时更新 `docs/README.md`。

## 10. 不要做的事

- 不要改 `legacy/` 和 `styles/kico.css`。
- 不要为了「更现代」替换原主题的 DOM 结构与 class 名。
- 不要在前端按邮箱哈希推导头像，直接用后端 `avatar` 字段。
- 不要在组件里硬编码 core 地址，统一走 `lib/api/config.ts`。
- 不要提交真实邮箱、密钥或生产环境地址到代码里。
