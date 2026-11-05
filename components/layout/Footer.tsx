import Link from 'next/link'
import type { AggregateData, PostSummary, RecentComment } from '@/lib/api'
import { fetchRecentPosts, fetchRecentComments } from '@/lib/api'
import type { SingleThemeConfig } from '@/lib/theme-config'
import { RouteLoader } from './RouteLoader'

/**
 * 页脚（footer.php → Footer）
 *
 * DOM 契约：
 * footer > .buttons > button.to-top（+ 动态 .toggle-list，目录树用，由 ArticleTree 控制）；
 * .wrap.min > section.widget > .row > .col-m-4*3（h3.title-recent/.title-date/.title-comments + ul>li）；
 * section.sub-footer > p
 */
export async function Footer({
  aggregate,
  theme,
}: {
  aggregate: AggregateData
  theme: SingleThemeConfig
}) {
  const siteName = aggregate.seo?.title || 'Single'
  const siteUrl = aggregate.url?.siteUrl || '/'
  const widgetSet = theme.widget_set === '1'

  let recentPosts: PostSummary[] = []
  let recentComments: RecentComment[] = []
  if (widgetSet) {
    ;[recentPosts, recentComments] = await Promise.all([
      fetchRecentPosts(6),
      fetchRecentComments(),
    ])
  }

  return (
    <footer>
      {/* 返回顶部按钮；SingleRuntime 绑定 .to-top.active（滚动过半屏出现） */}
      <div className="buttons">
        <button className="to-top" />
        <RouteLoader />
      </div>
      <div className="wrap min">
        {widgetSet && (
          <section className="widget">
            <div className="row">
              <div className="col-m-4">
                <h3 className="title-recent">最新文章：</h3>
                <ul>
                  {recentPosts.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/posts/${p.categorySlug || 'uncategorized'}/${p.slug}`}
                        target="_blank"
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-m-4">
                <h3 className="title-date">时光机：</h3>
                {/* core 无按月归档资源（X4），用文章列表按月分组 */}
                <ul>
                  {groupByMonth(recentPosts).map((g) => (
                    <li key={g.label}>
                      <Link href={`/archive?month=${g.key}`} rel="nofollow" target="_blank">
                        {g.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-m-4">
                <h3 className="title-comments">最近评论：</h3>
                <ul>
                  {recentComments.map((c, i) => (
                    <li key={i}>
                      {c.author}:{' '}
                      <a href={c.link || '#'} rel="nofollow" target="_blank">
                        {c.content.slice(0, 10)}
                        {c.content.length > 10 ? '...' : ''}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
        <section className="sub-footer">
          <p>
            © {new Date().getFullYear()}{' '}
            <Link href={siteUrl}>{siteName}</Link>. All Rights Reserved. Theme By{' '}
            <a
              href="https://github.com/miaoermua/mx-Single"
              target="_blank"
              rel="nofollow"
            >
              Single
            </a>
            .
            {theme.beian && (
              <>
                {' '}
                <a
                  href="https://beian.miit.gov.cn"
                  target="_blank"
                  rel="nofollow"
                >
                  {theme.beian}
                </a>
              </>
            )}
          </p>
        </section>
      </div>
    </footer>
  )
}

/** 把文章列表按月分组（A16 时光机） */
function groupByMonth(posts: PostSummary[]): Array<{ key: string; label: string }> {
  const map = new Map<string, string>()
  for (const p of posts) {
    const d = new Date(p.created)
    if (isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
    if (!map.has(key)) map.set(key, label)
  }
  return Array.from(map.entries()).map(([key, label]) => ({ key, label }))
}
