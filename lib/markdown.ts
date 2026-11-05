/**
 * Markdown 渲染管线（FRONTEND_PLAN.md 第 7 节）
 *
 * S1 骨架阶段先放占位实现：marked 基础渲染 + 标题加 id。
 * S3 阶段补 Prism 高亮、外链 target、图片灯箱标记、TOC 生成、文本宏。
 */

import { marked } from 'marked'

marked.setOptions({
  breaks: false,
  gfm: true,
})

/**
 * 渲染 Markdown 为 HTML，并给 h1~h6 加 id="title-{index}"。
 * id 供目录树（ArticleTree）与 scroll-margin-top 使用。
 */
export function renderMarkdown(text: string): string {
  if (!text) return ''
  let headingIndex = 0
  const renderer = new marked.Renderer()
  renderer.heading = (text: string, level: number) => {
    headingIndex += 1
    const id = `title-${headingIndex}`
    return `<h${level} id="${id}">${text}</h${level}>`
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
  for (const line of lines) {
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
