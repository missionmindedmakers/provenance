import { Plugin, PluginKey } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

export const clipboardPluginKey = new PluginKey('attributionClipboard')

export function createClipboardPlugin(options: {
  onReuseDetected?: (event: { provenanceId: string }) => void
}) {
  return new Plugin({
    key: clipboardPluginKey,
    props: {
      handleDOMEvents: {
        copy(view: EditorView, e: Event) {
          const event = e as ClipboardEvent
          if (!event.clipboardData) return false

          const { state } = view
          const { from, to } = state.selection

          const slice = state.doc.slice(from, to)
          const provenance: string[] = []

          slice.content.descendants((node) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === 'attribution' && mark.attrs.provId) {
                provenance.push(mark.attrs.provId)
              }
            })
          })

          if (provenance.length > 0) {
            const payload = {
              version: 1,
              provenance: Array.from(new Set(provenance))
            }

            event.clipboardData.setData('application/x-provenance+json', JSON.stringify(payload))
          }

          return false
        },

        paste(view: EditorView, e: Event) {
          const event = e as ClipboardEvent
          if (!event.clipboardData) return false

          const data = event.clipboardData.getData('application/x-provenance+json')

          if (!data) return false

          try {
            const payload = JSON.parse(data)

            if (payload.provenance && Array.isArray(payload.provenance)) {
              payload.provenance.forEach((provId: string) => {
                if (options.onReuseDetected) {
                  options.onReuseDetected({ provenanceId: provId })
                }
              })
            }
          } catch (err) {
            console.error('Failed to parse provenance clipboard data', err)
          }

          return false
        }
      }
    }
  })
}
