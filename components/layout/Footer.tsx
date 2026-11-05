import Link from 'next/link'
import type { AggregateData } from '@/lib/api'
import type { SingleThemeConfig } from '@/lib/theme-config'

/**
 * 页脚（footer.php → Footer）
 *
 * DOM 契约：
 * footer > .buttons > button.to-top（+ 动态 .toggle-list，目录树用，由 ArticleTree 控制）；
 * .wrap.min > section.widget > .row > .col-m-4*3（h3.title-recent/.title-date/.title-comments + ul>li）；
 * section.sub-footer > p
 */
export function Footer({
  aggregate,
  theme,
}: {
  aggregate: AggregateData
  theme: SingleThemeConfig
}) {
  const siteName = aggregate.seo?.title || 'Single'
  const siteUrl = aggregate.url?.siteUrl || '/'
  const widgetSet = theme.widget_set === '1'

  return (
    <footer>
      {/* 返回顶部按钮；SingleRuntime 绑定 .to-top.active（滚动过半屏出现） */}
      <div className="buttons">
        <button className="to-top" />
      </div>
      <div className="wrap min">
        {widgetSet && (
          <section className="widget">
            <div className="row">
              <div className="col-m-4">
                <h3 className="title-recent">最新文章：</h3>
                {/* S2 阶段接 /posts 列表；S1 骨架先留空 */}
                <ul />
              </div>
              <div className="col-m-4">
                <h3 className="title-date">时光机：</h3>
                {/* S5 阶段接 /aggregate/timeline 按月分组 */}
                <ul />
              </div>
              <div className="col-m-4">
                <h3 className="title-comments">最近评论：</h3>
                {/* S5 阶段接 /activity/recent（注意只返回 3 条，R8） */}
                <ul />
              </div>
            </div>
          </section>
        )}
        <section className="sub-footer">
          <p>
            © {new Date().getFullYear()}{' '}
            <Link href={siteUrl}>{siteName}</Link>. All Rights Reserved. Theme By{' '}
            <a
              href="https://github.com/Dreamer-Paul/Single"
              target="_blank"
              rel="nofollow"
            >
              Single
            </a>
            .
          </p>
        </section>
      </div>
    </footer>
  )
}
