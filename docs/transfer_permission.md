# Transfer Permission and Proliferation Controls for `spx-prov`

## Why this document
You asked for a new protocol dimension where a content owner can control downstream proliferation:
- freely shareable,
- shareable with attribution,
- shareable only with explicit permission,
- private/no-copy.

This document evaluates implementation options and proposes a practical `v0.2` extension path.

## Reality check: policy vs enforcement
Any clipboard policy is enforceable only in cooperating apps. Non-cooperating apps can still copy bytes once visible.

This is similar to other web policy signals: RFC 9309 notes robots rules are not access authorization, and recommends real access controls for protection. For this protocol, rights metadata should be treated as authoritative policy in participating apps, not as universal DRM.

## External patterns worth reusing
1. SPDX license identifiers and expressions
Use stable short IDs and expressions (`MIT`, `CC-BY-4.0`, `GPL-2.0-only OR MIT`, etc.) and machine-readable license lists.

2. ODRL policy model
ODRL has a standard shape for Permission, Prohibition, and Duty, including assigner/assignee and constraints.

3. Creative Commons license semantics
CC licenses map cleanly to your examples:
- `CC0-1.0`: broad reuse,
- `CC-BY-4.0`: attribution required,
- `CC-BY-ND-4.0`: sharing allowed, derivative distribution restricted,
- custom/proprietary for explicit permission only.

4. Clipboard transport constraints
Browsers must support `text/plain`, `text/html`, and `image/png`; custom formats are optional and use the `"web "` custom format convention. So rights fields should be present in both:
- canonical signed envelope (`application/x-provenance+json`), and
- HTML/Markdown fallback hints.

5. Fine-grained grant modeling
OAuth RAR (`authorization_details`) shows a robust pattern for typed, structured permissions that can be validated and rejected consistently.

## Option set

### Option A: License-only (minimal)
Add only a license field per segment/entity.

Pros:
- easiest adoption,
- compatible with existing content ecosystems.

Cons:
- cannot express recipient-specific permission grants,
- weak support for "private/no-copy" workflow and request-approval lifecycle.

### Option B: License + policy profile + grant ledger (recommended)
Add:
- normalized license metadata,
- a small policy profile for proliferation intent,
- a grant list (who may access/reuse, under what constraints),
- destination behavior hints for denied copy.

Pros:
- covers your use cases now,
- implementable without full ODRL engine,
- can map to ODRL later.

Cons:
- introduces protocol complexity (grant lifecycle, revocation, expiry).

### Option C: Full ODRL-native policy exchange
Use ODRL JSON-LD policy as first-class payload for all rules and constraints.

Pros:
- standards-aligned expressiveness,
- broad future extensibility.

Cons:
- higher implementation burden,
- harder UX and validation in early-stage product.

## Recommended direction
Adopt Option B now, with an ODRL bridge:
- keep the core protocol simple and typed,
- include an optional `odrlPolicy` field for advanced publishers,
- define deterministic mapping from your internal fields to ODRL terms.

## Proposed `spx-prov` additions (`v0.2` draft)

### 1) Rights object on each segment
```json
{
  "rights": {
    "policyMode": "open|attribution_required|permission_required|private_no_copy",
    "license": {
      "spdxExpression": "CC-BY-4.0",
      "canonicalUrl": "https://creativecommons.org/licenses/by/4.0/",
      "humanLabel": "Creative Commons Attribution 4.0",
      "customLicenseRef": null
    },
    "attribution": {
      "required": true,
      "preferredText": "Jane Doe, 2026",
      "preferredUrl": "https://example.com/post/123"
    },
    "proliferation": {
      "allowRedistribution": true,
      "allowDerivatives": true,
      "allowCommercialUse": true
    }
  }
}
```

Notes:
- `spdxExpression` is the interoperable anchor.
- `customLicenseRef` handles proprietary terms (`LicenseRef-Internal-EULA` style).
- Keep `policyMode` explicit even when derivable from license for UX and enforcement consistency.

### 2) Grant ledger for permissioned/private content
```json
{
  "accessControl": {
    "ownerAgentId": "agent_user_alice",
    "defaultDecision": "deny",
    "grants": [
      {
        "grantId": "01J...",
        "granteeAgentId": "agent_user_bob",
        "scope": ["read", "quote", "paste_with_attribution"],
        "segmentIds": ["seg_1", "seg_2"],
        "issuedAt": "2026-03-01T14:00:00Z",
        "expiresAt": "2026-06-01T00:00:00Z",
        "status": "active"
      }
    ]
  }
}
```

