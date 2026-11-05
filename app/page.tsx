import Link from 'next/link'
import { fetchAggregate, fetchPosts } from '@/lib/api'
import { mergeThemeConfig, metaFlags, type SingleThemeConfig } from '@/lib/theme-config'

/**
 * 首页（index.php → HomePage）
 *
 * DOM 契约：
 * main > .wrap.min > section.home-title > h1 + span + .home-social；
 * section.home-posts > .post-item*（h2>a、p、.post-meta > time.date / span.category / span.tags / span.comments）；
 * section.page-navigator > span
 */
export default async function HomePage() {
  const agg = await fetchAggregate()
  const theme = mergeThemeConfig(
    agg.theme as Partial<SingleThemeConfig> | undefined,
  )
  const { items: posts } = await fetchPosts(1, 10)
  const meta = metaFlags(theme.archive_meta)

  const social = theme.home_social || []
  const siteName = agg.seo?.title || agg.user?.name || 'Single'
  const siteDesc = agg.seo?.description || agg.user?.description || ''

  return (
    <main>
      <div className="wrap min">
        <section className="home-title">
          <h1>{siteName}</h1>
          <span>{siteDesc}</span>
          {social.length > 0 && (
            <div className="home-social">
              {social.map((s) => (
                <a key={s.url} href={s.url} title={s.title}>
                  {s.svg ? (
                    <span dangerouslySetInnerHTML={{ __html: s.svg }} />
                  ) : (
                    <i className={`fa fa-${s.icon || 'link'}`} />
                  )}
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="home-posts">
          {posts.map((post) => (
            <div className="post-item" key={post.id}>
              <h2>
                <Link
                  href={`/posts/${post.categorySlug || 'uncategorized'}/${post.slug}`}
                >
                  {post.title}
                </Link>
              </h2>
              <p>{post.summary}</p>
              <div className="post-meta">
                <time className="date">
                  {new Date(post.created).toLocaleDateString('zh-CN')}
                </time>
                {meta.show_category && post.category && (
                  <span className="category">{post.category}</span>
                )}
                {meta.show_tags && post.tags && post.tags.length > 0 && (
                  <span className="tags">{post.tags.join('，')}</span>
                )}
                {meta.show_comments && (
                  <span className="comments">
                    {post.count?.comments ?? 0} °C
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
