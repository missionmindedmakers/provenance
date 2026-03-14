import type {
  ClipCapturedMessage,
  PasteDetectedMessage,
  RecentClip,
  GetPageSourcesRequest,
  GenerateBibliographyRequest,
  GetClipDetailRequest,
  SearchClipsRequest,
  PageSource,
} from '../types'
import {
  storeClip,
  storePaste,
  findClipsByTextHash,
  findPastesByUrl,
  getClipById,
  searchClips,
  findPastesBySourceClipId,
} from '../db'

const tabClipCounts = new Map<number, number>()

export default defineBackground(() => {
  // Initialize default state
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ enabled: true, siteSettings: {}, recentClips: [] })
    updateBadge(true, 0)

    chrome.contextMenus.create({
      id: 'cliproot-generate-bibliography',
      title: 'Generate bibliography',
      contexts: ['page'],
    })
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

  // Handle messages from content scripts and popup
  type MessageType =
    | ClipCapturedMessage
    | PasteDetectedMessage
    | GetPageSourcesRequest
    | GenerateBibliographyRequest
    | GetClipDetailRequest
    | SearchClipsRequest

  chrome.runtime.onMessage.addListener(
    (message: MessageType, sender, sendResponse: (response: unknown) => void) => {
      if (message.type === 'clip-captured') {
        handleClipCaptured(message, sender)
      } else if (message.type === 'paste-detected') {
        handlePasteDetected(message)
      } else if (message.type === 'get-page-sources') {
        handleGetPageSources(message.url).then(sendResponse)
        return true
      } else if (message.type === 'generate-bibliography') {
        handleGenerateBibliography(message.url, message.format).then(sendResponse)
        return true
      } else if (message.type === 'get-clip-detail') {
        handleGetClipDetail(message.clipId).then(sendResponse)
        return true
      } else if (message.type === 'search-clips') {
        handleSearchClips(message.query).then(sendResponse)
        return true
      }
    }
  )

  // Context menu handler
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'cliproot-generate-bibliography' && tab?.url) {
      handleGenerateBibliography(tab.url, 'markdown').then((result) => {
        if (result.sourceCount === 0) return
        if (tab.id === undefined) return
        // Copy to clipboard via content script injection
        const code = `navigator.clipboard.writeText(${JSON.stringify(result.text)})`
        if (chrome.scripting?.executeScript) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (text: string) => { navigator.clipboard.writeText(text) },
            args: [result.text],
          })
        } else {
          // Firefox MV2 fallback
          browser.tabs.executeScript(tab.id, { code })
        }
      })
    }
  })

  async function handleGetPageSources(url: string) {
    const pastes = await findPastesByUrl(url)
    const sourceMap = new Map<number, { clip: Awaited<ReturnType<typeof getClipById>>; pastes: typeof pastes }>()

    for (const paste of pastes) {
      if (paste.sourceClipId === null) continue
      if (!sourceMap.has(paste.sourceClipId)) {
        const clip = await getClipById(paste.sourceClipId)
        sourceMap.set(paste.sourceClipId, { clip, pastes: [] })
      }
      sourceMap.get(paste.sourceClipId)!.pastes.push(paste)
    }

    const sources: PageSource[] = []
    for (const [, { clip, pastes: clipPastes }] of sourceMap) {
      if (!clip) continue
      sources.push({
        hostname: clip.hostname,
        url: clip.url,
        title: clip.title,
        clipCount: clipPastes.length,
        clips: clipPastes.map((p) => ({
          id: clip.id!,
          textPreview: p.textPreview,
          timestamp: p.timestamp,
        })),
      })
    }

    return { sources }
  }

  async function handleGenerateBibliography(url: string, format: 'markdown' | 'numbered' | 'plain') {
    const { sources } = await handleGetPageSources(url)

    if (sources.length === 0) {
      return { text: '', sourceCount: 0 }
    }

    // Deduplicate by source URL
    const seen = new Set<string>()
    const unique = sources.filter((s) => {
      if (seen.has(s.url)) return false
      seen.add(s.url)
      return true
    })

    let text: string
    if (format === 'markdown') {
      text = unique.map((s) => `- [${s.title || s.hostname}](${s.url})`).join('\n')
    } else if (format === 'numbered') {
      text = unique.map((s, i) => `${i + 1}. ${s.title || s.hostname} — ${s.url}`).join('\n')
    } else {
      text = unique.map((s) => `${s.title || s.hostname}: ${s.url}`).join('\n')
    }

    return { text, sourceCount: unique.length }
  }

  async function handleGetClipDetail(clipId: number) {
    const clip = (await getClipById(clipId)) ?? null
    const pastes = clip ? await findPastesBySourceClipId(clipId) : []
    return { clip, pastes }
  }

  async function handleSearchClips(query: string) {
    const clips = await searchClips(query)
    return { clips }
  }

  function handleClipCaptured(message: ClipCapturedMessage, sender: chrome.runtime.MessageSender) {
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

    // Store in IndexedDB
    storeClip({
      textHash: message.textHash,
      url: message.url,
      hostname: message.hostname,
      title: message.title,
      timestamp: Date.now(),
      textPreview: message.textPreview,
      fullText: message.fullText,
      bundleJson: message.bundleJson,
    }).catch(() => {
      // Best-effort — IndexedDB may be unavailable
    })

    // Update badge with count
    chrome.storage.local.get(['enabled', 'siteSettings'], (result: Record<string, unknown>) => {
      const globalEnabled = result.enabled !== false
      const siteSettings = result.siteSettings as Record<string, boolean | 'default'> | undefined
      const hostname = message.hostname
      const effective = effectiveEnabled(globalEnabled, hostname, siteSettings)
      updateBadge(effective, count, tabId)
    })
  }

  function handlePasteDetected(message: PasteDetectedMessage) {
    findClipsByTextHash(message.textHash).then((matchedClips) => {
      let matchMethod: 'bundle' | 'hash' | 'none'
      let sourceClipId: number | null = null

      if (message.bundleJson) {
        matchMethod = 'bundle'
        // Still try to link to a stored clip if we have a hash match
        if (matchedClips.length > 0) {
          sourceClipId = matchedClips[0].id ?? null
        }
      } else if (matchedClips.length > 0) {
        matchMethod = 'hash'
        sourceClipId = matchedClips[0].id ?? null
      } else {
        matchMethod = 'none'
      }

      return storePaste({
        textHash: message.textHash,
        sourceClipId,
        url: message.url,
        hostname: message.hostname,
        title: message.title,
        timestamp: Date.now(),
        textPreview: message.textPreview,
        bundleJson: message.bundleJson,
        matchMethod,
      })
    }).catch(() => {
      // Best-effort — IndexedDB may be unavailable
    })
  }

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
