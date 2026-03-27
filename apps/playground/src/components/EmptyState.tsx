export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-gray-500">
      <div className="text-4xl">~</div>
      <div>
        <h2 className="text-lg font-medium text-gray-400">Cliproot Playground</h2>
        <p className="mt-1 max-w-sm text-sm">
          Paste a clip from the browser extension, open a{' '}
          <code className="text-gray-400">.cliproot/</code> folder, or upload a bundle JSON file to
          inspect provenance.
        </p>
      </div>
    </div>
  )
}