Add lifecycle events:
- `grant_issued`
- `grant_revoked`
- `grant_expired`
- `grant_requested`

### 3) Clipboard behavior hints for cooperating apps
```json
{
  "copyControl": {
    "onDenied": "replace_with_notice|block_copy|allow_but_mark_unlicensed",
    "noticeTemplate": "Copyright (c) 2026 Alice. Reuse requires permission: https://example.com/request-access",
    "requestAccessUrl": "https://example.com/request-access"
  }
}
```

Recommended defaults:
- `open`: allow normal copy.
- `attribution_required`: allow copy, include attribution block/hints.
- `permission_required`: allow only if active grant exists; otherwise replace/deny.
- `private_no_copy`: deny or replace by default.

### 4) Handshake/status extensions
Extend transfer receipt statuses:
- `accepted`
- `accepted_with_attribution_required`
- `rejected_no_permission`
- `rejected_license_violation`
- `pending_owner_approval`

Destination should send claim context including:
- requested action (`quote`, `paste`, `transform`, `redistribute`),
- target audience/surface (`private doc`, `public web`, etc.),
- attribution plan (if applicable).

## UX model
1. User copies protected content.
2. Source app evaluates policy + grants.
3. If allowed:
- include provenance + rights payload.
4. If not allowed:
- replace clipboard payload with notice and request URL, or block copy.
5. Destination app re-evaluates on paste and records receipt outcome.

This creates a cooperative, auditable permission trail instead of silent failure.

## Data model impact
Add to graph model:
- `policy` node (or policy fields on `prov_entity`),
- `grant` node tied to `agent` and `entity/segment`,
- edges:
  - `governs(policy -> entity)`
  - `grantsAccess(grant -> agent)`
  - `appliesTo(grant -> entity)`
  - `revokes(activity -> grant)` when applicable.

## Privacy and legal considerations
1. Do not over-collect recipient identity in public contexts; allow pseudonymous recipient IDs.
2. Treat policy metadata as declarative claims, not guaranteed legal enforceability.
3. Preserve provenance receipts for audit, but support retention limits and deletion policies.
4. Keep protocol language: "policy enforcement is best-effort among cooperating systems."

## Migration path
1. `v0.2` phase 1:
- add `rights.policyMode`, `rights.license`, and `copyControl.onDenied`.
2. `v0.2` phase 2:
- add `accessControl.grants` and new receipt statuses.
3. `v0.3`:
- optional ODRL JSON-LD embedding and validation profiles.

## Suggested test vectors
1. `open` + `CC0-1.0`: copy/paste accepted without attribution requirement.
2. `attribution_required` + `CC-BY-4.0`: paste accepted, attribution UI required.
3. `permission_required` with active grant: paste accepted.
4. `permission_required` without grant: source replaces clipboard with notice.
5. `private_no_copy`: source blocks copy; destination logs denied policy state.
6. Grant revoked after copy but before paste: destination rejects with `rejected_no_permission`.

## References
- Protocol baseline: `docs/protocol_draft_1.md`
- W3C Clipboard API and events: https://www.w3.org/TR/clipboard-apis/
- ODRL Information Model 2.2 (W3C Recommendation): https://www.w3.org/TR/odrl-model/
- ODRL Vocabulary & Expression 2.2: https://www.w3.org/TR/odrl-vocab/
- SPDX License List: https://spdx.org/licenses/
- SPDX License Expressions (v2.3 Annex D): https://spdx.github.io/spdx-spec/v2.3/SPDX-license-expressions/
- Creative Commons CC BY 4.0 deed: https://creativecommons.org/licenses/by/4.0/deed.en
- Creative Commons CC BY-SA 4.0 deed: https://creativecommons.org/licenses/by-sa/4.0/
- Creative Commons CC BY-ND 4.0 deed: https://creativecommons.org/licenses/by-nd/4.0/deed.en
- Creative Commons CC0 1.0 deed: https://creativecommons.org/publicdomain/zero/1.0/
- OAuth 2.0 Rich Authorization Requests (RFC 9396): https://www.rfc-editor.org/rfc/rfc9396
- Robots Exclusion Protocol (RFC 9309): https://datatracker.ietf.org/doc/html/rfc9309
- C2PA Technical Specification 2.0: https://spec.c2pa.org/specifications/specifications/2.0/specs/C2PA_Specification.html
