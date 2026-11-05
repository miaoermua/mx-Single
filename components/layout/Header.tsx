import Link from 'next/link'
import type { AggregateData, PageSummary } from '@/lib/api'
import type { SingleThemeConfig } from '@/lib/theme-config'

/**
 * 顶栏（header.php → Header）
 *
 * DOM 契约（FRONTEND_PLAN.md 第 4 节）：
 * <header> > .head-title>h4、.head-action>(.toggle-btn,.light-btn,.search-btn)、
 * form.head-search>input[name=s]、
 * nav.head-menu > a 与 .has-child > a + .sub-menu > a
 */
export function Header({
  aggregate,
  theme,
  pages = [],
}: {
  aggregate: AggregateData
  theme: SingleThemeConfig
  /** 独立页面列表，供「站点」下拉菜单用（layout 注入） */
  pages?: PageSummary[]
}) {
  const title = aggregate.seo?.title || aggregate.user?.name || 'Single'
  const nav = theme.nav_extra || {}

  return (
    <header>
      <div className="head-title">
        <h4>{title}</h4>
      </div>
      <div className="head-action">
        {/* 菜单折叠按钮（移动端 <600px 展开），SingleRuntime 绑定 .head-menu.active */}
        <div className="toggle-btn" />
        {/* 夜间切换，SingleRuntime 绑定 body.dark-theme + cookie night */}
        <div className="light-btn" />
        {/* 搜索框展开，SingleRuntime 绑定 .head-search.active */}
        <div className="search-btn" />
      </div>
      {/* 搜索表单：提交走 /search（第 4.1 节） */}
      <form className="head-search" method="get" action="/search">
        <input type="text" name="s" placeholder="搜索什么？" />
      </form>
      <nav className="head-menu">
        <Link href="/">首页</Link>
        {/* mx 新页面导航开关（nav_extra），顺序与线上一致 */}
        {nav.archive && <Link href="/archive">归档</Link>}
        {nav.notes && <Link href="/notes">日记</Link>}
        {nav.timeline && <Link href="/timeline">时间轴</Link>}
        {nav.friends && <Link href="/friends">朋友们</Link>}
        {/* 站点：【额外实现，非 Single 标准】独立页面聚合入口 + 下拉菜单。
            父项进 /sites 聚合页，子项直达各页面。
            .has-child / .sub-menu 的展开由 single.css 负责：桌面 hover、
            移动端常驻展开（kico.css 原有样式，无需 JS）。
            详见 docs/EXTRA_FEATURES.md 第 5 节 */}
        {nav.sites && (
          <div className="has-child">
            <Link href="/sites">站点</Link>
            {pages.length > 0 && (
              <div className="sub-menu">
                {pages.map((p) => (
                  <Link key={p.slug} href={`/pages/${p.slug}`}>
                    {p.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
