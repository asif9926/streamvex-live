// useHLS.js — HLS.js stream loader hook (centralized)
// Blueprint: src/hooks/useHLS.js
// VideoPlayer.jsx এ ব্যবহার হয় — component clean রাখার জন্য HLS logic এখানে

import { useEffect, useRef, useCallback } from 'react'
import Hls from 'hls.js'
import { proxyUrl, SKIP_PROXY } from '../utils/corsProxy.js'

// CORS proxy দিয়ে URL resolve করো
function resolveUrl(url) {
  if (!url) return ''
  if (SKIP_PROXY) return url
  return proxyUrl(url)
}

/**
 * useHLS — HLS.js stream loader hook
 *
 * @param {React.RefObject} videoRef   — <video> element এর ref
 * @param {string}          streamUrl  — primary m3u8 URL
 * @param {string}          backupUrl  — fallback m3u8 URL (primary fail হলে auto-switch)
 * @param {object}          callbacks
 *   @param {Function} onLevels    — (levels: {index, label}[]) => void
 *   @param {Function} onQuality   — (index: number, label: string) => void
 *   @param {Function} onBuffering — (isBuffering: boolean) => void
 *   @param {Function} onError     — (message: string|null) => void
 *   @param {Function} onPlay      — () => void
 *
 * @returns {{ setQualityLevel, retry, hlsRef }}
 *
 * @example
 * const { setQualityLevel, retry } = useHLS(videoRef, streamUrl, backupUrl, {
 *   onBuffering: setBuffering,
 *   onError:     setError,
 *   onLevels:    setLevels,
 * })
 */
export function useHLS(videoRef, streamUrl, backupUrl, callbacks = {}) {
  const hlsRef     = useRef(null)
  const retriesRef = useRef(0)

  const {
    onLevels    = () => {},
    onQuality   = () => {},
    onBuffering = () => {},
    onError     = () => {},
    onPlay      = () => {},
  } = callbacks

  // ── Core loader ──────────────────────────────────────
  const initHls = useCallback((rawUrl) => {
    const video = videoRef.current
    if (!video || !rawUrl) return

    // আগের HLS instance destroy করো — memory leak বন্ধ
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    onBuffering(true)
    onError(null)

    const url            = resolveUrl(rawUrl)
    const backupResolved = backupUrl ? resolveUrl(backupUrl) : null

    // ── HLS.js supported browsers (Chrome, Firefox, Edge) ──
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker:                true,
        lowLatencyMode:              true,   // live stream latency কমায়
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

      // manifest parse হলে quality levels পাও + autoplay শুরু করো
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const lvls = data.levels.map((l, i) => ({
          index: i,
          label: l.height ? `${l.height}p` : `Level ${i}`,
        }))
        onLevels(lvls)
        onBuffering(false)
        video.play().catch(() => {})
        onPlay()
      })

      // quality level switch হলে notify করো
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const lvl = hls.levels[data.level]
        onQuality(data.level, lvl?.height ? `${lvl.height}p` : 'Auto')
      })

      // fragment loading শুরু হলে buffering বন্ধ
      hls.on(Hls.Events.FRAG_LOADED, () => onBuffering(false))

      // Error handling — fatal error গুলোই handle করো
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return   // non-fatal — HLS নিজেই recover করে

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (retriesRef.current < 3) {
            // network error — 2 সেকেন্ড পর retry
            retriesRef.current += 1
            setTimeout(() => hls.startLoad(), 2000)
          } else if (backupResolved && url !== backupResolved) {
            // primary 3 বার fail → backup URL try করো
            retriesRef.current = 0
            initHls(backupUrl)
          } else {
            onError('Stream unavailable. Please try another channel.')
          }
        } else {
          // media/other fatal error
          hls.destroy()
          if (backupResolved && url !== backupResolved) {
            retriesRef.current = 0
            initHls(backupUrl)
          } else {
            onError('Playback error. Try refreshing the page.')
          }
        }
      })

    // ── Safari Native HLS ──────────────────────────────
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.addEventListener(
        'loadedmetadata',
        () => { onBuffering(false); video.play().catch(() => {}); onPlay() },
        { once: true }
      )
    } else {
      onError('Your browser does not support HLS streaming.')
    }
  }, [backupUrl, onBuffering, onError, onLevels, onPlay, onQuality, videoRef])

  // ── streamUrl বদলালে reload ──────────────────────────
  useEffect(() => {
    if (streamUrl) {
      retriesRef.current = 0
      initHls(streamUrl)
    }
    return () => {
      // cleanup — component unmount বা streamUrl বদলানোর আগে
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [streamUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ───────────────────────────────────────

  // HLS quality level manually সেট করো (-1 = auto)
  const setQualityLevel = useCallback((index) => {
    if (!hlsRef.current) return
    hlsRef.current.currentLevel = index
  }, [])

  // Manual retry — error overlay এর "Retry" বাটনে
  const retry = useCallback(() => {
    retriesRef.current = 0
    if (streamUrl) initHls(streamUrl)
  }, [streamUrl, initHls])

  return { setQualityLevel, retry, hlsRef }
}
