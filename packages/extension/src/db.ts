import type { StoredClip, PasteRecord } from './types'

const DB_NAME = 'cliproot'
const DB_VERSION = 2

let dbInstance: IDBDatabase | null = null

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = request.result
      const oldVersion = event.oldVersion

      if (oldVersion < 1) {
        const clips = db.createObjectStore('clips', { keyPath: 'id', autoIncrement: true })
        clips.createIndex('textHash', 'textHash', { unique: false })
        clips.createIndex('timestamp', 'timestamp', { unique: false })

        const pastes = db.createObjectStore('pastes', { keyPath: 'id', autoIncrement: true })
        pastes.createIndex('textHash', 'textHash', { unique: false })
        pastes.createIndex('timestamp', 'timestamp', { unique: false })
        pastes.createIndex('sourceClipId', 'sourceClipId', { unique: false })
      }

      if (oldVersion < 2) {
        const tx = (event.target as IDBOpenDBRequest).transaction!
        const pastesStore = tx.objectStore('pastes')
        if (!pastesStore.indexNames.contains('url')) {
          pastesStore.createIndex('url', 'url', { unique: false })
        }
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  const db = await openDb()
  db.onclose = () => {
    dbInstance = null
  }
  dbInstance = db
  return db
}

export async function storeClip(clip: Omit<StoredClip, 'id'>): Promise<number> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clips', 'readwrite')
    const store = tx.objectStore('clips')
    const request = store.add(clip)
    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => reject(request.error)
  })
}

export async function storePaste(paste: Omit<PasteRecord, 'id'>): Promise<number> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pastes', 'readwrite')
    const store = tx.objectStore('pastes')
    const request = store.add(paste)
    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => reject(request.error)
  })
}

export async function findClipsByTextHash(textHash: string): Promise<StoredClip[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clips', 'readonly')
    const store = tx.objectStore('clips')
    const index = store.index('textHash')
    const request = index.getAll(textHash)
    request.onsuccess = () => resolve(request.result as StoredClip[])
    request.onerror = () => reject(request.error)
  })
}

export async function findPastesByUrl(url: string): Promise<PasteRecord[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pastes', 'readonly')
    const store = tx.objectStore('pastes')
    const index = store.index('url')
    const request = index.getAll(url)
    request.onsuccess = () => resolve(request.result as PasteRecord[])
    request.onerror = () => reject(request.error)
  })
}

export async function getClipById(id: number): Promise<StoredClip | undefined> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clips', 'readonly')
    const store = tx.objectStore('clips')
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result as StoredClip | undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function searchClips(query: string): Promise<StoredClip[]> {
  const db = await getDb()
  const lowerQuery = query.toLowerCase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clips', 'readonly')
    const store = tx.objectStore('clips')
    const request = store.openCursor()
    const results: StoredClip[] = []

    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        resolve(results)
        return
      }
      const clip = cursor.value as StoredClip
      if (
        clip.textPreview.toLowerCase().includes(lowerQuery) ||
        clip.fullText.toLowerCase().includes(lowerQuery)
      ) {
        results.push(clip)
      }
      cursor.continue()
    }
    request.onerror = () => reject(request.error)
  })
}

export async function findPastesBySourceClipId(sourceClipId: number): Promise<PasteRecord[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pastes', 'readonly')
    const store = tx.objectStore('pastes')
    const index = store.index('sourceClipId')
    const request = index.getAll(sourceClipId)
    request.onsuccess = () => resolve(request.result as PasteRecord[])
    request.onerror = () => reject(request.error)
  })
}
