export interface ClipCapturedMessage {
  type: 'clip-captured'
  hostname: string
  url: string
  title: string
  textPreview: string
  textHash: string
  fullText: string
  bundleJson: string | null
}

export interface PasteDetectedMessage {
  type: 'paste-detected'
  hostname: string
  url: string
  title: string
  textPreview: string
  textHash: string
  bundleJson: string | null
}

export interface StoredClip {
  id?: number
  textHash: string
  url: string
  hostname: string
  title: string
  timestamp: number
  textPreview: string
  fullText: string
  bundleJson: string | null
}

export interface PasteRecord {
  id?: number
  textHash: string
  sourceClipId: number | null
  url: string
  hostname: string
  title: string
  timestamp: number
  textPreview: string
  bundleJson: string | null
  matchMethod: 'bundle' | 'hash' | 'none'
}

export interface RecentClip {
  url: string
  hostname: string
  title: string
  timestamp: number
  textPreview: string
}

export type SiteSettings = Record<string, boolean | 'default'>
