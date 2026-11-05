import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchAggregate, fetchPostDetail } from '../../../lib/api'
import { mergeThemeConfig, metaFlags, type SingleThemeConfig } from '../../../lib/theme-config'
import { renderMarkdown } from '../../../lib/markdown'

/**
 * 文章详情（post.php → PostPage）
 *
 * DOM 契约：
 * section.post-title > h2 + .post-meta；
 * article.post-content（Markdown 渲染结果）；
 * section.post-near > ul>li*2；
 * section.post-tags；
 * section.post-author > figure.author-avatar + .author-info；
 * section#comments.post-comments（S4 阶段接评论组件）
 */
export default async function PostPage({
  params,
}: {
  params: { category: string; slug: string }
}) {
  const post = await fetchPostDetail(params.category, params.slug)
  if (!post) notFound()

  const agg = await fetchAggregate()
  const theme = mergeThemeConfig(
    agg.theme as Partial<SingleThemeConfig> | undefined,
  )
  const meta = metaFlags(theme.post_meta)

  const html = renderMarkdown(post.text)
  const modified = post.modified ? new Date(post.modified) : null
  const showStaleWarning =
    modified && Date.now() - modified.getTime() >= 15552000000

  return (
    <main>
      <div className="wrap min">
        <section className="post-title">
          <h2>{post.title}</h2>
          <div className="post-meta">
            <time className="date">
              {new Date(post.created).toLocaleDateString('zh-CN')}
            </time>
            {meta.show_category && post.category && (
              <span className="category">{post.category}</span>
            )}
            {meta.show_comments && (
              <span className="comments">{post.count?.comments ?? 0}</span>
            )}
          </div>
        </section>

        <article className="post-content">
          {showStaleWarning && (
            <blockquote>
              这篇文章上次修改于{' '}
              {modified && Math.ceil((Date.now() - modified.getTime()) / 86400000)}{' '}
              天前，可能其部分内容已经发生变化，如有疑问可询问作者。
            </blockquote>
          )}
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>

        {/* 上下篇（A8：core 不含 prev/next，S2 阶段前端额外查相邻两条） */}
        <section className="post-near">
          <ul>
            <li>上一篇: 看完啦 (つд⊂)</li>
            <li>下一篇: 看完啦 (つد⊂)</li>
          </ul>
        </section>

        {post.tags && post.tags.length > 0 && (
          <section className="post-tags">
            {post.tags.map((t) => (
              <Link key={t} href={`/tag/${t}`}>
                {t}
              </Link>
            ))}
          </section>
        )}

        {theme.author_text && (
          <section className="post-author">
            <figure className="author-avatar">
              {agg.user?.avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agg.user.avatar} alt={agg.user?.name} />
              )}
            </figure>
            <div className="author-info">
              <h4>{agg.user?.name}</h4>
              <p>{theme.author_text}</p>
            </div>
          </section>
        )}

        {/* S4 阶段接评论组件 */}
        <section id="comments" className="post-comments" />
      </div>
    </main>
  )
}
