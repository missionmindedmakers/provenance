# Rights Policy and Transfer Permission Plan (Draft 2)

## Purpose
This plan extends the existing `spx-prov` protocol and POC roadmap with optional rights policy controls so content owners can express and enforce downstream reuse preferences in cooperating systems.

Target outcomes:
- express policy intent (`open`, `attribution_required`, `permission_required`, `private_no_copy`),
- encode machine-readable license metadata,
- support recipient-specific grants and revocation,
- enforce copy/paste behaviors in participating apps,
- record auditable policy decisions via handshake receipts.

## Scope
In scope:
- protocol schema updates for rights and transfer permissions,
- copy/paste enforcement logic in source and destination apps,
- grant ledger + request/approval workflow,
- receipt status extensions and retries,
- conformance test vectors and rollout strategy.

Out of scope:
- universal DRM or prevention in non-cooperating apps,
- full ODRL policy execution engine in first delivery,
- legal adjudication layer.

## Guiding principles
1. Optionality: rights policy is opt-in and does not break baseline provenance transfer.
2. Backward compatibility: receivers ignore unknown optional fields.
3. Determinism: policy evaluation should yield clear, explainable outcomes.
4. Auditability: every policy decision should be represented as activity/claim/receipt records.
5. Standards alignment: use SPDX now; provide ODRL mapping path later.

## Proposed protocol extension (`v0.2` profile)

### 1) Segment-level rights metadata
Add optional `rights` to each segment:
- `policyMode`: `open | attribution_required | permission_required | private_no_copy`
- `license.spdxExpression`
- `license.canonicalUrl`
- `license.customLicenseRef` for non-standard licenses
- `attribution.required` and preferred attribution fields
- `proliferation` booleans (redistribution/derivatives/commercial)

### 2) Access control and grants
Add optional `accessControl`:
- `ownerAgentId`
- `defaultDecision`: `allow | deny`
- `grants[]` with:
  - `grantId`
  - `granteeAgentId`
  - `scope[]` (e.g., `read`, `quote`, `paste_with_attribution`, `redistribute`)
  - `segmentIds[]` or whole-bundle scope
  - `issuedAt`, `expiresAt`, `status`

### 3) Copy control hints
Add optional `copyControl`:
- `onDenied`: `replace_with_notice | block_copy | allow_but_mark_unlicensed`
- `noticeTemplate`
- `requestAccessUrl`

### 4) Handshake status expansion
Extend receipt statuses:
- `accepted`
- `accepted_with_attribution_required`
- `rejected_no_permission`
- `rejected_license_violation`
- `pending_owner_approval`

## POC architecture changes

### Data model
Add tables:
- `content_policies`
- `policy_grants`
- `grant_requests`
- `policy_decisions`

Update provenance linkage:
- map policy records to entities/segments,
- map grants to grantees + segment scope,
- link decisions to transfer claims and receipts.

### Copy flow (source app)
1. Resolve selected segments and attached rights policy.
2. Evaluate permission for requesting user/context.
3. If allowed:
- write signed provenance envelope including rights fields.
4. If denied:
- apply `copyControl.onDenied` behavior.
- optionally write a permission request payload/link.

### Paste flow (destination app)
1. Parse envelope and validate signature/hash.
2. Evaluate policy and local user/context against grants.
3. Apply behavior:
- accept and attach attribution requirements, or
- reject/replace with policy notice.
4. Send transfer claim with requested action and target surface.
5. Persist receipt and policy decision state.

## UX and product surfaces

### Author controls
- Policy selector per document/segment:
  - Open
  - Attribution Required
  - Permission Required
  - Private / No Copy
- License selector:
  - SPDX-backed presets + custom license reference
- Grant manager:
  - add/revoke grantee,
  - scope and expiry.

### Recipient experience
- Clear paste outcomes:
  - accepted,
  - accepted with attribution action,
  - pending owner approval,
  - denied with request-access path.

### Audit views
- Policy decision timeline by transfer event.
- Grant history and revocation history.

## Implementation phases

### Phase 1: Schema + passive metadata
Deliverables:
- Add optional `rights`, `copyControl` fields to protocol payloads.
- Store fields at source/destination without strict enforcement.
- Add parser/validator coverage and round-trip tests.

Exit criteria:
- `v0.1` consumers continue to interoperate.
- New fields survive copy/paste end-to-end where supported.

### Phase 2: Policy evaluation + enforcement
Deliverables:
- Implement policy evaluator for `policyMode`.
- Enforce copy/paste outcomes for cooperating app paths.
- Add expanded receipt statuses.

Exit criteria:
- Deterministic outcomes for all four policy modes.
- Denied and pending flows visible in UI and persisted.

### Phase 3: Grant lifecycle
Deliverables:
- Grant issuance/revocation/expiry.
- Request-access workflow and approval actions.
- Re-evaluation on paste if grant state changed after copy.

Exit criteria:
- Revocation between copy and paste is handled and auditable.
- Expired grant path is tested and surfaced to users.

### Phase 4: Standards bridge and conformance
Deliverables:
- Optional `odrlPolicy` embedding/mapping.
- SPDX validation in CI.
- Conformance vectors for multi-origin + mixed policies.

Exit criteria:
- Mapping docs published.
- Interop profile documented for external implementers.

## Test strategy
Core vectors:
1. `open` + permissive license accepted.
2. `attribution_required` accepted with required attribution UI.
3. `permission_required` accepted with active grant.
4. `permission_required` denied without grant.
5. `private_no_copy` blocked/replaced at source.
6. Grant revoked after copy, before paste.
7. Multi-origin paste where segments have mixed policy modes.
8. Custom MIME missing; HTML fallback still carries policy hint with reduced confidence.

## Risks and mitigations
1. User confusion about legal effect.
Mitigation: explicit UX copy ("policy enforced in cooperating apps").

2. Overly complex policy UX.
Mitigation: keep four-mode selector; hide advanced settings by default.

3. Identity mismatch across instances.
Mitigation: require stable `agentId` mapping and auditable unresolved states.

4. Performance impact on paste.
Mitigation: non-blocking callbacks with queue + per-source status tracking.

## Immediate next steps
1. Add a `v0.2` section in `docs/protocol_draft_1.md` for rights and permissions fields.
2. Define JSON Schemas for `rights`, `accessControl`, `copyControl`.
3. Specify policy evaluator rules as executable conformance tests.
4. Update POC data model draft (`docs/data_structuring.md`) with policy/grant entities.
5. Build a minimal UI prototype for denied-copy notice and request-access flow.
