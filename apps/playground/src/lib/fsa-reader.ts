import type { CrpBundle } from '@cliproot/protocol'
import { validateBundle } from '@cliproot/protocol'

export function isFsaSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

async function findObjectsDir(
  root: FileSystemDirectoryHandle
): Promise<FileSystemDirectoryHandle | null> {
  // Try: root/objects/
  try {
    return await root.getDirectoryHandle('objects')
  } catch {
    // not found
  }

  // Try: root/.cliproot/objects/
  try {
    const cliprootDir = await root.getDirectoryHandle('.cliproot')
    return await cliprootDir.getDirectoryHandle('objects')
  } catch {
    // not found
  }

  return null
}

async function readBundlesFromDir(
  dir: FileSystemDirectoryHandle
): Promise<{ bundles: [string, CrpBundle][]; errors: string[] }> {
  const bundles: [string, CrpBundle][] = []
  const errors: string[] = []

  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== 'file' || !name.endsWith('.json')) continue
    try {
      const file = await (handle as FileSystemFileHandle).getFile()
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      const result = validateBundle(parsed)
      if (result.ok) {
        bundles.push([name, result.value])
      } else {
        errors.push(`${name}: validation failed`)
      }
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { bundles, errors }
}

export async function openCliprootDirectory(): Promise<{
  bundles: [string, CrpBundle][]
  errors: string[]
}> {
  const dirHandle = await window.showDirectoryPicker()
  const objectsDir = await findObjectsDir(dirHandle)

  if (!objectsDir) {
    return {
      bundles: [],
      errors: ['No objects/ directory found. Select a .cliproot/ directory or its parent.']
    }
  }

  return readBundlesFromDir(objectsDir)
}

/**
 * Fallback for browsers without File System Access API.
 * Reads files from an <input type="file" webkitdirectory> FileList.
 */
export async function readBundlesFromFileList(
  files: FileList
): Promise<{ bundles: [string, CrpBundle][]; errors: string[] }> {
  const bundles: [string, CrpBundle][] = []
  const errors: string[] = []

  for (const file of files) {
    // Match files inside an objects/ directory
    const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath
    if (!path) continue
    const parts = path.split('/')
    const inObjects = parts.some((p) => p === 'objects') && file.name.endsWith('.json')
    if (!inObjects) continue

    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      const result = validateBundle(parsed)
      if (result.ok) {
        bundles.push([file.name, result.value])
      } else {
        errors.push(`${file.name}: validation failed`)
      }
    } catch (err) {
      errors.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { bundles, errors }
}
