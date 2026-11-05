/**
 * 日记详情（mx 特性 → NotePage）
 *
 * 复用 post.php 版式。S5 阶段接 /notes/nid/:nid。
 */
export default async function NotePage({
  params,
}: {
  params: { nid: string }
}) {
  return (
    <main>
      <div className="wrap min">
        <section className="post-title">
          <h2>日记 #{params.nid}</h2>
        </section>
        <article className="post-content">
          <p>（S5 阶段接 <code>GET /notes/nid/:nid</code>）</p>
        </article>
      </div>
    </main>
  )
}
