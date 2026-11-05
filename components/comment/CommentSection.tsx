import { fetchComments } from '@/lib/api'
import { CommentList } from './CommentList'
import { CommentForm } from './CommentForm'

/**
 * 评论区（comments.php → CommentSection）
 *
 * DOM 契约：
 * section.post-comments#comments > h3；
 * .comment-form；
 * .comment-list > .comment-single[.comment-child]；
 * div.page-navigator
 *
 * S4：评论列表/表单/树/头像/校验/分页
 */
export async function CommentSection({
  postId,
  allowComment,
}: {
  postId: string
  allowComment?: boolean
}) {
  const { items, pagination } = await fetchComments(postId, 1, 10)
  const count = pagination?.total ?? items.length

  const heading =
    count === 0 ? '没有评论' : count === 1 ? '只有一条评论 (QwQ)' : `已有 ${count} 条评论`

  return (
    <section className="post-comments" id="comments">
      <h3>{heading}</h3>

      {allowComment === false ? (
        <p>博主关闭了评论...</p>
      ) : (
        <div className="comment-form" id="respond">
          <span className="cancel-comment-reply" />
          <CommentForm postId={postId} />
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="comment-list">
            <CommentList comments={items} postId={postId} />
          </div>
          {/* TODO S4+：分页（pagination.totalPages > 1 时输出 div.page-navigator > span） */}
        </>
      )}
    </section>
  )
}
