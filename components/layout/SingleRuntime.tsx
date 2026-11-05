'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * 运行时效果（FRONTEND_PLAN.md 第 4.1 节）
 *
 * single.js 的 10 条行为逐条用 React effects 重写。
 * 必须在路由变更 / 正文就绪后重新绑定，卸载时清理监听（R3 SPA 陷阱）。
 *
 * 本组件挂在 layout.tsx，以 usePathname() 作为 effect 依赖。
 */
export function SingleRuntime({
  copyNotice,
  nightMode,
}: {
  copyNotice: boolean
  nightMode: '0' | '1' | '2'
}) {
  const pathname = usePathname()

  // 1. 菜单折叠（:21-23）：.toggle-btn 切换 .head-menu.active
  // 2. 搜索框展开（:27-32）：.search-btn 切换 .head-search.active
  useEffect(() => {
    const toggleBtn = document.querySelector('.toggle-btn')
    const headMenu = document.querySelector('.head-menu')
    const searchBtn = document.querySelector('.search-btn')
    const headSearch = document.querySelector('.head-search')

    const onToggle = () => headMenu?.classList.toggle('active')
    const onSearch = () => headSearch?.classList.toggle('active')

    toggleBtn?.addEventListener('click', onToggle)
    searchBtn?.addEventListener('click', onSearch)
    return () => {
      toggleBtn?.removeEventListener('click', onToggle)
      searchBtn?.removeEventListener('click', onSearch)
      headMenu?.classList.remove('active')
      headSearch?.classList.remove('active')
    }
  }, [pathname])

  // 3. 夜间切换 + cookie night（max-age 21600，:36-45）
  //    night_mode='2' 始终暗、'1' 按时、'0' 关闭自动
  useEffect(() => {
    const lightBtn = document.querySelector('.light-btn')
    if (!lightBtn) return

    const applyNight = (on: boolean) => {
      document.body.classList.toggle('dark-theme', on)
      document.cookie = `night=${on ? '1' : '0'};path=/;max-age=21600`
    }

    const onLight = () => {
      applyNight(!document.body.classList.contains('dark-theme'))
    }
    lightBtn.addEventListener('click', onLight)

    // night_mode='2' 始终暗
    if (nightMode === '2' && !document.cookie.includes('night=')) {
      applyNight(true)
    }

    return () => {
      lightBtn.removeEventListener('click', onLight)
    }
  }, [pathname, nightMode])

  // 4. 22:00-05:00 自动夜间；无 cookie 才生效（:159-174）
  useEffect(() => {
    if (nightMode !== '1') return
    if (document.cookie.includes('night=')) return
    const h = new Date().getHours()
    if (h >= 22 || h < 5) {
      document.body.classList.add('dark-theme')
    }
  }, [pathname, nightMode])

  // 5. 返回顶部（:136-156）：滚动过半屏 .to-top.active
  useEffect(() => {
    const toTop = document.querySelector('.to-top') as HTMLElement | null
    if (!toTop) return

    const onScroll = () => {
      const half = window.innerHeight / 2
      toTop.classList.toggle('active', window.scrollY > half)
    }
    const onClick = (e: Event) => {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('scroll', onScroll)
    toTop.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('scroll', onScroll)
      toTop.removeEventListener('click', onClick)
    }
  }, [pathname])

  // 6. 复制提示（:177-181）：document.oncopy 弹 Kico 风格 toast
  useEffect(() => {
    if (!copyNotice) return

    const showNotice = () => {
      // 简易 toast，视觉对齐 .ks-notice.yellow
      const n = document.createElement('div')
      n.className = 'ks-notice yellow'
      n.textContent = '转载请保留原文出处！'
      n.style.cssText =
        'position:fixed;top:1em;left:50%;transform:translateX(-50%);z-index:9999;'
      document.body.appendChild(n)
      setTimeout(() => n.remove(), 2000)
    }

    document.addEventListener('copy', showNotice)
    return () => document.removeEventListener('copy', showNotice)
  }, [pathname, copyNotice])

  // 7. Prism 高亮（S3 阶段细化；先保证路由变更后重跑）
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Prism) {
      ;(window as any).Prism.highlightAll()
    }
  }, [pathname])

  return null
}
