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

### 4.1 Vercel

1. 把仓库推到 GitHub / GitLab / Bitbucket。
2. Vercel 控制台 **Add New → Project**，导入该仓库。
3. Framework Preset 会自动识别为 **Next.js**，其余保持默认：
   - Root Directory：仓库根
   - Build Command：`npm run build`
   - Output Directory：`.next`
   - Install Command：`npm ci`（有 `package-lock.json` 时自动）
4. 在 **Environment Variables** 中添加（Production、Preview 两个环境都要加）：

   | Key | Value |
   | --- | --- |
   | `MX_CORE_URL` | `https://api.example.com`（**不要**带 `/api/v2`） |
   | `MX_API_PREFIX` | `/api/v2`（可省略，默认值相同） |
   | `MX_SSR_UA` | `mx-space-single-frontend/0.1.0`（可省略，默认值相同） |

5. 点 **Deploy**。
6. 部署完成后在 **Settings → Domains** 绑定自定义域名。

部署后验证：

```bash
curl -I https://your-domain.com/            # 200，且 HTML 里是真实文章而非 mock
curl -I https://your-domain.com/feed        # 200，反代到 core 的 RSS
curl -I https://your-domain.com/sitemap.xml # 200
```

**注意事项**

- `next.config.js` 的 `rewrites()` 在**构建时**读取 `MX_CORE_URL`，所以改动这个变量后必须 **Redeploy**，仅保存环境变量不会生效。
- Preview 部署同样会请求真实 core，评论提交会写入生产数据；不想污染就单独配一套 Preview 变量。
- **不要**设置 `DOCKER_BUILD`。它会把 `output` 切成 `standalone`，那是给 Docker 用的，Vercel 不需要。
- Node 版本用 Vercel 默认的 20.x 即可（Next 14 要求 ≥ 18.17）。
- 函数默认区域是 `iad1`（美东），回源国内 core 延迟较高。可在 **Settings → Functions → Region** 改到香港/新加坡（部分区域需 Pro），或给 core 套 CDN。
- 如果 core 前面有 Cloudflare 的 Bot Fight Mode / 防火墙，Vercel 的出口 IP 可能被拦，需要放行或关闭该功能。
- Hobby 计划函数超时 10 秒，core 响应过慢会出现 504。
- 本站图片用原生 `<img>`，不走 `next/image`，不消耗 Vercel 图片优化额度。

### 4.2 自建服务器 / Docker

```bash
npm ci
npm run build
npm run start    # 默认 3000 端口，可用 PORT 覆盖
```

构建 Docker 镜像时设置 `DOCKER_BUILD=1` 以启用 `standalone` 输出。

无论哪种方式，都要记得注入第 2 节的环境变量。

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
| `widget_set` | 页脚小组件（最新文章 / 日记 / 站点） | `0` / `1` |
| `beian` | ICP 备案号 | 不填则不输出 |
| `nav_extra` | 额外导航项 | `{archive, notes, says, timeline, friends, sites}` |
| `wallpaper` | 壁纸源策略 | 见 `WallpaperConfig` |

## 6. 页面路由

| 路径 | 说明 |
| --- | --- |
| `/` | 首页：文章列表 + 分类/标签侧栏 |
| `/posts/[category]/[slug]` | 文章详情（评论、点赞、目录树） |
| `/notes` | 日记列表 |
| `/notes/[nid]` | 日记详情 |
| `/archive` | 归档 |
| `/timeline` | 时间轴 |
| `/friends` | 友链（含自助申请） |
| `/sites` | 站点：core 独立页面聚合列表（无摘要） |
| `/pages/[slug]` | core 独立页面详情 |

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
