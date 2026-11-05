import Link from 'next/link'
import type { AggregateData, Note, PostSummary } from '@/lib/api'
import { fetchRecentPosts, fetchNotes, fetchPages } from '@/lib/api'
import type { SingleThemeConfig } from '@/lib/theme-config'
import { RouteLoader } from './RouteLoader'

/**
 * 页脚（footer.php → Footer）
 *
 * DOM 契约：
 * footer > .buttons > button.to-top（+ 动态 .toggle-list，目录树用，由 ArticleTree 控制）；
 * .wrap.min > section.widget > .row > .col-m-4*3（h3.title-recent/.title-notes/.title-pages + ul>li）；
 * section.sub-footer > p
 *
 * 【额外实现，非 Single 标准】三栏内容相对原主题的调整（原为 最新文章 / 时光机 / 最近评论）：
 * - 时光机 → 日记：按月归档对访客价值低，改为直达最新日记
 * - 最近评论 → 站点：列出 core 的独立页面（/pages/:slug）
 * 详见 docs/EXTRA_FEATURES.md 第 4 节。
 */
export async function Footer({
  aggregate,
  theme,
}: {
  aggregate: AggregateData
  theme: SingleThemeConfig
}) {
  const siteName = aggregate.seo?.title || 'mx-Single'
  const siteUrl = aggregate.url?.siteUrl || '/'
  const widgetSet = theme.widget_set === '1'

  let recentPosts: PostSummary[] = []
  let recentNotes: Note[] = []
  let pages: { title: string; slug: string }[] = []
  if (widgetSet) {
    ;[recentPosts, recentNotes, pages] = await Promise.all([
      fetchRecentPosts(6),
      fetchNotes(6),
      fetchPages(),
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
                <h3 className="title-notes">日记：</h3>
                <ul>
                  {recentNotes.map((n) => (
                    <li key={n.id}>
                      <Link href={`/notes/${n.nid}`} target="_blank">
                        {n.title || plainText(n.content).slice(0, 18) || `日记 #${n.nid}`}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-m-4">
                <h3 className="title-pages">站点：</h3>
                <ul>
                  {pages.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/pages/${p.slug}`} target="_blank">
                        {p.title}
                      </Link>
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
              mx-Single
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

/** 日记正文是 Markdown，列表里只取纯文本前若干字 */
function plainText(content: string): string {
  return (content || '')
    .replace(/<[^>]+>/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`{1,3}/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
