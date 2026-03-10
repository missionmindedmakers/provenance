# ClipRoot

ClipRoot is an open protocol and SDK effort for provenance-aware reuse.

The goal is to preserve attribution when people copy, paste, import, and revise content so downstream consumers can understand where specific clips (spans) came from.

## What This Repository Contains

This repository is the public ClipRoot monorepo.

It currently includes:
- the CRP (`ClipRoot Protocol`) `v0.0.1` schema and research artifacts,
- `@cliproot/protocol`, a TypeScript package for schema-backed validation, generated protocol types, and deterministic text hashing,
- `@cliproot/tiptap`, a Tiptap extension for managing span-level provenance and attribution,
- monorepo tooling for building and testing public SDK packages.

Planned next packages include editor and handshake-focused SDKs (see `research/high_level_plan_march_7_2026.md`).

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
    protocol/      # @cliproot/protocol
    tiptap/        # @cliproot/tiptap
  schema/          # canonical schema artifacts and examples
  research/        # product/protocol planning notes
```

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
pnpm --filter @cliproot/tiptap build
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

# Tiptap package
pnpm --filter @cliproot/tiptap typecheck
pnpm --filter @cliproot/tiptap test
```

## Schema Sync/Verification

`@cliproot/protocol` keeps its packaged schema files in sync with root schema artifacts.

```bash
pnpm --filter @cliproot/protocol schema:check
pnpm --filter @cliproot/protocol schema:sync
```

## Contributing

Please read `CONTRIBUTING.md` for contribution scope and PR expectations.
