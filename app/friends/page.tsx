import { fetchFriends } from '../../lib/api'

/**
 * 友链页（线上完整版 → FriendsPage）
 *
 * DOM 契约：section.page-title + article.page-content.is-special；
 * 分组 h1；.row > .col-6.col-m-4 > a.link-friend > img + h4 + p
 */
export default async function FriendsPage() {
  const friends = await fetchFriends()

  // 按 type 分组（M1）
  const groups: Record<string, typeof friends> = {}
  for (const f of friends) {
    const type = f.type || '未分组'
    if (!groups[type]) groups[type] = []
    groups[type].push(f)
  }

  return (
    <main>
      <div className="wrap min">
        <section className="page-title">
          <h2>朋友们</h2>
        </section>
        <article className="page-content is-special">
          {Object.entries(groups).map(([type, list]) => (
            <div key={type}>
              <h1>{type}</h1>
              <div className="row">
                {list.map((f) => (
                  <div className="col-6 col-m-4" key={f.id}>
                    <a
                      className="link-friend"
                      href={f.url}
                      target="_blank"
                      rel="nofollow"
                    >
                      {f.avatar && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.avatar} alt={f.name} />
                      )}
                      <h4>{f.name}</h4>
                      <p>{f.description}</p>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </article>
      </div>
    </main>
  )
}
