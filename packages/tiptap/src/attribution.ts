import { Mark, mergeAttributes } from '@tiptap/core'
import { createClipboardPlugin } from './clipboard.js'

export interface AttributionOptions {
  resolveProvenance?: (id: string) => Promise<any>
  storeProvenance?: (prov: any) => Promise<string>
  onReuseDetected?: (event: { provenanceId: string }) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    attribution: {
      setAttribution: (provId: string) => ReturnType
      unsetAttribution: () => ReturnType
    }
  }
}

export const AttributionExtension = Mark.create<AttributionOptions>({
  name: 'attribution',

  addOptions() {
    return {} as AttributionOptions
  },

  addAttributes() {
    return {
      provId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-prov-id'),
        renderHTML: (attributes) => {
          if (!attributes.provId) return {}

          return {
            'data-prov-id': attributes.provId
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-prov-id]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setAttribution:
        (provId: string) =>
        ({ commands }) => {
          return commands.setMark('attribution', { provId })
        },
      unsetAttribution:
        () =>
        ({ commands }) => {
          return commands.unsetMark('attribution')
        }
    }
  },

  addProseMirrorPlugins() {
    const clipboardOptions: { onReuseDetected?: (event: { provenanceId: string }) => void } = {}
    if (this.options.onReuseDetected) {
      clipboardOptions.onReuseDetected = this.options.onReuseDetected
    }
    return [createClipboardPlugin(clipboardOptions)]
  }
})
