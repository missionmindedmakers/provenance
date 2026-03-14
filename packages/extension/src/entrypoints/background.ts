import type { ClipCapturedMessage, RecentClip } from '../types'

const tabClipCounts = new Map<number, number>()

export default defineBackground(() => {
  // Initialize default state
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ enabled: true, siteSettings: {}, recentClips: [] })
    updateBadge(true, 0)
  })

  // Sync badge with storage state on startup
  chrome.storage.local.get(['enabled', 'siteSettings'], (result: Record<string, unknown>) => {
    const globalEnabled = result.enabled !== false
    updateBadgeForCurrentTab(globalEnabled, result.siteSettings as Record<string, boolean | 'default'> | undefined)
  })

  chrome.storage.onChanged.addListener((changes: Record<string, chrome.storage.StorageChange>) => {
    if (changes.enabled || changes.siteSettings) {
      chrome.storage.local.get(['enabled', 'siteSettings'], (result: Record<string, unknown>) => {
        const globalEnabled = result.enabled !== false
        updateBadgeForCurrentTab(globalEnabled, result.siteSettings as Record<string, boolean | 'default'> | undefined)
      })
    }
  })

  // Handle clip-captured messages from content scripts
  chrome.runtime.onMessage.addListener((message: ClipCapturedMessage, sender) => {
    if (message.type !== 'clip-captured') return

    const tabId = sender.tab?.id
    if (tabId === undefined) return

    // Increment per-tab count
    const count = (tabClipCounts.get(tabId) ?? 0) + 1
    tabClipCounts.set(tabId, count)

    // Persist to recentClips storage (FIFO, last 50)
    const clip: RecentClip = {
      url: message.url,
      hostname: message.hostname,
      title: message.title,
      timestamp: Date.now(),
      textPreview: message.textPreview,
    }

    chrome.storage.local.get(['recentClips'], (result: Record<string, unknown>) => {
      const existing = (result.recentClips as RecentClip[]) ?? []
      const updated = [clip, ...existing].slice(0, 50)
      chrome.storage.local.set({ recentClips: updated })
    })

    // Update badge with count
    chrome.storage.local.get(['enabled', 'siteSettings'], (result: Record<string, unknown>) => {
      const globalEnabled = result.enabled !== false
      const siteSettings = result.siteSettings as Record<string, boolean | 'default'> | undefined
      const hostname = message.hostname
      const effective = effectiveEnabled(globalEnabled, hostname, siteSettings)
      updateBadge(effective, count, tabId)
    })
  })

  // Refresh badge when user switches tabs
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.storage.local.get(['enabled', 'siteSettings'], (result: Record<string, unknown>) => {
      const globalEnabled = result.enabled !== false
      const siteSettings = result.siteSettings as Record<string, boolean | 'default'> | undefined
      const count = tabClipCounts.get(tabId) ?? 0
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab.url) {
          updateBadge(globalEnabled, count)
          return
        }
        const hostname = hostnameFromUrl(tab.url)
        const effective = effectiveEnabled(globalEnabled, hostname, siteSettings)
        updateBadge(effective, count, tabId)
      })
    })
  })

  // Reset count on navigation, clean up on tab close
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      tabClipCounts.delete(tabId)
    }

    if (changeInfo.status === 'complete') {
      chrome.storage.local.get(['enabled', 'siteSettings'], (result: Record<string, unknown>) => {
        const globalEnabled = result.enabled !== false
        const siteSettings = result.siteSettings as Record<string, boolean | 'default'> | undefined
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError || !tab.url) return
          const hostname = hostnameFromUrl(tab.url)
          const effective = effectiveEnabled(globalEnabled, hostname, siteSettings)
          const count = tabClipCounts.get(tabId) ?? 0
          updateBadge(effective, count, tabId)
        })
      })
    }
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    tabClipCounts.delete(tabId)
  })
})

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

function effectiveEnabled(
  globalEnabled: boolean,
  hostname: string,
  siteSettings: Record<string, boolean | 'default'> | undefined
): boolean {
  const override = siteSettings?.[hostname]
  if (override !== undefined && override !== 'default') return override as boolean
  return globalEnabled
}

function updateBadgeForCurrentTab(
  globalEnabled: boolean,
  siteSettings: Record<string, boolean | 'default'> | undefined
) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0]
    if (!tab?.url) {
      updateBadge(globalEnabled, 0)
      return
    }
    const hostname = hostnameFromUrl(tab.url)
    const effective = effectiveEnabled(globalEnabled, hostname, siteSettings)
    const count = tab.id !== undefined ? (tabClipCounts.get(tab.id) ?? 0) : 0
    updateBadge(effective, count, tab.id)
  })
}

function updateBadge(enabled: boolean, clipCount: number, tabId?: number) {
  const color = enabled ? '#22c55e' : '#9ca3af'

  let text: string
  if (!enabled) {
    text = 'OFF'
  } else if (clipCount > 0) {
    text = String(clipCount)
  } else {
    text = ''
  }

  const opts = tabId !== undefined ? { color, tabId } : { color }
  const textOpts = tabId !== undefined ? { text, tabId } : { text }

  chrome.action.setBadgeBackgroundColor(opts)
  chrome.action.setBadgeText(textOpts)
}
