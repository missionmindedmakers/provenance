import { useMemo } from 'react'
import { line, curveBumpY } from 'd3-shape'
import { useBundleStore } from '../hooks/useBundleStore'
import { computeDagLayout, type LayoutEdge, type LayoutNode } from '../lib/dag-layout'
import { TransformBadge } from './Badge'

const NODE_W = 180
const NODE_H = 60
const PADDING = 40

const SOURCE_TYPE_COLORS: Record<string, string> = {
  'human-authored': '#1e3a5f',
  'ai-generated': '#3b1f5e',
  'ai-assisted': '#2d1854',
  'external-quoted': '#4a3318',
  unknown: '#1f2937',
}

const SOURCE_TYPE_STROKES: Record<string, string> = {
  'human-authored': '#3b82f6',
  'ai-generated': '#a855f7',
  'ai-assisted': '#8b5cf6',
  'external-quoted': '#f59e0b',
  unknown: '#6b7280',
}

const pathGenerator = line().curve(curveBumpY)

export function ProvenanceDag() {
  const clips = useBundleStore((s) => s.clips)
  const edges = useBundleStore((s) => s.edges)
  const selectClip = useBundleStore((s) => s.selectClip)
  const selectedClipHash = useBundleStore((s) => s.selectedClipHash)

  const layout = useMemo(() => computeDagLayout(clips, edges), [clips, edges])

  if (!layout) {
    return (
      <div className="flex h-full items-center justify-center text-gray-600">
        <p>No derivation edges to visualize</p>
      </div>
    )
  }

  const svgWidth = layout.width + PADDING * 2
  const svgHeight = layout.height + PADDING * 2

  return (
    <div className="h-full overflow-auto p-4">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto"
      >
        <g transform={`translate(${PADDING}, ${PADDING})`}>
          {/* Edges */}
          {layout.edges.map((edge) => (
            <DagEdge key={edge.edge.id} edge={edge} />
          ))}

          {/* Nodes */}
          {layout.nodes.map((node) => (
            <DagNode
              key={node.id}
              node={node}
              isSelected={selectedClipHash === node.id}
              onClick={() => selectClip(node.id)}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}

function DagNode({
  node,
  isSelected,
  onClick,
}: {
  node: LayoutNode
  isSelected: boolean
  onClick: () => void
}) {
  const sourceType =
    node.clip?.resolvedSources[0]?.sourceType ?? 'unknown'
  const fill = SOURCE_TYPE_COLORS[sourceType] ?? SOURCE_TYPE_COLORS.unknown!
  const stroke = isSelected
    ? '#818cf8'
    : (SOURCE_TYPE_STROKES[sourceType] ?? SOURCE_TYPE_STROKES.unknown!)

  const content =
    node.clip?.content ?? node.clip?.selectors?.textQuote?.exact ?? ''
  const preview = content.length > 50 ? content.slice(0, 47) + '...' : content
  const hashLabel = node.id.slice(7, 19)

  return (
    <g
      transform={`translate(${node.x - NODE_W / 2}, ${node.y - NODE_H / 2})`}
      onClick={onClick}
      className="cursor-pointer"
    >
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={6}
        fill={fill}
        stroke={stroke}
        strokeWidth={isSelected ? 2 : 1}
        opacity={node.clip ? 1 : 0.4}
      />
      <text
        x={8}
        y={18}
        fontSize={10}
        fontFamily="monospace"
        fill="#9ca3af"
      >
        {hashLabel}
      </text>
      <text
        x={8}
        y={34}
        fontSize={11}
        fill="#e5e7eb"
        className="select-none"
      >
        {preview || (node.clip ? '(empty)' : '(external)')}
      </text>
      {sourceType !== 'unknown' && (
        <text
          x={8}
          y={50}
          fontSize={9}
          fill={SOURCE_TYPE_STROKES[sourceType] ?? '#6b7280'}
        >
          {sourceType}
        </text>
      )}
    </g>
  )
}

function DagEdge({ edge }: { edge: LayoutEdge }) {
  const d = pathGenerator(edge.points)
  if (!d) return null

  // Midpoint for label
  const midIdx = Math.floor(edge.points.length / 2)
  const midPoint = edge.points[midIdx]
  if (!midPoint) return null

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="#4b5563"
        strokeWidth={1.5}
        markerEnd="url(#arrowhead)"
      />
      <text
        x={midPoint[0]}
        y={midPoint[1] - 6}
        textAnchor="middle"
        fontSize={9}
        fill="#9ca3af"
      >
        {edge.edge.transformationType}
      </text>
    </g>
  )
}
