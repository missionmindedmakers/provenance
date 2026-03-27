import { defineConfig } from 'wxt'

export default defineConfig({
  srcDir: 'src',
  browser: process.env.TARGET_BROWSER as 'chrome' | 'firefox' | undefined,
  manifest: {
    name: 'ClipRoot',
    description: 'Capture clipboard provenance with the ClipRoot Protocol',
    permissions: ['clipboardWrite', 'activeTab', 'storage', 'contextMenus', 'scripting'],
    optional_permissions: ['clipboardRead'],
    host_permissions: ['<all_urls>']
  }
})
