// The top-scores rail shared by Garbage Run and Word Zap. Both games rendered
// this exact block, class names and all — only the heading and the "nothing
// yet" line differed.
export default function Leaderboard({
  label = '// TOP SCORES',
  enabled = true,
  status = 'idle',
  rows = [],
  emptyText = 'no scores yet — be the first',
  className = '',
  highlightName = '',
}) {
  const mine = highlightName.trim().toLowerCase()
  return (
    <div className={`garbage-run-leaderboard${className ? ` ${className}` : ''}`}>
      <div className="garbage-run-leaderboard-label">{label}</div>

      {!enabled && <p className="gallery-empty">leaderboard isn&apos;t configured</p>}
      {enabled && status === 'loading' && <p className="gallery-empty">loading…</p>}
      {enabled && status === 'error' && (
        <p className="gallery-empty">couldn&apos;t load the leaderboard</p>
      )}
      {enabled && status === 'ready' && rows.length === 0 && (
        <p className="gallery-empty">{emptyText}</p>
      )}
      {enabled && status === 'ready' && rows.length > 0 && (
        <ol className="garbage-run-leaderboard-list">
          {rows.map((row, i) => {
            const isMine = mine && (row.player_name || '').trim().toLowerCase() === mine
            return (
              <li key={row.id} className={isMine ? 'is-mine' : undefined}>
                <span className="garbage-run-leaderboard-rank">#{i + 1}</span>
                <span className="garbage-run-leaderboard-name">{row.player_name || 'anonymous'}</span>
                <span className="garbage-run-leaderboard-score">{row.score}</span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
