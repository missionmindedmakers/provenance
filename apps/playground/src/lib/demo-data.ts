/** Inline demo bundle matching the CRP v0.0.2 schema example. */
export const DEMO_BUNDLE = {
  protocolVersion: '0.0.2' as const,
  bundleType: 'document' as const,
  createdAt: '2026-03-07T20:30:00Z',
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
  derivationEdges: [
    {
      id: 'edge_01',
      childClipHash: 'sha256-DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      parentClipHash: 'sha256-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      transformationType: 'edit' as const,
      createdAt: '2026-03-07T20:05:00Z'
    },
    {
      id: 'edge_02',
      childClipHash: 'sha256-FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      parentClipHash: 'sha256-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      transformationType: 'summary' as const,
      agentId: 'agent_claude',
      createdAt: '2026-03-07T20:10:00Z'
    }
  ],
  activities: [
    {
      id: 'act_01',
      activityType: 'create' as const,
      agentId: 'agent_alice',
      usedSourceRefs: ['src_01'],
      generatedClipRefs: ['clip_01'],
      createdAt: '2026-03-07T20:01:00Z'
    },
    {
      id: 'act_02',
      activityType: 'edit' as const,
      agentId: 'agent_alice',
      usedSourceRefs: ['src_01'],
      generatedClipRefs: ['clip_02'],
      createdAt: '2026-03-07T20:05:00Z'
    },
    {
      id: 'act_03',
      activityType: 'ai_generate' as const,
      agentId: 'agent_claude',
      usedSourceRefs: ['src_02'],
      generatedClipRefs: ['clip_03'],
      createdAt: '2026-03-07T20:10:00Z'
    }
  ],
  reuseEvents: [],
  signatures: []
}
