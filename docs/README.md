# 简要使用方法

> Single 主题的 Mix Space 适配版前端（Next.js App Router）。本文只讲「怎么跑起来、怎么配」。

## 1. 环境要求

- Node.js ≥ 18
- 一个可访问的 Mix Space core 实例（v12.x，API 前缀 `/api/v2`）

## 2. 环境变量

在项目根目录新建 `.env.local`：

```bash
# core 地址，不带 /api/v2 后缀（代码里会拼）
MX_CORE_URL=https://api.example.com

# 以下可选
# API 前缀，默认 /api/v2
MX_API_PREFIX=/api/v2
# SSR 请求 UA，必须包含 "mx-space"，否则被 SpiderGuard 拦截
MX_SSR_UA=mx-space-single-frontend/0.1.0
```

> 不填 `MX_CORE_URL` 时自动走内置 mock 数据，方便本地调样式。

## 3. 本地开发

```bash
npm install
npm run dev      # http://localhost:3000
```

其他脚本：

```bash
npm run build      # 生产构建
npm run start      # 启动生产服务
npm run typecheck  # 类型检查
npm run lint       # ESLint
```

## 4. 部署

任意支持 Node 的平台（Vercel / 自建服务器均可）：

```bash
npm ci
npm run build
npm run start    # 默认 3000 端口，可用 PORT 覆盖
```

记得在生产环境注入上面的环境变量。

## 5. 主题配置

配置放在 core 后台的 Snippet 中，`reference=theme`、`name=single`、公开可读。前端通过 `GET /aggregate?theme=single` 读取。

完整示例见 `docs/config.test.yaml`，字段说明见 `lib/theme-config.ts` 的 `SingleThemeConfig`。

常用字段：

| 字段 | 说明 | 取值 |
| --- | --- | --- |
| `favicon` | 站点图标 | URL |
| `background` | 默认壁纸 | URL |
| `author_text` | 首页签名文案 | 字符串 |
| `night_mode` | 夜间模式 | `0` 关闭 / `1` 按时 / `2` 始终 |
| `copy_notice` | 复制提示 | `0` / `1` |
| `widget_set` | 页脚小组件（时光机/最新文章/最近评论） | `0` / `1` |
| `beian` | ICP 备案号 | 不填则不输出 |
| `nav_extra` | 额外导航项 | `{archive, notes, says, timeline, friends}` |
| `wallpaper` | 壁纸源策略 | 见 `WallpaperConfig` |

## 6. 页面路由

| 路径 | 说明 |
| --- | --- |
| `/` | 首页：文章列表 + 分类/标签侧栏 |
| `/posts/[category]/[slug]` | 文章详情（评论、点赞、目录树） |
| `/notes` | 日记列表 |
| `/notes/[nid]` | 日记详情 |
| `/archives` | 归档 |
| `/timeline` | 时间轴 |
| `/friends` | 友链（含自助申请） |
| `/[slug]` | core 独立页面 |

## 7. 评论

- 文章页底部渲染评论区，游客直接填写昵称 / 邮箱 / 网址提交。
- 游客提交走 Next.js Route Handler 代理：`POST /api/comment` → core `POST /comments/guest/:id`，避免浏览器直连 core 被跨域或爬虫守卫拦截。
- 回复某条评论走 `/api/comment/reply` → core `POST /comments/guest/reply/:id`。
- 开启审核时，提交后提示「你的评论正等待审核」。
- 网址字段留空即可，填了必须是带 `http(s)://` 的合法地址（core 会校验，否则 422）。

## 8. 友链

- 数据来自 `GET /links/all`，按 `type` 分组展示。
- `state=2`（失联）、`state=3`（禁止）：渲染为不可点击的纯文字（带删除线），按添加时间升序排列。
- 页面底部有自助申请表单，提交走 core 友链审核接口。

## 9. 日记（Note）

- 列表与首页文章版式一致（`.home-title` + `.home-posts` + `.post-item`）。
- 详情页含阅读量、点赞、目录树、评论。
- core 的笔记 `content` 常为空，正文实际在 `text` 字段，适配层已做兜底。

## 10. 目录结构速览

```
app/          路由与页面（App Router）
components/   UI 组件（layout / content / comment / post）
lib/          API 客户端、适配层、主题配置、markdown 渲染
styles/       single.css 等原主题样式
docs/         方案与兼容性文档
```
