/**
 * GET /api/link-preview?url=<http(s)://...> —— 【额外实现，非 Single 标准】
 *
 * kami 扩展能力移植：外链卡片（LinkCard source=external）的 metadata 代理。
 * 核心逻辑在 lib/link-preview.ts（与 SSR 预取共用），本文件仅做参数校验与响应封装。
 * 平移自 my-kami/src/pages/api/link-preview.tsx（Pages Router → App Router route handler）。
 *
 * 原 Single（Typecho 主题）没有此接口。
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  LinkPreviewError,
  fetchLinkMetadata,
} from '@/lib/link-preview'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const queryValue = req.nextUrl.searchParams.get('url')
  if (!queryValue) {
    return NextResponse.json(
      { error: 'Missing url query parameter' },
      { status: 400 },
    )
  }

  try {
    const data = await fetchLinkMetadata(queryValue)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof LinkPreviewError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 },
    )
  }
}
