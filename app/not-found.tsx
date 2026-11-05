/**
 * 404 页（404.php → NotFound）
 *
 * DOM 契约：main > .wrap > .error-page > h1 + p + img
 */
export default function NotFound() {
  return (
    <main>
      <div className="wrap">
        <div className="error-page">
          <h1>404</h1>
          <p>页面被单身狗吃掉啦 (QWQ)</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/404.png" alt="404" />
        </div>
      </div>
    </main>
  )
}
