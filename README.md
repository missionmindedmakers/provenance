# ClipRoot

ClipRoot is an open protocol and SDK effort for provenance-aware reuse.

The goal is to preserve attribution when people copy, paste, import, and revise content so downstream consumers can understand where specific clips (spans) came from.

## What This Repository Contains

This repository is the public ClipRoot monorepo.

It currently includes:
- the CRP (`ClipRoot Protocol`) `v0.0.1` schema and research artifacts,
- `@cliproot/protocol`, a TypeScript package for schema-backed validation, generated protocol types, and deterministic text hashing,
- `@cliproot/core`, a browser-compatible SDK for capturing clipboard provenance on copy events,
- `@cliproot/tiptap`, a Tiptap extension for managing span-level provenance and attribution,
- `@cliproot/extension`, a WXT-based extension that intercepts copy events and writes CRP bundles,
- monorepo tooling for building and testing public SDK packages.

## Protocol Overview

CRP defines structured bundles for provenance exchange across systems.

Current `v0.0.1` bundle types:
- `document`
- `clipboard`
- `reuse-event`

A bundle can include:
- `document` metadata,
- `agents` and `sources`,
- `clips` (span-level attribution records with selectors + text hashes),
- `activities`, `reuseEvents`, and optional `signatures`.

The generated schema constants and types are available in:
- `packages/protocol/src/generated/crp-v0.0.1.schema.ts`

## Monorepo Layout

```text
cliproot/
  packages/
    protocol/      # @cliproot/protocol — schema validation, types, hashing
    core/          # @cliproot/core     — browser SDK for copy-side provenance capture
    tiptap/        # @cliproot/tiptap   — Tiptap attribution extension
    extension/     # @cliproot/extension — Browser extension (WXT, MV3)
  schema/          # canonical schema artifacts and examples
  research/        # product/protocol planning notes
```

### Using `@cliproot/core`

`@cliproot/core` provides a browser-compatible API for capturing what was selected at the moment of a copy, building a CRP clipboard bundle, and writing it invisibly into the HTML clipboard data.

```ts
import {
  captureSelection,
  buildClipboardBundle,
  writeProvenanceToClipboard,
} from '@cliproot/core'

document.addEventListener('copy', (event) => {
  const selection = document.getSelection()
  if (!selection || !event.clipboardData) return

  const captured = captureSelection(selection, document)
  if (!captured) return

  const bundle = buildClipboardBundle({
    captured,
    documentInfo: {
      uri: window.location.href,
      title: document.title,
    },
  })

  writeProvenanceToClipboard(bundle, event.clipboardData)
  event.preventDefault()
})
```

The bundle is written as a hidden `<div data-crp-bundle="...">` appended to the `text/html` clipboard entry. Plain text is left unmodified. On paste, a CRP-aware receiver can parse the attribute to reconstruct the clip's provenance.

### Using `@cliproot/extension`

The browser extension automates the above for every page without requiring site-side integration. It supports both Chrome and Firefox.

**Development:**

```bash
# Chrome
pnpm --filter @cliproot/extension dev

# Firefox
pnpm --filter @cliproot/extension dev:firefox
```

**Loading in Chrome:**

Load the `.output/chrome-mv3/` directory via **Settings → Extensions → Load unpacked**.

**Loading in Firefox:**

1. Build the Firefox target: `pnpm --filter @cliproot/extension build:firefox`
2. Open `about:debugging` in Firefox
3. Click **This Firefox** → **Load Temporary Add-on**
4. Select any file inside `.output/firefox-mv2/`

**Production builds:**

```bash
# Build both targets
pnpm --filter @cliproot/extension build:all

# Create zip archives for distribution
pnpm --filter @cliproot/extension zip:chrome
pnpm --filter @cliproot/extension zip:firefox
```

**How it works:**

1. A capture-phase copy listener snapshots the selection and builds a CRP bundle before the site's handler runs.
2. A bubble-phase listener augments whatever HTML the site wrote with the hidden provenance div, then calls `preventDefault()`.
3. If the site suppressed bubbling (`stopImmediatePropagation`), a best-effort fallback uses the Async Clipboard API (Chrome only — Firefox does not support `navigator.clipboard.read()`).

**Features:**

- **Per-site controls:** Enable or disable capture for individual sites from the popup.
- **Clip count badge:** The badge shows the number of clips captured in the current tab (green), or "OFF" (gray) when disabled.
- **Recent clips:** The popup displays the last 10 clips with text previews and timestamps.
- **Options page:** Manage all per-site overrides from a dedicated settings page.

### Using `@cliproot/tiptap`

```ts
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AttributionExtension } from '@cliproot/tiptap'

const editor = new Editor({
  extensions: [
    StarterKit,
    AttributionExtension.configure({
      onReuseDetected: (event) => {
        console.log('Reuse detected for provenance ID:', event.provenanceId)
      }
    })
  ]
})

// Set attribution on current selection
editor.commands.setAttribution('prov_123')
```

## Prerequisites

- Node.js `>=22.0.0`
- pnpm `>=10.0.0`

## Local Setup

From the repository root (`cliproot/`):

```bash
pnpm install
```

## Build All Packages

```bash
pnpm build
```

This runs Turborepo build tasks across workspace packages.

## Build Specific Packages

```bash
pnpm --filter @cliproot/protocol build
pnpm --filter @cliproot/core build
pnpm --filter @cliproot/tiptap build
pnpm --filter @cliproot/extension build
```

## Run Typecheck and Tests

```bash
pnpm typecheck
pnpm test
```

Or target specific packages:

```bash
# Protocol package
pnpm --filter @cliproot/protocol typecheck
pnpm --filter @cliproot/protocol test

# Core SDK
pnpm --filter @cliproot/core typecheck
pnpm --filter @cliproot/core test

# Tiptap package
pnpm --filter @cliproot/tiptap typecheck
pnpm --filter @cliproot/tiptap test

# Extension (typecheck only — no unit tests)
pnpm --filter @cliproot/extension typecheck
```

## Formatting

This project uses Prettier for consistent code formatting.

To format all files across packages:

```bash
pnpm run format
```

To check formatting without writing (useful for CI):

```bash
pnpm run format:check
```

## Schema Sync/Verification

`@cliproot/protocol` keeps its packaged schema files in sync with root schema artifacts.

```bash
pnpm --filter @cliproot/protocol schema:check
pnpm --filter @cliproot/protocol schema:sync
```

## Contributing

Please read `CONTRIBUTING.md` for contribution scope and PR expectations.
