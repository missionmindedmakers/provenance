# Cliproot Pack Format v1

`.cliprootpack` is a `tar.zst` archive used to move a portable subset of Cliproot context between repositories.

Archive layout:

```text
manifest.json
objects/<bundle-hash>.json
artifacts/<artifact-hash>
```

Rules:

- `manifest.json` is the source of truth for pack metadata, counts, artifact metadata, and `clipArtifactRefs`.
- `objects/*.json` are ordinary CRP bundle JSON files copied from the local object store. Packs do not introduce a new CRP `bundleType`.
- `artifacts/*` are raw artifact bytes addressed by `artifactHash`.
- `roots.mode` is `project` for project exports and `roots` for explicit root-clip exports.
- Project packs include all project-tagged clips, full `wasDerivedFrom` ancestor closure, all project artifacts, and all `clipArtifactRefs` for included clips.
- Root packs include the requested roots, ancestor closure up to the requested depth, and only artifacts reachable through `clipArtifactRefs`.

Verification rules:

- `format` must be `cliproot-pack-v1`.
- Every manifest entry must have a corresponding archive member.
- `byteSize` and `sha256Digest` must match the archived bytes.
- Every bundled CRP object must deserialize and pass normal Cliproot bundle verification.
- Artifact bytes must hash to both `sha256Digest` and `artifactHash`.
- `counts` must match the actual archive contents.

The manifest schema lives at `schema/cliproot-pack-v1.manifest.schema.json`, and the example fixture lives at `schema/examples/cliproot-pack-v1.manifest.example.json`.
