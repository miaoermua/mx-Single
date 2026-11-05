/**
 * Markdown 渲染管线（FRONTEND_PLAN.md 第 7 节）
 *
 * 产出与原主题一致形状的 DOM：
 * - h1~h6 加 id="title-{index}"（供目录树与 scroll-margin-top:5em）
 * - pre>code 加 class="language-xxx"；Prism 高亮产出 .token.*
 * - img 保留 src，交给 Lightbox（暗色由 CSS 统一 brightness(60%)）
 * - a 站外加 target=_blank rel=noreferrer；站内不加
 * - blockquote/table/ul/ol/hr/em 保持原生标签
 */

import { marked } from 'marked'

marked.setOptions({
  breaks: false,
  gfm: true,
})

/** 判断是否站内链接（同源或以 / 开头） */
function isInternal(href: string): boolean {
  if (!href) return true
  if (href.startsWith('/')) return true
  if (href.startsWith('#')) return true
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return true
  try {
    const u = new URL(href)
    return u.hostname === (typeof window !== 'undefined' ? window.location.hostname : 'localhost')
  } catch {
    return false
  }
}

/**
 * 渲染 Markdown 为 HTML，并给 h1~h6 加 id="title-{index}"。
 * id 供目录树（ArticleTree）与 scroll-margin-top 使用。
 */
export function renderMarkdown(text: string): string {
  if (!text) return ''
  let headingIndex = 0
  const renderer = new marked.Renderer()

  // 标题：加 id
  renderer.heading = (text: string, level: number) => {
    headingIndex += 1
    const id = `title-${headingIndex}`
    return `<h${level} id="${id}">${text}</h${level}>`
  }

  // 链接：站外加 target=_blank rel=noreferrer（:109-119）
  renderer.link = (href: string, _title: string, text: string) => {
    const safe = href.replace(/"/g, '&quot;')
    if (isInternal(href)) {
      return `<a href="${safe}">${text}</a>`
    }
    return `<a href="${safe}" target="_blank" rel="noreferrer">${text}</a>`
  }

  // 代码块：加 language-xxx class（Prism 需要）
  renderer.code = (code: string, language: string | undefined) => {
    const lang = language ? ` language-${language}` : ''
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<pre><code class="${lang.trim()}">${escaped}</code></pre>`
  }

  const html = marked.parse(text, { renderer } as Parameters<typeof marked.parse>[1])
  return typeof html === 'string' ? html : ''
}

export interface TocHeading {
  level: number
  id: string
  text: string
}

/**
 * 从 Markdown 提取标题列表，生成 TOC（FRONTEND_PLAN 第 7 节）。
 * 生成规则照抄 single.js:48-106：统计各级标题数得出 firstLevel。
 */
export function extractHeadings(text: string): TocHeading[] {
  const lines = text.split('\n')
  const headings: TocHeading[] = []
  let idx = 0
  let inCodeBlock = false
  for (const line of lines) {
    // 跳过代码围栏内的内容
    if (/^```/.test(line.trim())) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue
    const m = /^(#{1,6})\s+(.+)$/.exec(line)
    if (m) {
      idx += 1
      headings.push({
        level: m[1].length,
        id: `title-${idx}`,
        text: m[2].trim(),
      })
    }
  }
  return headings
}

/**
 * 计算 TOC 的 firstLevel（最小标题级别），用于 level = tagLevel - firstLevel + 1。
 */
export function firstLevel(headings: TocHeading[]): number {
  if (!headings.length) return 1
  return Math.min(...headings.map((h) => h.level))
}
