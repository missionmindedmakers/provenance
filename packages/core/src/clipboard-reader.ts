import type { CrpBundle } from '@cliproot/protocol/types'

/**
 * Extract a CRP bundle from an HTML string by reading the hidden
 * `<div data-crp-bundle="...">` element written by the extension.
 *
 * Performs a lightweight structural check rather than full AJV schema
 * validation, so this function is safe to use in contexts where CSP
 * forbids `unsafe-eval` (e.g. extension content scripts).
 */
export function parseBundleFromHtml(html: string): CrpBundle | null {
  try {
    const match = html.match(/data-crp-bundle="([^"]*)"/)
    if (!match) return null

    const decoded = (match[1] ?? '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')

    const parsed = JSON.parse(decoded)

    // Lightweight structural check — the data was written by our own
    // extension so full schema validation is unnecessary, and AJV's
    // compiled validators use `new Function()` which is blocked by CSP
    // in extension content scripts.
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.crpiVersion === 'string' &&
      Array.isArray(parsed.clips)
    ) {
      return parsed as CrpBundle
    }

    return null
  } catch {
    return null
  }
}
