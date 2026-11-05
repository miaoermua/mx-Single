/**
 * v12.x 数据适配层（FRONTEND_PLAN.md 第 5 节）
 *
 * 职责（仅一件）：
 * - 把 core 返回的 snake_case 信封拆包、分页字段、时间/计数字段、评论树 children
 *   整理成统一 camelCase 模型。
 *
 * v12.x 形态（COMPATIBILITY.md 第 11 节左列）：
 * - 响应：对象原样 / 数组包 {data}
 * - 分页：顶层 pagination 六字段
 * - 时间/计数：created/modified、count.read/like
 * - 正文：text（Markdown 原文）
 * - 评论树：children 嵌套（≤10 层）
 *
 * v13+ 差异（统一信封、meta.pagination、thread、Lexical）不实现。
 */

/* ---------- 通用工具 ---------- */

type AnyObj = Record<string, unknown>

/** snake_case → camelCase（浅层，只转顶层 key） */
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/** 把对象顶层 key 转 camelCase */
export function camelKeys<T = AnyObj>(obj: AnyObj): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj as T
  }
  const out: AnyObj = {}
  for (const k of Object.keys(obj)) {
    out[toCamel(k)] = obj[k]
  }
  return out as T
}

/** 拆信封：v12.x 数组包 {data}、对象原样 */
export function unwrap<T>(raw: unknown): T {
  if (Array.isArray(raw)) return raw as T
  if (raw && typeof raw === 'object') {
    const o = raw as AnyObj
    if (Array.isArray(o.data)) return o.data as T
  }
  return raw as T
}

/* ---------- 分页 ---------- */

export interface Pagination {
  page: number
  size: number
  total: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
}

export function parsePagination(raw: AnyObj): Pagination | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const p = camelKeys<AnyObj>(raw)
  if (typeof p.page !== 'number') return undefined
  return {
    page: Number(p.page),
    size: Number(p.size),
    total: Number(p.total),
    totalPages: Number(p.totalPages),
    hasPrev: !!p.hasPrev,
    hasNext: !!p.hasNext,
  }
}

/* ---------- 文章 / 页面 ---------- */

export interface PostSummary {
  id: string
  title: string
  slug: string
  category?: string
  categorySlug?: string
  tags?: string[]
  summary?: string
  created: string
  modified?: string
  count?: { read?: number; like?: number; comments?: number }
  cover?: string
  images?: string[]
}

export interface PostDetail extends PostSummary {
  text: string
  allowComment?: boolean
  copyright?: boolean
  modified?: string
}

export interface PageDetail {
  id: string
  title: string
  slug: string
  text: string
  created: string
  modified?: string
  allowComment?: boolean
}

/** 适配单条文章摘要（来自列表） */
export function adaptPost(raw: AnyObj): PostSummary {
  const p = camelKeys<AnyObj>(raw)
  const count = p.count as AnyObj | undefined
  return {
    id: String(p.id ?? p._id ?? ''),
    title: String(p.title ?? ''),
    slug: String(p.slug ?? ''),
    category: (p.category as AnyObj)?.name as string | undefined,
    categorySlug: (p.category as AnyObj)?.slug as string | undefined,
    tags: p.tags as string[] | undefined,
    summary: p.summary as string | undefined,
    created: String(p.created ?? ''),
    modified: p.modified as string | undefined,
    count: count
      ? {
          read: count.read as number | undefined,
          like: count.like as number | undefined,
          comments: count.comments as number | undefined,
        }
      : undefined,
    cover: p.cover as string | undefined,
    images: p.images as string[] | undefined,
  }
}

/** 适配文章详情 */
export function adaptPostDetail(raw: AnyObj): PostDetail {
  const base = adaptPost(raw)
  const p = camelKeys<AnyObj>(raw)
  return {
    ...base,
    text: String(p.text ?? ''),
    allowComment: p.allowComment as boolean | undefined,
    copyright: p.copyright as boolean | undefined,
  }
}

/** 适配独立页面 */
export function adaptPage(raw: AnyObj): PageDetail {
  const p = camelKeys<AnyObj>(raw)
  return {
    id: String(p.id ?? p._id ?? ''),
    title: String(p.title ?? ''),
    slug: String(p.slug ?? ''),
    text: String(p.text ?? ''),
    created: String(p.created ?? ''),
    modified: p.modified as string | undefined,
    allowComment: p.allowComment as boolean | undefined,
  }
}

/* ---------- 分类 / 标签 ---------- */

export interface Category {
  id: string
  name: string
  slug: string
  count: number
}

export function adaptCategory(raw: AnyObj): Category {
  const p = camelKeys<AnyObj>(raw)
  return {
    id: String(p.id ?? p._id ?? ''),
    name: String(p.name ?? ''),
    slug: String(p.slug ?? ''),
    count: Number(p.count ?? 0),
  }
}

/* ---------- 评论 ---------- */

export interface Comment {
  id: string
  author: string
  avatar?: string
  content: string
  created: string
  url?: string
  mailHash?: string
  isWhispers?: boolean
  pin?: boolean
  parent?: string
  children?: Comment[]
}

export function adaptComment(raw: AnyObj): Comment {
  const p = camelKeys<AnyObj>(raw)
  const childrenRaw = p.children as AnyObj[] | undefined
  return {
    id: String(p.id ?? p._id ?? ''),
    author: String(p.author ?? ''),
    avatar: p.avatar as string | undefined,
    content: String(p.content ?? ''),
    created: String(p.created ?? ''),
    url: p.url as string | undefined,
    mailHash: p.mailHash as string | undefined,
    isWhispers: p.isWhispers as boolean | undefined,
    pin: p.pin as boolean | undefined,
    parent: p.parent as string | undefined,
    children: childrenRaw?.map(adaptComment),
  }
}

/* ---------- 友链 ---------- */

export interface FriendLink {
  id: string
  name: string
  url: string
  avatar?: string
  description?: string
  type?: string
  state?: number
}

export function adaptFriend(raw: AnyObj): FriendLink {
  const p = camelKeys<AnyObj>(raw)
  return {
    id: String(p.id ?? p._id ?? ''),
    name: String(p.name ?? ''),
    url: String(p.url ?? ''),
    avatar: p.avatar as string | undefined,
    description: p.description as string | undefined,
    type: p.type as string | undefined,
    state: p.state as number | undefined,
  }
}
