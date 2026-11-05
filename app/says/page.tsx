/**
 * 说说 / 一言（mx 特性，S5 阶段接 /says）
 *
 * 复用 home-posts 列表版式。
 */
export default function SaysPage() {
  return (
    <main>
      <div className="wrap min">
        <section className="home-title">
          <h1>说说</h1>
        </section>
        <section className="home-posts">
          <div className="post-item">
            <p>（S5 阶段接 <code>GET /says</code>）</p>
          </div>
        </section>
      </div>
    </main>
  )
}
