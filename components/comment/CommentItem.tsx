import type { Comment } from '@/lib/api'

/**
 * 单条评论（comments.php threadedComments → CommentItem）
 *
 * DOM 契约：
 * .comment-single[.comment-child]#comment-{id} >
 *   img.avatar + .comment-meta(.comment-author, .comment-time, .comment-reply) + p.comment-content
 *
 * 头像直接用后端 avatar 字段（C9：不要在前端按邮箱推导）
 * 子级 .comment-child 左缩进 2em（CSS 已定义）
 * 回复按钮发出 single:reply 事件，由 CommentSection 接收设置 replyTo（C7）
 */
export function CommentItem({
  comment,
  postId,
}: {
  comment: Comment
  postId: string
}) {
  const hasChildren = comment.children && comment.children.length > 0

  const onReply = (e: React.MouseEvent) => {
    e.preventDefault()
    document.dispatchEvent(
      new CustomEvent('single:reply', { detail: { id: comment.id } }),
    )
  }

  return (
    <div
      className={`comment-single${comment.parent ? ' comment-child' : ''}`}
      id={`comment-${comment.id}`}
    >
      {comment.avatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="avatar" src={comment.avatar} alt={comment.author} />
      )}
      <div className="comment-meta">
        <span className="comment-author">
          {comment.url ? (
            <a href={comment.url} rel="external nofollow" target="_blank">
              {comment.author}
            </a>
          ) : (
            comment.author
          )}
        </span>
        <time className="comment-time">
          {new Date(comment.created).toLocaleString('zh-CN')}
        </time>
        <span className="comment-reply">
          <a href="#respond" data-reply-to={comment.id} title="回复" onClick={onReply}>
            <i className="fa fa-reply" />
          </a>
        </span>
      </div>
      <p className="comment-content">
        {comment.parent && (
          <a href={`#comment-${comment.parent}`}>@{comment.author} </a>
        )}
        {comment.content}
      </p>

      {hasChildren && (
        <>
          {comment.children!.map((child) => (
            <CommentItem key={child.id} comment={child} postId={postId} />
          ))}
        </>
      )}
    </div>
  )
}
