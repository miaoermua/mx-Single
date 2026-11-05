'use client'

import { useState, useEffect } from 'react'
import type { Comment } from '@/lib/api'
import { CommentList } from './CommentList'
import { CommentForm } from './CommentForm'

/**
 * 评论区容器（comments.php → CommentSection）
 *
 * SSR 预取第 1 页注水进来，客户端管理分页切换 + 回复状态。
 *
 * DOM 契约：
 * section.post-comments#comments > h3；
 * .comment-form；
 * .comment-list > .comment-single[.comment-child]；
 * div.page-navigator > span
 */
export function CommentSection({
  postId,
  allowComment,
  initialItems,
  initialTotal,
  initialPage,
  initialTotalPages,
}: {
  postId: string
  allowComment?: boolean
  initialItems: Comment[]
  initialTotal: number
  initialPage: number
  initialTotalPages: number
}) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(initialPage)
  const [totalPages] = useState(initialTotalPages)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [loadingPage, setLoadingPage] = useState(false)

  // 监听 CommentItem 发出的回复事件
  useEffect(() => {
    const onReply = (e: Event) => {
      const ce = e as CustomEvent<{ id: string }>
      if (ce.detail?.id) {
        setReplyTo(ce.detail.id)
        document.getElementById('respond')?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    document.addEventListener('single:reply', onReply)
    return () => document.removeEventListener('single:reply', onReply)
  }, [])

  const loadPage = async (p: number) => {
    if (p === page || loadingPage) return
    setLoadingPage(true)
    try {
      const res = await fetch(`/api/comments?postId=${postId}&page=${p}&size=10`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        setPage(p)
      }
    } catch {
      // 静默失败
    } finally {
      setLoadingPage(false)
    }
  }

  const count = initialTotal
  const heading =
    count === 0 ? '没有评论' : count === 1 ? '只有一条评论 (QwQ)' : `已有 ${count} 条评论`

  return (
    <section className="post-comments" id="comments">
      <h3>{heading}</h3>

      {allowComment === false ? (
        <p>博主关闭了评论...</p>
      ) : (
        <div className="comment-form" id="respond">
          <CommentForm
            postId={postId}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="comment-list">
            <CommentList comments={items} postId={postId} />
          </div>
          {totalPages > 1 && (
            <div className="page-navigator">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <span key={p} className={p === page ? 'current' : ''}>
                  <a
                    href={`#comments-page-${p}`}
                    onClick={(e) => {
                      e.preventDefault()
                      loadPage(p)
                    }}
                  >
                    {p}
                  </a>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
