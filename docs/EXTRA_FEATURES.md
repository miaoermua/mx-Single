# 额外实现（原版 Single 无）

> 本文档记录 mx 适配版相对原版 Typecho Single 主题新增的功能。原版没有对应实现，记录于此以便后续维护。

## 1. ICP 备案号

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

---

## 2. 友链页 + 自助申请

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

---

## 3. 日记（Note）

**背景**：原版 Single 是 Typecho 主题，没有「日记」概念。日记是 mx-space core 的原生功能（类似短文/微博），有独立的 `nid` 编号、心情、天气等元数据。

mx 适配版新增了完整的日记列表页和详情页，复用文章页的 `.post-title` / `.post-content` / `.post-meta` 版式。

**数据源**：
- 列表：`GET /notes?size=50`（公开），返回日记数组
- 详情：`GET /notes/nid/:nid`（公开），core v12.x 返回 `{ data: {...} }` 信封

**适配字段**（`adaptNote`）：
- `content`：core 的 `content` 常为 null，实际内容在 `text` 字段
- `readCount` / `likeCount`：core 返回 `read_count` / `like_count`
- `mood` / `weather`：心情与天气
- `created` / `modified`：core 返回 `created_at` / `modified_at`（snake_case）

**路由**：
- 列表：`app/notes/page.tsx`，复用首页 `.home-title` + `.home-posts` 版式，展示标题、摘要、日期、心情/天气
- 详情：`app/notes/[nid]/page.tsx`，复用文章页版式，展示标题、正文、目录树、阅读量、点赞

**代码位置**：
- 列表页：`app/notes/page.tsx`
- 详情页：`app/notes/[nid]/page.tsx`
- 数据适配：`lib/api/adapter.ts` → `adaptNote`、`Note` 接口
- API 调用：`lib/api/index.ts` → `fetchNote`、`fetchNotes`

---

## 4. 页脚信息栏替换（最新文章 / 日记 / 站点）

**背景**：原版 `functions.php:54` 的 `widget_set` 开启后固定输出三栏：**最新文章 / 时光机 / 最近评论**。mx 版保留「最新文章」，另外两栏换成「日记」和「站点」。

替换原因：

- **时光机**：按文章「创建月份」分组，而 core v12.x 没有按月归档的资源（`COMPATIBILITY.md` X4），只能从最近 6 篇文章反推月份。结果时间跨度极短、顺序也受列表排序影响（会出现 2023 年 1 月夹在 2026 年 1 月之后），对访客几乎没有导航价值。
- **最近评论**：走 `/activity/recent`，取的是全站最新评论，噪声大，且把访客昵称与评论片段直接铺在页脚。

新两栏的数据源都是 mx 的原生资源：

- **日记**：`GET /notes?size=6`，点击进 `/notes/{nid}`
- **站点**：`GET /pages?size=50`，点击进 `/pages/{slug}`

**DOM 契约**（外层结构不变，仅 `h3` 的 class 与内容变化）：

```html
<div class="col-m-4">
  <h3 class="title-notes">日记：</h3>
  <ul><li><a href="/notes/{nid}" target="_blank">{标题}</a></li></ul>
</div>
<div class="col-m-4">
  <h3 class="title-pages">站点：</h3>
  <ul><li><a href="/pages/{slug}" target="_blank">{页面标题}</a></li></ul>
</div>
```

**图标**：`styles/single.css` 中三栏 `h3::after` 的 FontAwesome 4.7 码位

| class | 码位 | 图标 |
| --- | --- | --- |
| `title-recent` | `\f0f6` | file-text-o |
| `title-notes` | `\f073` | calendar |
| `title-pages` | `\f0ac` | globe |

**为什么单独请求 `/pages`**：`GET /aggregate` 在 v12.x **不返回 `pageMeta`**（线上实测响应顶层只有 `user`、`seo`、`url`、`comment_options`、`latest_note_id`、`theme`、`ai`），所以 `AggregateData.pages` 恒为 `undefined`，改用列表接口。

**兜底**：日记没有标题时取正文纯文本前 18 字，再退回 `日记 #{nid}`；页面列表按 `slug` 过滤空值。

**代码位置**：
- 渲染：`components/layout/Footer.tsx`
- 页面列表：`lib/api/index.ts` → `fetchPages`
- 图标：`styles/single.css` → `footer .title-*:after`

---

## 5. 站点页 + 顶栏入口

**背景**：原版 `header.php` 的菜单是「首页 / 归档 / 日记 / 时间轴 / 朋友们」，之后把后台的每个独立页面**逐条**渲染成菜单项。mx 版沿用这段逻辑时有两个问题：

1. `GET /aggregate` 在 v12.x 不返回 `pageMeta`（见第 4 节），`aggregate.pages` 恒为 `undefined`，逐条铺开的代码实际一条也渲染不出来；
2. 即便拿到数据，页面数量一多顶栏也会被挤爆。

改为一个固定的「站点」入口，进去是独立页面的聚合列表。

**路由**：`app/sites/page.tsx`

**数据源**：`GET /pages?size=50`（`lib/api/index.ts` → `fetchPages`）

**版式**：`app/notes/page.tsx`（日记列表）的副本，`.home-title` + `.home-posts` + `.post-item` 全套沿用，**只保留标题，不输出摘要 `<p>`**——独立页面正文动辄整篇 Markdown，截前 100 字既无意义又拖慢渲染。

**DOM 契约**：

```html
<main>
  <div class="wrap min">
    <section class="home-title"><h1>站点</h1><span>本站的独立页面</span></section>
    <section class="home-posts">
      <div class="post-item"><h2><a href="/pages/{slug}">{页面标题}</a></h2></div>
    </section>
  </div>
</main>
```

无页面时输出一条 `.post-item > h2` 的「暂无页面」占位。

**顶栏**：菜单末尾追加 `<Link href="/sites">站点</Link>`，由 `nav_extra.sites` 控制（默认 `true`）。原先 `pages.map(...)` 的逐条渲染已移除。

**代码位置**：
- 页面：`app/sites/page.tsx`
- 顶栏：`components/layout/Header.tsx` → `nav.head-menu`
- 数据：`lib/api/index.ts` → `fetchPages`
- 开关：`lib/theme-config.ts` → `NavExtra.sites`

