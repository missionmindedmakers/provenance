/// <reference types="vite/client" />

// File System Access API types (Chromium)
interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
  getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>
  getFileHandle(name: string): Promise<FileSystemFileHandle>
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
}

interface Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>
}
