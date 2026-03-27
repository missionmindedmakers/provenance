import type { StoredClip, StoredDocument, StoredDerivationEdge, StoredActivity } from './types'

const DB_NAME = 'cliproot'
const DB_VERSION = 3

let dbInstance: IDBDatabase | null = null

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = request.result
      const oldVersion = event.oldVersion

      if (oldVersion < 3) {
        // Delete old stores from v1/v2 if they exist
        if (db.objectStoreNames.contains('clips')) {
          db.deleteObjectStore('clips')
        }
        if (db.objectStoreNames.contains('pastes')) {
          db.deleteObjectStore('pastes')
        }

        // Create new CRP-aligned stores
        const documents = db.createObjectStore('documents', { keyPath: 'id' })
        documents.createIndex('uri', 'uri', { unique: false })

        const clips = db.createObjectStore('clips', { keyPath: 'clipHash' })
        clips.createIndex('textHash', 'textHash', { unique: false })
        clips.createIndex('documentId', 'documentId', { unique: false })

        const edges = db.createObjectStore('derivationEdges', { keyPath: 'id' })
        edges.createIndex('parentClipHash', 'parentClipHash', { unique: false })
        edges.createIndex('childClipHash', 'childClipHash', { unique: false })

        const activities = db.createObjectStore('activities', { keyPath: 'id' })
        activities.createIndex('createdAt', 'createdAt', { unique: false })
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

export async function storeDocument(doc: StoredDocument): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite')
    const store = tx.objectStore('documents')
    const request = store.put(doc)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function storeClip(clip: StoredClip): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clips', 'readwrite')
    const store = tx.objectStore('clips')
    const request = store.put(clip)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function storeDerivationEdge(edge: StoredDerivationEdge): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('derivationEdges', 'readwrite')
    const store = tx.objectStore('derivationEdges')
    const request = store.put(edge)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function storeActivity(activity: StoredActivity): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('activities', 'readwrite')
    const store = tx.objectStore('activities')
    const request = store.put(activity)
    request.onsuccess = () => resolve()
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

export async function getClipByHash(clipHash: string): Promise<StoredClip | undefined> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clips', 'readonly')
    const store = tx.objectStore('clips')
    const request = store.get(clipHash)
    request.onsuccess = () => resolve(request.result as StoredClip | undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function findEdgesByParentClipHash(
  parentClipHash: string
): Promise<StoredDerivationEdge[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('derivationEdges', 'readonly')
    const store = tx.objectStore('derivationEdges')
    const index = store.index('parentClipHash')
    const request = index.getAll(parentClipHash)
    request.onsuccess = () => resolve(request.result as StoredDerivationEdge[])
    request.onerror = () => reject(request.error)
  })
}

export async function findEdgesByChildClipHash(
  childClipHash: string
): Promise<StoredDerivationEdge[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('derivationEdges', 'readonly')
    const store = tx.objectStore('derivationEdges')
    const index = store.index('childClipHash')
    const request = index.getAll(childClipHash)
    request.onsuccess = () => resolve(request.result as StoredDerivationEdge[])
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
      if (clip.content.toLowerCase().includes(lowerQuery)) {
        results.push(clip)
      }
      cursor.continue()
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getDocumentById(id: string): Promise<StoredDocument | undefined> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly')
    const store = tx.objectStore('documents')
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result as StoredDocument | undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function findDocumentsByUri(uri: string): Promise<StoredDocument[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly')
    const store = tx.objectStore('documents')
    const index = store.index('uri')
    const request = index.getAll(uri)
    request.onsuccess = () => resolve(request.result as StoredDocument[])
    request.onerror = () => reject(request.error)
  })
}

export async function findClipsByDocumentId(documentId: string): Promise<StoredClip[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clips', 'readonly')
    const store = tx.objectStore('clips')
    const index = store.index('documentId')
    const request = index.getAll(documentId)
    request.onsuccess = () => resolve(request.result as StoredClip[])
    request.onerror = () => reject(request.error)
  })
}
