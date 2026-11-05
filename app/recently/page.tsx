/**
 * 动态（mx 特性，S5 阶段接 /recently）
 *
 * 复用 home-posts 列表版式。
 */
export default function RecentlyPage() {
  return (
    <main>
      <div className="wrap min">
        <section className="home-title">
          <h1>动态</h1>
        </section>
        <section className="home-posts">
          <div className="post-item">
            <p>（S5 阶段接 <code>GET /recently</code>）</p>
          </div>
        </section>
      </div>
    </main>
  )
}
