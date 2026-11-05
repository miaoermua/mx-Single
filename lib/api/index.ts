/**
 * API 客户端封装（v12.x，/api/v2，SDK 4.4.0）
 *
 * SSR 侧统一走 fetch + 适配层，保证 UA 含 mx-space 绕过 SpiderGuard（R7）。
 * 客户端侧不直接调 core（避免暴露跨域与爬虫守卫问题），由 SSR 注水或 route handler 代理。
 *
 * 开发环境无 MX_CORE_URL 时走 mock（FRONTEND_PLAN S1 骨架阶段用假数据）。
 */

import { MX_CORE_URL, MX_SSR_UA, apiUrl, hasCore } from './config'
import {
  adaptCategory,
  adaptComment,
  adaptFriend,
  adaptPage,
  adaptPost,
  adaptPostDetail,
  camelKeys,
  parsePagination,
  unwrap,
  type Comment,
  type Category,
  type FriendLink,
  type PageDetail,
  type PostDetail,
  type PostSummary,
} from './adapter'
import { mockAggregate, mockPosts, mockPostDetail, mockPage, mockComments, mockFriends, mockCategories } from './mock'

/** SSR fetch 专用 headers */
function ssrHeaders(): HeadersInit {
  return {
    'User-Agent': MX_SSR_UA,
    Accept: 'application/json',
  }
}

/** 通用 GET：SSR 直接打 core，返回原始 JSON */
async function get<T>(path: string): Promise<T> {
  if (!hasCore()) {
    // 开发环境无 core，返回 null 由调用方走 mock
    return null as T
  }
  const res = await fetch(apiUrl(path), {
    headers: ssrHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}`)
  }
  return res.json() as Promise<T>
}

/* ---------- 聚合根 ---------- */

export interface AggregateData {
  user?: { name?: string; avatar?: string; description?: string; url?: string }
  seo?: { title?: string; description?: string; keywords?: string }
  url?: { siteUrl?: string }
  theme?: Record<string, unknown>
  categories?: Category[]
  pages?: { title: string; slug: string }[]
}

export async function fetchAggregate(themeName = 'single'): Promise<AggregateData> {
  if (!hasCore()) return mockAggregate
  const raw = await get<Record<string, unknown>>(`/aggregate?theme=${themeName}`)
  const a = camelKeys<Record<string, unknown>>(raw)
  return {
    user: a.user as AggregateData['user'],
    seo: a.seo as AggregateData['seo'],
    url: a.url as AggregateData['url'],
    theme: a.theme as AggregateData['theme'],
    categories: Array.isArray(a.categories)
      ? (a.categories as Record<string, unknown>[]).map(adaptCategory)
      : undefined,
    pages: a.pageMeta as AggregateData['pages'],
  }
}

/* ---------- 文章 ---------- */

export interface PostsListResult {
  items: PostSummary[]
  pagination?: ReturnType<typeof parsePagination>
}

export async function fetchPosts(page = 1, size = 10): Promise<PostsListResult> {
  if (!hasCore()) {
    return { items: mockPosts }
  }
  const raw = await get<unknown>(`/posts?page=${page}&size=${size}`)
  const items = unwrap<Record<string, unknown>[]>(raw).map(adaptPost)
  const pagination = parsePagination(
    (raw as Record<string, unknown>)?.pagination as Record<string, unknown>,
  )
  return { items, pagination }
}

export async function fetchPostDetail(
  category: string,
  slug: string,
): Promise<PostDetail | null> {
  if (!hasCore()) {
    return mockPostDetail
  }
  const raw = await get<Record<string, unknown>>(`/posts/${category}/${slug}`)
  if (!raw) return null
  return adaptPostDetail(raw)
}

/* ---------- 页面 ---------- */

export async function fetchPage(slug: string): Promise<PageDetail | null> {
  if (!hasCore()) {
    return mockPage(slug)
  }
  const raw = await get<Record<string, unknown>>(`/pages/slug/${slug}`)
  if (!raw) return null
  return adaptPage(raw)
}

/* ---------- 分类 / 标签 ---------- */

export async function fetchCategories(type?: 'tag'): Promise<Category[]> {
  if (!hasCore()) return mockCategories
  const path = type ? `/categories?type=${type}` : '/categories'
  const raw = await get<unknown>(path)
  return unwrap<Record<string, unknown>[]>(raw).map(adaptCategory)
}

/* ---------- 评论 ---------- */

export async function fetchComments(
  refId: string,
  page = 1,
  size = 10,
): Promise<{ items: Comment[]; pagination?: ReturnType<typeof parsePagination> }> {
  if (!hasCore()) {
    return { items: mockComments }
  }
  const raw = await get<unknown>(
    `/comments/ref/${refId}?page=${page}&size=${size}&ref=posts`,
  )
  const items = unwrap<Record<string, unknown>[]>(raw).map(adaptComment)
  const pagination = parsePagination(
    (raw as Record<string, unknown>)?.pagination as Record<string, unknown>,
  )
  return { items, pagination }
}

/* ---------- 友链 ---------- */

export async function fetchFriends(): Promise<FriendLink[]> {
  if (!hasCore()) return mockFriends
  const raw = await get<unknown>('/links/all')
  return unwrap<Record<string, unknown>[]>(raw).map(adaptFriend)
}

export { hasCore, MX_CORE_URL }
