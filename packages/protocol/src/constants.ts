import type { CrpBundle } from './types.js'

export type BundleType = CrpBundle['bundleType']
export type SourceType = NonNullable<CrpBundle['sources']>[number]['sourceType']
export type AgentType = NonNullable<CrpBundle['agents']>[number]['agentType']
export type ActivityType = NonNullable<CrpBundle['activities']>[number]['activityType']
export type EdgeType = NonNullable<CrpBundle['edges']>[number]['edgeType']
export type TransformationType = NonNullable<CrpBundle['edges']>[number]['transformationType']

export const BUNDLE_TYPES: readonly BundleType[] = [
  'document',
  'clipboard',
  'reuse-event',
  'derivation',
  'provenance-export'
]
export const SOURCE_TYPES: readonly SourceType[] = [
  'human-authored',
  'ai-generated',
  'ai-assisted',
  'external-quoted',
  'unknown'
]
export const AGENT_TYPES: readonly AgentType[] = [
  'person',
  'organization',
  'model',
  'service',
  'system'
]
export const ACTIVITY_TYPES: readonly ActivityType[] = [
  'create',
  'paste',
  'import',
  'edit',
  'ai_generate',
  'reuse_detected',
  'reuse_notified',
  'copy',
  'derive',
  'research',
  'plan',
  'review'
]
export const EDGE_TYPES: readonly EdgeType[] = [
  'wasDerivedFrom',
  'wasGeneratedBy',
  'used',
  'wasAttributedTo',
  'wasAssociatedWith',
  'actedOnBehalfOf'
]
export const TRANSFORMATION_TYPES: readonly TransformationType[] = [
  'verbatim',
  'quote',
  'summary',
  'paraphrase',
  'translate',
  'combine',
  'edit',
  'ai_generate',
  'unknown'
]
