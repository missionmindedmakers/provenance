import type { StoredClip, PasteRecord } from './types'

const DB_NAME = 'cliproot'
const DB_VERSION = 1

let dbInstance: IDBDatabase | null = null

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains('clips')) {
        const clips = db.createObjectStore('clips', { keyPath: 'id', autoIncrement: true })
        clips.createIndex('textHash', 'textHash', { unique: false })
        clips.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (!db.objectStoreNames.contains('pastes')) {
        const pastes = db.createObjectStore('pastes', { keyPath: 'id', autoIncrement: true })
        pastes.createIndex('textHash', 'textHash', { unique: false })
        pastes.createIndex('timestamp', 'timestamp', { unique: false })
        pastes.createIndex('sourceClipId', 'sourceClipId', { unique: false })
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
