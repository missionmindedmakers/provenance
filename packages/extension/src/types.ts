export interface ClipCapturedMessage {
  type: 'clip-captured'
  hostname: string
  url: string
  title: string
  textPreview: string
}

export interface RecentClip {
  url: string
  hostname: string
  title: string
  timestamp: number
  textPreview: string
}

export type SiteSettings = Record<string, boolean | 'default'>
