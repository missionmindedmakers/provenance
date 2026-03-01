# Span Provenance Interop Protocol Draft v0.2

## 1. Purpose
This document defines the `spx-prov` v0.2 profile for span-level provenance exchange between cooperating apps.

It extends v0.1 with optional rights policy and transfer permission controls so content owners can declare and enforce downstream reuse intent in cooperating systems.

It assumes:
1. Typed-node/typed-edge provenance graph model.
2. Span addressing with offsets plus context anchors.
3. Clipboard transport via custom MIME plus HTML `data-*` fallback.
4. Source/destination handshake with signed claims and receipts.
5. Instance-signed protocol messages (Ed25519 in v0.2 profile).

## 2. Protocol Versioning and Compatibility
- Protocol identifier: `spx-prov`.
- Version in this draft: `0.2`.
- All v0.2 messages MUST include `protocol: "spx-prov"` and `version: "0.2"`.
- Receivers MUST ignore unknown optional fields.
- v0.2 receivers SHOULD support ingest of v0.1 envelopes when feasible.
- Breaking changes MUST increment major version.

## 3. Interop Roles
- `source instance`: app instance where copied content originated.
- `destination instance`: app instance receiving pasted/imported content.
- `agent`: user, org, model, or app instance.
- `owner agent`: rights owner for a governed segment/entity.
- `verifier`: service/component validating signatures and payload rules.

## 4. Canonical Identifiers
All IDs are opaque, globally unique strings (UUIDv7 recommended):
- `entityId`
- `activityId`
- `agentId`
- `claimId`
- `receiptId`
- `bundleId`
- `grantId`
- `policyId`
- `permissionRequestId`

## 5. Core Node and Edge Semantics

### 5.1 Node kinds
- `prov_entity.kind`: `span_snapshot | document_version | source_artifact | policy | grant`
- `prov_activity.kind`: `paste | import | rewrite | summarize | merge | split | grant_issued | grant_revoked | grant_requested | policy_decision`
- `prov_agent.kind`: `user | organization | model | instance`
- `prov_claim.claim_type`: `transfer_claim | transfer_receipt | permission_request | permission_decision`

### 5.2 Edge types
- `used` (`activity -> entity`)
- `wasGeneratedBy` (`entity -> activity`)
- `wasDerivedFrom` (`entity -> entity`)
- `wasAttributedTo` (`entity -> agent`)
- `wasAssociatedWith` (`activity -> agent`)
- `attests` (`claim -> activity|entity`)
- `contains` (`document_version -> span_snapshot`)
- `governs` (`policy -> entity`)
- `grantsAccess` (`grant -> agent`)
- `appliesTo` (`grant -> entity`)
- `revokes` (`activity -> grant`)

Receivers MUST reject edges whose node-kind pairs do not match allowed mappings.

## 6. Span Addressing and Fingerprints
Each `span_snapshot` entity MUST include:
- `anchor.start.offset`
- `anchor.start.leftContextHash`
- `anchor.start.rightContextHash`
- `anchor.end.offset`
- `anchor.end.leftContextHash`
- `anchor.end.rightContextHash`
- `textHash`

Canonicalization v0.2:
1. Normalize UTF-8.
2. Normalize newlines to `\n`.
3. Do not trim characters (whitespace is meaningful).
4. Hash with SHA-256 and prefix `sha256:`.

## 7. Rights Policy Model (New in v0.2)

### 7.1 Policy modes
`rights.policyMode`:
- `open`
- `attribution_required`
- `permission_required`
- `private_no_copy`

### 7.2 Rights schema
Rights MAY be set at bundle default and/or segment level.
Segment-level rights override bundle defaults.

```json
{
  "rights": {
    "policyMode": "attribution_required",
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

Rules:
1. `license.spdxExpression` SHOULD be used when license is SPDX-representable.
2. Proprietary terms MAY use `customLicenseRef` (for example, `LicenseRef-Internal-EULA`).
3. `policyMode` MUST be explicit even when derivable from license.

### 7.3 Access control and grants
`accessControl` supports recipient-specific permissions:

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
        "segmentIds": ["seg_1"],
        "issuedAt": "2026-03-01T14:00:00Z",
        "expiresAt": "2026-06-01T00:00:00Z",
        "status": "active"
      }
    ]
  }
}
```

Grant `status` values:
- `active`
- `revoked`
- `expired`
- `pending`

### 7.4 Copy control hints
`copyControl` indicates preferred source behavior when action is denied:

```json
{
  "copyControl": {
    "onDenied": "replace_with_notice|block_copy|allow_but_mark_unlicensed",
    "noticeTemplate": "Copyright (c) 2026 Alice. Reuse requires permission: https://example.com/request-access",
    "requestAccessUrl": "https://example.com/request-access"
  }
}
```

## 8. Clipboard Envelope
Destination SHOULD parse in this order:
1. `application/x-provenance+json`
2. `text/html` with `data-prov-*` and policy hints
3. user attribution/policy prompt fallback

