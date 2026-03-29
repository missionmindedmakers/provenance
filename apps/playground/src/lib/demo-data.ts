/** Inline demo bundle matching the CRP v0.0.3 schema example. */
export const DEMO_BUNDLE = {
  protocolVersion: '0.0.3' as const,
  bundleType: 'document' as const,
  createdAt: '2026-03-07T20:30:00Z',
  project: {
    id: 'proj_auth_refactor',
    name: 'Auth Refactor',
    description: 'Research and implementation context for OAuth PKCE',
    createdAt: '2026-03-07T19:55:00Z',
    updatedAt: '2026-03-07T20:30:00Z'
  },
  document: {
    id: 'doc_01',
    uri: 'https://example.com/docs/doc_01',
    title: 'Sample Attributed Document',
    canonicalHash: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  },
  agents: [
    { id: 'agent_alice', agentType: 'person' as const, name: 'Alice' },
    { id: 'agent_claude', agentType: 'model' as const, name: 'Claude Opus' }
  ],
  sources: [
    {
      id: 'src_01',
      sourceType: 'human-authored' as const,
      title: 'Original Draft',
      sourceUri: 'https://example.com/source/original',
      authorAgentId: 'agent_alice',
      createdAt: '2026-03-07T20:00:00Z'
    },
    {
      id: 'src_02',
      sourceType: 'ai-assisted' as const,
      title: 'AI Summary',
      authorAgentId: 'agent_claude',
      createdAt: '2026-03-07T20:10:00Z'
    }
  ],
  clips: [
    {
      clipHash: 'sha256-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      id: 'clip_01',
      projectId: 'proj_auth_refactor',
      documentId: 'doc_01',
      sourceRefs: ['src_01'],
      selectors: {
        textPosition: { start: 0, end: 23 },
        textQuote: { exact: 'Provenance starts here.' },
        editorPath: '0/0/0',
        dom: { elementId: 'paragraph-1', classPath: 'article-body p.lede' }
      },
      content: 'Provenance starts here.',
      textHash: 'sha256-CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      createdByActivityId: 'act_01'
    },
    {
      clipHash: 'sha256-DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      id: 'clip_02',
      projectId: 'proj_auth_refactor',
      documentId: 'doc_01',
      sourceRefs: ['src_01'],
      selectors: {
        textQuote: {
          exact: 'Provenance starts here, and this clip derives from clip_01.',
          prefix: 'Introduction: ',
          suffix: ' End.'
        }
      },
      content: 'Provenance starts here, and this clip derives from clip_01.',
      textHash: 'sha256-EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
      createdByActivityId: 'act_02'
    },
    {
      clipHash: 'sha256-FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      id: 'clip_03',
      projectId: 'proj_auth_refactor',
      documentId: 'doc_01',
      sourceRefs: ['src_02'],
      selectors: {
        textQuote: {
          exact: 'A concise summary of the original provenance concept.'
        }
      },
      content: 'A concise summary of the original provenance concept.',
      textHash: 'sha256-GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      createdByActivityId: 'act_03'
    }
  ],
  artifacts: [
    {
      artifactHash: 'sha256-HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
      id: 'artifact_plan_md',
      projectId: 'proj_auth_refactor',
      artifactType: 'markdown' as const,
      fileName: 'plan.md',
      mimeType: 'text/markdown',
      byteSize: 42,
      contentBase64: 'IyBQbGFuCgotIFJlc2VhcmNoCi0gSW1wbGVtZW50Cg==',
      createdAt: '2026-03-07T20:20:00Z'
    }
  ],
  clipArtifactRefs: [
    {
      clipHash: 'sha256-FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      artifactHash: 'sha256-HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
      relationship: 'cited_in' as const
    }
  ],
  edges: [
    {
      id: 'edge_01',
      edgeType: 'wasDerivedFrom' as const,
      subjectRef: 'sha256-DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      objectRef: 'sha256-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      transformationType: 'edit' as const,
      createdAt: '2026-03-07T20:05:00Z'
    },
    {
      id: 'edge_02',
      edgeType: 'wasDerivedFrom' as const,
      subjectRef: 'sha256-FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      objectRef: 'sha256-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      transformationType: 'summary' as const,
      agentId: 'agent_claude',
      createdAt: '2026-03-07T20:10:00Z'
    }
  ],
  activities: [
    {
      id: 'act_01',
      projectId: 'proj_auth_refactor',
      activityType: 'research' as const,
      agentId: 'agent_alice',
      usedSourceRefs: ['src_01'],
      generatedClipRefs: ['clip_01'],
      createdAt: '2026-03-07T20:01:00Z',
      endedAt: '2026-03-07T20:02:00Z'
    },
    {
      id: 'act_02',
      projectId: 'proj_auth_refactor',
      activityType: 'plan' as const,
      agentId: 'agent_alice',
      prompt: 'Turn the research clips into a concise implementation plan.',
      usedSourceRefs: ['src_01'],
      generatedClipRefs: ['clip_02'],
      createdAt: '2026-03-07T20:05:00Z',
      endedAt: '2026-03-07T20:06:00Z'
    },
    {
      id: 'act_03',
      projectId: 'proj_auth_refactor',
      activityType: 'ai_generate' as const,
      agentId: 'agent_claude',
      usedSourceRefs: ['src_02'],
      generatedClipRefs: ['clip_03'],
      createdAt: '2026-03-07T20:10:00Z',
      endedAt: '2026-03-07T20:11:00Z'
    }
  ],
  reuseEvents: [],
  signatures: []
}
