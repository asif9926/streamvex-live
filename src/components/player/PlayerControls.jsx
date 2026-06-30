// PlayerControls.jsx — Video player control bar (play, volume, fullscreen, PiP)
// blueprint: src/components/player/PlayerControls.jsx

function formatTime(s) {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function PlayerControls({
  playing, muted, volume, fullscreen, pip, isLive,
  currentTime, duration, levels, currentLevel,
  onTogglePlay, onToggleMute, onChangeVolume,
  onToggleFullscreen, onTogglePip, onSeek,
  onSetQuality, onSeekToLive,
}) {
  return (
    <div className="bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-10">
      {/* VOD progress bar */}
      {!isLive && (
        <input
          type="range" min={0} max={duration || 0} value={currentTime}
          onChange={e => onSeek?.(Number(e.target.value))}
          className="w-full h-1 mb-3 accent-brand-red cursor-pointer"
        />
      )}

      <div className="flex items-center justify-between gap-3">
        {/* Left Controls */}
        <div className="flex items-center gap-2">
          <button onClick={onTogglePlay} className="text-white hover:text-brand-red transition-colors p-1">
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1.5 group/vol">
            <button onClick={onToggleMute} className="text-white hover:text-brand-red transition-colors p-1">
              {muted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
            </button>
            <input
              type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={e => onChangeVolume?.(Number(e.target.value))}
              className="w-16 h-1 accent-white opacity-0 group-hover/vol:opacity-100 transition-opacity cursor-pointer"
            />
          </div>

          {isLive ? (
            <button onClick={onSeekToLive} className="text-xs text-brand-red font-semibold hover:text-white transition-colors">
              ● LIVE
            </button>
          ) : (
            <span className="text-white/60 text-xs tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1">
          {/* Quality selector */}
          {levels.length > 0 && (
            <select
              value={currentLevel}
              onChange={e => onSetQuality?.(Number(e.target.value))}
              className="bg-black/60 text-white text-xs border border-white/20 rounded px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value={-1}>Auto</option>
              {levels.map(l => <option key={l.index} value={l.index}>{l.label}</option>)}
            </select>
          )}

          {/* PiP */}
          {document.pictureInPictureEnabled && (
            <button onClick={onTogglePip} title="Picture in Picture"
              className={`p-1.5 rounded transition-colors ${pip ? 'text-brand-red' : 'text-white/70 hover:text-white'}`}>
              <PipIcon />
            </button>
          )}

          {/* Fullscreen */}
          <button onClick={onToggleFullscreen} title="Fullscreen (F)"
            className="p-1.5 rounded text-white/70 hover:text-white transition-colors">
            {fullscreen ? <CompressIcon /> : <ExpandIcon />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────
function PlayIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" /></svg>
}
function PauseIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" /></svg>
}
function VolumeIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 6.5 6.5 0 0 1 0 7.778.75.75 0 0 0 1.06 1.06 8 8 0 0 0 0-9.899Z" /><path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 3.5 3.5 0 0 1 0 3.536.75.75 0 0 0 1.06 1.06 5 5 0 0 0 0-5.656Z" /></svg>
}
function MuteIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9.547 3.062A.75.75 0 0 1 10 3.75v12.5a.75.75 0 0 1-1.264.546L4.703 13H3.167a.75.75 0 0 1-.7-.48A6.985 6.985 0 0 1 2 10c0-.887.165-1.737.468-2.52a.75.75 0 0 1 .699-.48h1.535l4.033-3.796a.75.75 0 0 1 .812-.142ZM13.28 7.22a.75.75 0 1 0-1.06 1.06L13.44 9.5l-1.22 1.22a.75.75 0 1 0 1.06 1.06l1.22-1.22 1.22 1.22a.75.75 0 1 0 1.06-1.06L15.56 9.5l1.22-1.22a.75.75 0 0 0-1.06-1.06L14.5 8.44l-1.22-1.22Z" /></svg>
}
function PipIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2.5 5A1.5 1.5 0 0 0 1 6.5v7A1.5 1.5 0 0 0 2.5 15h15a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 17.5 5h-15Zm9 4h5.5v4H11.5V9Z" /></svg>
}
function ExpandIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M1 3.75A.75.75 0 0 1 1.75 3h5a.75.75 0 0 1 0 1.5H3.56l3.72 3.72a.75.75 0 0 1-1.06 1.06L2.5 5.56v3.19a.75.75 0 0 1-1.5 0v-5Zm18 0a.75.75 0 0 0-.75-.75h-5a.75.75 0 0 0 0 1.5h3.19l-3.72 3.72a.75.75 0 1 0 1.06 1.06l3.72-3.72v3.19a.75.75 0 0 0 1.5 0v-5ZM1 16.25a.75.75 0 0 0 .75.75h5a.75.75 0 0 0 0-1.5H3.56l3.72-3.72a.75.75 0 0 0-1.06-1.06L2.5 14.44v-3.19a.75.75 0 0 0-1.5 0v5Zm18 0a.75.75 0 0 1-.75.75h-5a.75.75 0 0 1 0-1.5h3.19l-3.72-3.72a.75.75 0 1 1 1.06-1.06l3.72 3.72v-3.19a.75.75 0 0 1 1.5 0v5Z" clipRule="evenodd" /></svg>
}
function CompressIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06L5.44 6.5H2.75a.75.75 0 0 0 0 1.5h4.5A.75.75 0 0 0 8 7.25v-4.5a.75.75 0 0 0-1.5 0v2.69L3.28 2.22ZM13.5 2.75a.75.75 0 0 0-1.5 0v4.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-2.69l3.22-3.22a.75.75 0 0 0-1.06-1.06L13.5 5.44V2.75ZM3.75 13H2.25a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 0-1.5 0v2.69L2.78 8.72a.75.75 0 0 0-1.06 1.06L5.44 13H3.75ZM13.5 13.25v2.69l3.22-3.22a.75.75 0 1 1 1.06 1.06L14.56 17h2.69a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 1.5 0Z" clipRule="evenodd" /></svg>
}