### 8.1 Envelope shape (v0.2)
```json
{
  "protocol": "spx-prov",
  "version": "0.2",
  "bundleId": "01J...",
  "sourceInstance": "https://writer.example",
  "sourceDocument": {
    "documentId": "doc_src_123",
    "documentVersionId": "docv_src_45"
  },
  "policyDefaults": {
    "rights": {
      "policyMode": "attribution_required",
      "license": {"spdxExpression": "CC-BY-4.0"}
    },
    "copyControl": {"onDenied": "replace_with_notice"}
  },
  "accessControl": {
    "ownerAgentId": "agent_user_alice",
    "defaultDecision": "deny",
    "grants": []
  },
  "segments": [
    {
      "segmentId": "seg_1",
      "order": 0,
      "text": "Quoted sentence A.",
      "entityId": "ent_span_A1",
      "rights": {
        "policyMode": "permission_required",
        "license": {"spdxExpression": "LicenseRef-Internal-EULA"},
        "attribution": {"required": true}
      },
      "attribution": {
        "primaryAgentId": "agent_user_alice",
        "sourceArtifactUrl": "https://writer.example/post/abc",
        "classification": "quoted"
      },
      "anchor": {
        "start": {"offset": 120, "leftContextHash": "sha256:...", "rightContextHash": "sha256:..."},
        "end": {"offset": 138, "leftContextHash": "sha256:...", "rightContextHash": "sha256:..."}
      },
      "textHash": "sha256:..."
    }
  ],
  "signature": {
    "alg": "Ed25519",
    "kid": "did:key:z...#instance-key-1",
    "sig": "base64..."
  }
}
```

## 9. Multi-Span and Multi-Origin Behavior
Each segment is independently attributable and independently governed.

Rules:
1. Destination MUST preserve segment order.
2. Destination MUST create one `paste` activity per paste operation.
3. Destination MUST create one generated `span_snapshot` per pasted segment.
4. Destination MUST apply per-segment rights evaluation, not just bundle-level evaluation.
5. Destination MUST group callbacks by `sourceInstance`.
6. If one source callback fails, other source callbacks MUST still proceed.
7. Mixed-policy bundles MUST produce per-segment status visibility.

## 10. Policy Evaluation Profile

### 10.1 Required evaluation inputs
Destination and source evaluators SHOULD consider:
- requesting `agentId`
- requested action (`read`, `quote`, `paste`, `transform`, `redistribute`)
- destination surface (`private_doc`, `team_doc`, `public_web`)
- segment `rights` and `accessControl` state
- active grants and expiry

### 10.2 Policy outcomes
Allowed outcomes:
- `allow`
- `allow_with_attribution`
- `deny_no_permission`
- `deny_license_violation`
- `pending_owner_approval`

### 10.3 Mode semantics
1. `open`: action SHOULD be allowed unless local safety policy blocks.
2. `attribution_required`: action MAY proceed only if attribution payload can be preserved or supplied.
3. `permission_required`: action requires active matching grant; else deny or pending approval flow.
4. `private_no_copy`: source SHOULD block copy or replace payload; destination SHOULD reject ungranted transfer.

## 11. Handshake API Contract

### 11.1 Discovery
`GET /.well-known/provenance-interop`

Response:
```json
{
  "protocol": "spx-prov",
  "version": "0.2",
  "transferClaimsEndpoint": "https://source.example/interop/transfer-claims",
  "permissionRequestsEndpoint": "https://source.example/interop/permission-requests",
  "jwksUri": "https://source.example/.well-known/jwks.json",
  "supportsSignedReceipt": true,
  "supportsRightsPolicy": true
}
```

### 11.2 Transfer claim endpoint
- `POST /interop/transfer-claims`
- Idempotency key SHOULD be `claimId`.

Request shape:
```json
{
  "protocol": "spx-prov",
  "version": "0.2",
  "claimId": "01J...",
  "bundleId": "01J...",
  "sourceInstance": "https://source.example",
  "destination": {
    "instance": "https://dest.example",
    "documentId": "doc_dst_999",
    "documentVersionId": "docv_dst_17",
    "agentId": "agent_user_42"
  },
  "activity": {
    "activityId": "act_p1",
    "kind": "paste",
    "happenedAt": "2026-02-28T16:41:22Z"
  },
  "policyContext": {
    "requestedAction": "paste",
    "targetSurface": "team_doc",
    "audience": "internal_team",
    "attributionPlan": "inline_source_link"
  },
  "segments": [
    {
      "segmentId": "seg_1",
      "destinationEntityId": "ent_d1",
      "sourceEntityId": "ent_a1",
      "textHash": "sha256:...",
      "classification": "quoted",
      "rights": {
        "policyMode": "permission_required",
        "license": {"spdxExpression": "LicenseRef-Internal-EULA"}
      }
    }
  ],
  "signature": {
    "alg": "Ed25519",
    "kid": "did:key:z...#instance-key-1",
    "sig": "base64..."
  }
}
```

Response:
```json
{
  "protocol": "spx-prov",
  "version": "0.2",
  "receiptId": "01J...",
  "claimId": "01J...",
  "status": "pending_owner_approval",
  "sourceReference": "reuse_evt_556",
  "receivedAt": "2026-02-28T16:41:23Z",
  "signature": {
    "alg": "Ed25519",
    "kid": "did:key:z...#instance-key-2",
    "sig": "base64..."
  }
}
```

