const SOURCE_COLORS: Record<string, string> = {
  'human-authored': 'bg-blue-900/50 text-blue-300',
  'ai-generated': 'bg-purple-900/50 text-purple-300',
  'ai-assisted': 'bg-violet-900/50 text-violet-300',
  'external-quoted': 'bg-amber-900/50 text-amber-300',
  unknown: 'bg-gray-800 text-gray-400'
}

const TRANSFORM_COLORS: Record<string, string> = {
  verbatim: 'bg-green-900/50 text-green-300',
  quote: 'bg-blue-900/50 text-blue-300',
  summary: 'bg-amber-900/50 text-amber-300',
  paraphrase: 'bg-orange-900/50 text-orange-300',
  translate: 'bg-cyan-900/50 text-cyan-300',
  combine: 'bg-pink-900/50 text-pink-300',
  edit: 'bg-yellow-900/50 text-yellow-300',
  ai_generate: 'bg-purple-900/50 text-purple-300',
  unknown: 'bg-gray-800 text-gray-400'
}

export function SourceBadge({ type }: { type: string }) {
  const colors = SOURCE_COLORS[type] ?? SOURCE_COLORS.unknown!
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${colors}`}>
      {type}
    </span>
  )
}

export function TransformBadge({ type }: { type: string }) {
  const colors = TRANSFORM_COLORS[type] ?? TRANSFORM_COLORS.unknown!
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${colors}`}>
      {type}
    </span>
  )
}
