import type { CrpBundle } from './types.js'

export type BundleType = CrpBundle['bundleType']
export type SourceType = NonNullable<CrpBundle['sources']>[number]['sourceType']
export type AgentType = NonNullable<CrpBundle['agents']>[number]['agentType']
export type ActivityType = NonNullable<CrpBundle['activities']>[number]['activityType']
export type TransformationType = NonNullable<CrpBundle['derivationEdges']>[number]['transformationType']

export const BUNDLE_TYPES: readonly BundleType[] = ['document', 'clipboard', 'reuse-event', 'derivation', 'provenance-export']
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
  'derive'
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