Receipt `status` values:
- `accepted`
- `accepted_with_attribution_required`
- `accepted_unsigned`
- `rejected_invalid_signature`
- `rejected_unknown_source_entity`
- `rejected_policy`
- `rejected_no_permission`
- `rejected_license_violation`
- `pending_async`
- `pending_owner_approval`

### 11.3 Permission request endpoint (optional)
- `POST /interop/permission-requests`
- Used when destination/user requests grant creation for denied or pending transfers.

Request includes:
- `permissionRequestId`
- requester identity
- requested scopes
- segment/entity references
- intended audience/surface

## 12. Source and Destination Persistence Rules
On successful paste processing, destination MUST persist:
1. one `prov_activity(kind=paste)`,
2. one generated `span_snapshot` per segment,
3. standard provenance edges (`used`, `wasGeneratedBy`, `wasDerivedFrom`, `wasAttributedTo`),
4. one `transfer_claim` per source callback,
5. one `transfer_receipt` when response received.

When policy fields exist, destination SHOULD also persist:
1. policy state associated with each segment/entity,
2. grant references used for authorization decision,
3. policy decision outcome with reason code.

Source SHOULD persist:
1. grant lifecycle activities (`grant_issued`, `grant_revoked`, `grant_requested`),
2. decision logs for denied/pending transfers,
3. linkage between decision and resulting receipt status.

## 13. Validation Rules
Receiver MUST validate:
1. protocol/version compatibility,
2. signature against sender key,
3. `textHash` consistency for provided text,
4. no duplicate `segmentId` in a bundle,
5. contiguous segment ordering by `order`,
6. callback payload source/destination consistency,
7. policy enum values (`policyMode`, `onDenied`, status fields),
8. grant validity window when grants are provided (`issuedAt <= now < expiresAt`, if `expiresAt` exists).

Receiver SHOULD validate:
1. SPDX expression syntax when `spdxExpression` is present,
2. `customLicenseRef` presence when SPDX is not applicable.

## 14. Retry, Idempotency, and Pending Approval
- Destinations SHOULD retry failed callbacks with exponential backoff.
- Sources MUST treat duplicate `claimId` as idempotent replay.
- `pending_async` and `pending_owner_approval` responses SHOULD include a poll or webhook mechanism.
- Destinations SHOULD surface pending state per source and per segment where relevant.

## 15. Security Profile (v0.2)
- Signature algorithm: Ed25519.
- Key distribution: JWKS or DID key documents.
- Key rotation via `kid`.
- Required audit fields: `createdAt`, `senderInstance`, `kid`, `claimId`, payload hash.
- Policy enforcement is best-effort among cooperating systems and is not universal copy prevention.

## 16. Privacy Profile
- Implementers SHOULD minimize personal data in grant and decision payloads.
- Pseudonymous `agentId` is acceptable when identity disclosure is not required.
- Retention policies SHOULD apply to receipts, decisions, and grant-request metadata.

## 17. Standards Mapping Notes
- License identifiers: SPDX expressions and license references.
- Policy model bridge: optional mapping to ODRL (Permission/Prohibition/Duty semantics).
- Export compatibility: C2PA mapping remains export-time; include rights metadata in exporter assertions where applicable.

## 18. Interop Conformance Levels
- Level 1 (`import-only`): parse bundle and preserve attribution.
- Level 2 (`callback`): send transfer claims and record receipts.
- Level 3 (`signed mutual attestation`): enforce signed receipts and strict validation.
- Level 4 (`rights-aware enforcement`): evaluate `policyMode`, grants, and copy-control outcomes.

POC target after v0.2 policy work: Level 3 progressing to Level 4.

## 19. Minimal Interop Test Vectors (v0.2)
1. Single span, `open`, signed, accepted.
2. `attribution_required` span accepted with attribution requirement.
3. `permission_required` span with active grant accepted.
4. `permission_required` span without grant rejected (`rejected_no_permission`).
5. `private_no_copy` source behavior: block copy or replace with notice.
6. Three spans from two sources with mixed policies, one source unreachable (partial pending).
7. Missing provenance payload with user-supplied attribution fallback and low-confidence policy handling.
8. Replay with same `claimId` (idempotent response).
9. Grant revoked after copy and before paste (destination rejection on re-evaluation).

## 20. Implementation Notes (Next.js + Tiptap + Drizzle + BetterAuth)
- Keep editor marks thin (entity references), with policy references by ID.
- Materialize segment policy state for fast rendering and enforcement checks.
- Run callbacks in background jobs to avoid blocking paste UX.
- Provide clear UI states for allowed/attribution-required/pending/denied outcomes.
- Add grant manager UI with revoke and expiry controls.

## 21. Open Items for v0.3
1. Harden cross-language text normalization edge cases.
2. Formal dispute and revocation protocol after accepted receipts.
3. Optional redacted or privacy-preserving transfer proofs.
4. Normative ODRL profile and validation requirements.
5. Cross-instance agent identity mapping profile.
