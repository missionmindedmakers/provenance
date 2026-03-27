import { graphStratify, sugiyama } from 'd3-dag'
import type { Graph, GraphNode, GraphLink } from 'd3-dag'
import type { MergedClip, MergedEdge } from './bundle-merge'

export interface DagNodeDatum {
  id: string
  parentIds: string[]
  clip: MergedClip | null // null for ghost nodes (referenced but not loaded)
}

export interface LayoutNode {
  id: string
  x: number
  y: number
  clip: MergedClip | null
}

export interface LayoutEdge {
  sourceId: string
  targetId: string
  points: [number, number][]
  edge: MergedEdge
}

export interface DagLayout {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  width: number
  height: number
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 60

export function computeDagLayout(
  clips: Map<string, MergedClip>,
  edges: MergedEdge[]
): DagLayout | null {
  if (edges.length === 0) return null

  // Collect all clip hashes that participate in edges
  const relevantHashes = new Set<string>()
  const parentMap = new Map<string, Set<string>>()

  for (const edge of edges) {
    relevantHashes.add(edge.childClipHash)
    relevantHashes.add(edge.parentClipHash)

    let parents = parentMap.get(edge.childClipHash)
    if (!parents) {
      parents = new Set()
      parentMap.set(edge.childClipHash, parents)
    }
    parents.add(edge.parentClipHash)
  }

  // Build stratify input
  const data: DagNodeDatum[] = Array.from(relevantHashes).map((hash) => ({
    id: hash,
    parentIds: Array.from(parentMap.get(hash) ?? []),
    clip: clips.get(hash) ?? null
  }))

  try {
    const stratify = graphStratify()
    const graph: Graph<DagNodeDatum, undefined> = stratify(data)

    const layout = sugiyama().nodeSize([NODE_WIDTH + 20, NODE_HEIGHT + 30])
    const { width, height } = layout(graph as Graph)

    // Build edge lookup for metadata
    const edgeLookup = new Map<string, MergedEdge>()
    for (const edge of edges) {
      edgeLookup.set(`${edge.parentClipHash}->${edge.childClipHash}`, edge)
    }

    // Extract positioned nodes
    const nodes: LayoutNode[] = []
    for (const node of graph.nodes()) {
      const gn = node as GraphNode<DagNodeDatum>
      nodes.push({
        id: gn.data.id,
        x: gn.x,
        y: gn.y,
        clip: gn.data.clip
      })
    }

    // Extract positioned edges
    const layoutEdges: LayoutEdge[] = []
    for (const link of graph.links()) {
      const gl = link as GraphLink<DagNodeDatum, undefined>
      const sourceId = gl.source.data.id
      const targetId = gl.target.data.id
      const mergedEdge = edgeLookup.get(`${sourceId}->${targetId}`)
      if (!mergedEdge) continue

      layoutEdges.push({
        sourceId,
        targetId,
        points: gl.points.map((p) => [p[0]!, p[1]!]),
        edge: mergedEdge
      })
    }

    return { nodes, edges: layoutEdges, width, height }
  } catch {
    return null
  }
}
