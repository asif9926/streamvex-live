// VideoPlayer.jsx — HLS video player with CORS proxy, PiP, fullscreen, quality selector
// [Update #3] ErrorBoundary দিয়ে wrap করা — crash হলেও site ভাঙবে না

import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { proxyUrl, SKIP_PROXY } from '../../utils/corsProxy.js'
import ErrorBoundary from '../ui/ErrorBoundary.jsx'

// ── Helpers ─────────────────────────────────────────────
function formatTime(s) {
  if (!isFinite(s) || s < 0) return '0:00'
  const m   = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function resolveUrl(url) {
  if (!url) return ''
  if (SKIP_PROXY) return url
  return proxyUrl(url)
}

// ── Inner player (wrapped below) ────────────────────────
function VideoPlayerInner({ streamUrl, backupUrl, title = '' }) {
  const videoRef     = useRef(null)
  const hlsRef       = useRef(null)
  const containerRef = useRef(null)
  const hideTimer    = useRef(null)
  const retriesRef   = useRef(0)
  const mediaRetriesRef = useRef(0)   // ✅ [Audit Fix] separate retry counter for MEDIA_ERROR recovery

  const [playing,      setPlaying]      = useState(false)
  const [muted,        setMuted]        = useState(false)
  const [volume,       setVolume]       = useState(1)
  const [buffering,    setBuffering]    = useState(true)
  const [error,        setError]        = useState(null)
  const [fullscreen,   setFullscreen]   = useState(false)
  const [showCtrl,     setShowCtrl]     = useState(true)
  const [levels,       setLevels]       = useState([])
  const [currentLevel, setCurrentLevel] = useState(-1)
  const [pip,          setPip]          = useState(false)
  const [duration,     setDuration]     = useState(0)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [isLive,       setIsLive]       = useState(true)

  // ── HLS Init ──────────────────────────────────────────
  const initHls = useCallback((rawUrl) => {
    const video = videoRef.current
    if (!video || !rawUrl) return

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    setError(null)
    setBuffering(true)

    const url            = resolveUrl(rawUrl)
    const backupResolved = backupUrl ? resolveUrl(backupUrl) : null

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker:                true,
        lowLatencyMode:              true,
        backBufferLength:            60,
        maxBufferLength:             30,
        liveSyncDurationCount:       3,
        liveMaxLatencyDurationCount: 10,
        fragLoadingTimeOut:          20000,
        manifestLoadingTimeOut:      15000,
        levelLoadingTimeOut:         15000,
      })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setLevels(data.levels.map((l, i) => ({ index: i, label: l.height ? `${l.height}p` : `L${i}` })))
        video.play().catch(() => {})
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => setCurrentLevel(data.level))

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (retriesRef.current < 3) {
            retriesRef.current++
            setTimeout(() => hls.startLoad(), 2000)
          } else if (backupResolved && url !== backupResolved) {
            retriesRef.current = 0; initHls(backupUrl)
          } else {
            setError('Stream unavailable. Please try another channel.')
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          // ✅ [Audit Fix] Media errors (e.g. buffer stalls, decode glitches)
          // are usually recoverable in-place — try hls.js's built-in
          // recovery before giving up on the stream and switching/destroying.
          if (mediaRetriesRef.current < 3) {
            mediaRetriesRef.current++
            hls.recoverMediaError()
          } else if (backupResolved && url !== backupResolved) {
            mediaRetriesRef.current = 0
            hls.destroy()
            retriesRef.current = 0; initHls(backupUrl)
          } else {
            hls.destroy()
            setError('Playback error. Try refreshing the page.')
          }
        } else {
          hls.destroy()
          if (backupResolved && url !== backupResolved) {
            retriesRef.current = 0; initHls(backupUrl)
          } else {
            setError('Playback error. Try refreshing the page.')
          }
        }
      })

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = url
      video.addEventListener('loadedmetadata', () => video.play().catch(() => {}))
    } else {
      setError('Your browser does not support HLS streaming.')
    }
  }, [backupUrl])

  useEffect(() => {
    if (streamUrl) { retriesRef.current = 0; mediaRetriesRef.current = 0; initHls(streamUrl) }
    return () => { if (hlsRef.current) hlsRef.current.destroy() }
  }, [streamUrl]) // eslint-disable-line react-hooks/exhaustive-deps -- intentional: only reload on streamUrl change, not on every initHls identity change

  // ── Video events ──────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPlay    = () => setPlaying(true)
    const onPause   = () => setPlaying(false)
    const onWait    = () => setBuffering(true)
    const onPlayng  = () => setBuffering(false)
    const onCanPlay = () => setBuffering(false)
    const onTime    = () => { setCurrentTime(v.currentTime); setDuration(v.duration || 0) }
    const onMeta    = () => { setDuration(v.duration || 0); setIsLive(!isFinite(v.duration) || v.duration > 7200) }
    const onEnterPip = () => setPip(true)
    const onLeavePip = () => setPip(false)

    v.addEventListener('play',                    onPlay)
    v.addEventListener('pause',                   onPause)
    v.addEventListener('waiting',                 onWait)
    v.addEventListener('playing',                 onPlayng)
    v.addEventListener('canplay',                 onCanPlay)
    v.addEventListener('timeupdate',              onTime)
    v.addEventListener('loadedmetadata',          onMeta)
    v.addEventListener('enterpictureinpicture',   onEnterPip)
    v.addEventListener('leavepictureinpicture',   onLeavePip)
    return () => {
      v.removeEventListener('play',                    onPlay)
      v.removeEventListener('pause',                   onPause)
      v.removeEventListener('waiting',                 onWait)
      v.removeEventListener('playing',                 onPlayng)
      v.removeEventListener('canplay',                 onCanPlay)
      v.removeEventListener('timeupdate',              onTime)
      v.removeEventListener('loadedmetadata',          onMeta)
      v.removeEventListener('enterpictureinpicture',   onEnterPip)
      v.removeEventListener('leavepictureinpicture',   onLeavePip)
    }
  }, [])

  // ── Auto-hide controls ────────────────────────────────
  const showControls = useCallback(() => {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowCtrl(false), 3000)
  }, [])
  useEffect(() => () => clearTimeout(hideTimer.current), [])

  // ── Fullscreen listener ───────────────────────────────
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (document.activeElement && document.activeElement !== document.body &&
          !containerRef.current?.contains(document.activeElement)) return
      switch (e.code) {
        case 'Space':   e.preventDefault(); togglePlay();           break
        case 'KeyM':    toggleMute();                               break
        case 'KeyF':    toggleFullscreen();                         break
        case 'ArrowUp': e.preventDefault(); changeVolume(Math.min(1, volume + 0.1)); break
        case 'ArrowDown': e.preventDefault(); changeVolume(Math.max(0, volume - 0.1)); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [volume, playing]) // eslint-disable-line react-hooks/exhaustive-deps -- handler fns only close over refs + volume/playing (both already tracked)

  // ── Controls ──────────────────────────────────────────
  const togglePlay = () => { const v = videoRef.current; if (!v) return; playing ? v.pause() : v.play().catch(() => {}) }
  const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted) }
  const changeVolume = (val) => {
    const v = videoRef.current; if (!v) return
    const c = Math.max(0, Math.min(1, val))
    v.volume = c; v.muted = c === 0
    setVolume(c); setMuted(c === 0)
  }
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await containerRef.current?.requestFullscreen().catch(() => {})
    else await document.exitFullscreen().catch(() => {})
  }
  const togglePip = async () => {
    const v = videoRef.current; if (!v) return
    try { if (document.pictureInPictureElement) await document.exitPictureInPicture()
          else await v.requestPictureInPicture() } catch { /* PiP not supported/denied — safe to ignore */ }
  }
  const setQualityLevel = (index) => { if (!hlsRef.current) return; hlsRef.current.currentLevel = index; setCurrentLevel(index) }
  const seekToLive = () => {
    const v = videoRef.current; if (!v) return
    if (hlsRef.current) hlsRef.current.startLoad(-1)
    v.currentTime = v.duration; v.play().catch(() => {})
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative w-full bg-black rounded-xl overflow-hidden select-none focus:outline-none"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={showControls}
      onMouseLeave={() => setShowCtrl(false)}
      onClick={showControls}
    >
      <video ref={videoRef} className="w-full h-full object-contain" playsInline autoPlay />

      {/* Buffering spinner */}
      {buffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-brand-red animate-spin" />
            <span className="text-white/60 text-sm font-medium">Loading stream…</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center px-6">
            <div className="w-16 h-16 rounded-full bg-brand-red/20 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-brand-red">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">{error}</p>
            <p className="text-white/40 text-xs mb-4">Check your connection or try another channel.</p>
            <button
              onClick={() => { retriesRef.current = 0; mediaRetriesRef.current = 0; initHls(streamUrl) }}
              className="px-5 py-2 bg-brand-red text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >↺ Retry</button>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div className={`absolute inset-0 z-10 flex flex-col justify-between transition-opacity duration-300 ${showCtrl ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Top bar */}
        <div className="bg-gradient-to-b from-black/80 to-transparent px-4 pt-3 pb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1.5 bg-brand-red/90 text-white text-xs font-bold px-2 py-0.5 rounded flex-shrink-0">
                <span className="live-dot w-1.5 h-1.5 rounded-full bg-white" /> LIVE
              </span>
              {title && <span className="text-white/80 text-sm font-medium truncate">{title}</span>}
            </div>
            <select
              value={currentLevel}
              onChange={e => setQualityLevel(Number(e.target.value))}
              aria-label="Video quality"
              className="bg-black/60 text-white text-xs border border-white/20 rounded px-2 py-1 focus:outline-none cursor-pointer flex-shrink-0"
            >
              <option value={-1}>Auto</option>
              {levels.map(l => <option key={l.index} value={l.index}>{l.label}</option>)}
            </select>
          </div>
        </div>

        {/* Center play button */}
        <button
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center hover:bg-black/70 transition-all hover:scale-110"
        >
          {playing
            ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" /></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7 ml-1"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
          }
        </button>

        {/* Bottom controls */}
        <div className="bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-10">
          {!isLive && (
            <input type="range" min={0} max={duration || 0} value={currentTime}
              onChange={e => { if (videoRef.current) videoRef.current.currentTime = Number(e.target.value) }}
              aria-label="Seek"
              className="w-full h-1 mb-3 accent-brand-red cursor-pointer"
            />
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} className="text-white hover:text-brand-red transition-colors p-1">
                {playing
                  ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" /></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" /></svg>
                }
              </button>
              <div className="flex items-center gap-1.5 group/vol">
                <button onClick={toggleMute} aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'} className="text-white hover:text-brand-red transition-colors p-1">
                  {muted || volume === 0
                    ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9.547 3.062A.75.75 0 0 1 10 3.75v12.5a.75.75 0 0 1-1.264.546L4.703 13H3.167a.75.75 0 0 1-.7-.48A6.985 6.985 0 0 1 2 10c0-.887.165-1.737.468-2.52a.75.75 0 0 1 .699-.48h1.535l4.033-3.796a.75.75 0 0 1 .812-.142ZM13.28 7.22a.75.75 0 1 0-1.06 1.06L13.44 9.5l-1.22 1.22a.75.75 0 1 0 1.06 1.06l1.22-1.22 1.22 1.22a.75.75 0 1 0 1.06-1.06L15.56 9.5l1.22-1.22a.75.75 0 0 0-1.06-1.06L14.5 8.44l-1.22-1.22Z" /></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 6.5 6.5 0 0 1 0 7.778.75.75 0 0 0 1.06 1.06 8 8 0 0 0 0-9.899Z" /><path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 3.5 3.5 0 0 1 0 3.536.75.75 0 0 0 1.06 1.06 5 5 0 0 0 0-5.656Z" /></svg>
                  }
                </button>
                <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                  onChange={e => changeVolume(Number(e.target.value))}
                  aria-label="Volume"
                  className="w-16 h-1 accent-white opacity-0 group-hover/vol:opacity-100 transition-opacity cursor-pointer"
                />
              </div>
              {isLive
                ? <button onClick={seekToLive} aria-label="Jump to live" className="text-xs text-brand-red font-semibold hover:text-white transition-colors">● LIVE</button>
                : <span className="text-white/60 text-xs tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>
              }
            </div>
            <div className="flex items-center gap-1">
              {document.pictureInPictureEnabled && (
                <button onClick={togglePip} title="Picture in Picture" aria-label="Picture in Picture"
                  className={`p-1.5 rounded transition-colors ${pip ? 'text-brand-red' : 'text-white/70 hover:text-white'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2.5 5A1.5 1.5 0 0 0 1 6.5v7A1.5 1.5 0 0 0 2.5 15h15a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 17.5 5h-15Zm9 4h5.5v4H11.5V9Z" /></svg>
                </button>
              )}
              <button onClick={toggleFullscreen} title="Fullscreen (F)" aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} className="p-1.5 rounded text-white/70 hover:text-white transition-colors">
                {fullscreen
                  ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06L5.44 6.5H2.75a.75.75 0 0 0 0 1.5h4.5A.75.75 0 0 0 8 7.25v-4.5a.75.75 0 0 0-1.5 0v2.69L3.28 2.22ZM13.5 2.75a.75.75 0 0 0-1.5 0v4.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-2.69l3.22-3.22a.75.75 0 0 0-1.06-1.06L13.5 5.44V2.75ZM3.75 13H2.25a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 0-1.5 0v2.69L2.78 8.72a.75.75 0 0 0-1.06 1.06L5.44 13H3.75ZM13.5 13.25v2.69l3.22-3.22a.75.75 0 1 1 1.06 1.06L14.56 17h2.69a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 1.5 0Z" clipRule="evenodd" /></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M1 3.75A.75.75 0 0 1 1.75 3h5a.75.75 0 0 1 0 1.5H3.56l3.72 3.72a.75.75 0 0 1-1.06 1.06L2.5 5.56v3.19a.75.75 0 0 1-1.5 0v-5Zm18 0a.75.75 0 0 0-.75-.75h-5a.75.75 0 0 0 0 1.5h3.19l-3.72 3.72a.75.75 0 1 0 1.06 1.06l3.72-3.72v3.19a.75.75 0 0 0 1.5 0v-5ZM1 16.25a.75.75 0 0 0 .75.75h5a.75.75 0 0 0 0-1.5H3.56l3.72-3.72a.75.75 0 0 0-1.06-1.06L2.5 14.44v-3.19a.75.75 0 0 0-1.5 0v5Zm18 0a.75.75 0 0 1-.75.75h-5a.75.75 0 0 1 0-1.5h3.19l-3.72-3.72a.75.75 0 1 1 1.06-1.06l3.72 3.72v-3.19a.75.75 0 0 1 1.5 0v5Z" clipRule="evenodd" /></svg>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// [Update #3] ErrorBoundary wrap — exported default
export default function VideoPlayer(props) {
  return (
    <ErrorBoundary label="Video Player" fallback={
      <div className="w-full aspect-video bg-black rounded-xl flex items-center justify-center">
        <div className="text-center">
          <p className="text-brand-red font-semibold mb-1">⚠️ Player Error</p>
          <p className="text-white/40 text-sm">Stream লোড হয়নি। পেজ refresh করুন।</p>
        </div>
      </div>
    }>
      <VideoPlayerInner {...props} />
    </ErrorBoundary>
  )
}
