/**
 * Single 主题配置模型（FRONTEND_PLAN.md 第 5.3 节）
 *
 * 对应 docs/config.test.yaml 的 11 项原配置 + 2 项 mx 新增。
 * Snippet reference='theme'、公开，通过 GET /aggregate?theme=single 读取。
 */

export interface HomeSocialItem {
  title: string
  url: string
  icon?: string
  svg?: string
}

export interface WallpaperConfig {
  enabled: boolean
  source: 'api' | 'cdn' | 'static'
  fallback: 'api' | 'cdn' | 'static'
  cdnList?: string[]
  range?: [number, number]
  static_url?: string
}

export interface NavExtra {
  archive?: boolean
  notes?: boolean
  says?: boolean
  timeline?: boolean
  friends?: boolean
}

export interface ArchiveMetaFlag {
  show_category?: boolean
  show_tags?: boolean
  show_comments?: boolean
}

export interface SingleThemeConfig {
  favicon?: string
  background?: string
  home_social?: HomeSocialItem[]
  custom_css?: string
  custom_script?: string
  author_text?: string
  /** '0' 关闭 | '1' 按时 | '2' 始终 */
  night_mode?: '0' | '1' | '2'
  copy_notice?: '0' | '1'
  widget_set?: '0' | '1'
  archive_meta?: ArchiveMetaFlag[]
  post_meta?: ArchiveMetaFlag[]
  wallpaper?: WallpaperConfig
  nav_extra?: NavExtra
  /** ICP 备案号（显示在页脚 Single 右边），不填则不输出 */
  beian?: string
}

/** 默认值（与 docs/config.test.yaml 对齐） */
export const DEFAULT_THEME_CONFIG: SingleThemeConfig = {
  favicon: '/img/icon.png',
  background: 'https://api.paugram.com/wallpaper?source=gt',
  home_social: [],
  custom_css: '',
  custom_script: '',
  author_text: '',
  night_mode: '0',
  copy_notice: '1',
  widget_set: '1',
  archive_meta: [{ show_category: true }, { show_comments: true }],
  post_meta: [{ show_category: true }, { show_comments: true }],
  wallpaper: {
    enabled: true,
    source: 'api',
    fallback: 'cdn',
    cdnList: [
      'https://cdn.jsdelivr.net/gh/Dreamer-Paul/Anime-Wallpaper@master/{n}.jpg',
    ],
    range: [1, 120],
    static_url: '',
  },
  nav_extra: {
    archive: true,
    notes: true,
    says: true,
    timeline: true,
    friends: true,
  },
}

/** 把 Snippet 配置与默认值合并（浅合并数组/对象字段） */
export function mergeThemeConfig(
  partial?: Partial<SingleThemeConfig>,
): SingleThemeConfig {
  if (!partial) return DEFAULT_THEME_CONFIG
  return {
    ...DEFAULT_THEME_CONFIG,
    ...partial,
    wallpaper: {
      ...DEFAULT_THEME_CONFIG.wallpaper,
      ...(partial.wallpaper || {}),
    } as WallpaperConfig,
    nav_extra: {
      ...DEFAULT_THEME_CONFIG.nav_extra,
      ...(partial.nav_extra || {}),
    },
  }
}

/** archive_meta / post_meta 存成 flag 数组，这里转成可查询结构 */
export function metaFlags(
  arr?: ArchiveMetaFlag[],
): Required<ArchiveMetaFlag> {
  const flags: Required<ArchiveMetaFlag> = {
    show_category: false,
    show_tags: false,
    show_comments: false,
  }
  if (!arr) return flags
  for (const item of arr) {
    if (item.show_category) flags.show_category = true
    if (item.show_tags) flags.show_tags = true
    if (item.show_comments) flags.show_comments = true
  }
  return flags
}
