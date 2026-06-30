// playerStore.js — Zustand store for video player state
// Blueprint: src/store/playerStore.js
// State management: Zustand
// Used by: Watch page, VideoPlayer component, mini-player (future)

import { create } from 'zustand'

export const usePlayerStore = create((set, get) => ({

  // ── State ────────────────────────────────────────────
  currentChannelId: null,       // currently playing channel id
  streamUrl:        null,       // active stream URL
  backupUrl:        null,       // backup stream URL (auto-fallback)
  channelTitle:     '',         // channel name — player header এ দেখায়
  isPlaying:        false,      // play/pause state
  isMuted:          false,
  volume:           1,          // 0–1
  isFullscreen:     false,
  isPip:            false,      // Picture-in-Picture active?
  quality:          'auto',     // 'auto' | '1080p' | '720p' | '480p' | '360p'
  isBuffering:      false,
  hasError:         false,
  errorMessage:     null,

  // ── Actions ───────────────────────────────────────────

  // নতুন channel load করো
  setCurrentChannel: (channel) => set({
    currentChannelId: channel?.id    ?? null,
    streamUrl:        channel?.streamUrl ?? null,
    backupUrl:        channel?.backupUrl ?? null,
    channelTitle:     channel?.name  ?? '',
    isPlaying:        false,
    isBuffering:      true,
    hasError:         false,
    errorMessage:     null,
  }),

  // play/pause toggle
  setPlaying: (val) => set({ isPlaying: !!val }),

  // mute toggle
  setMuted: (val) => set({ isMuted: !!val }),

  // volume 0–1
  setVolume: (val) => set({
    volume:  Math.max(0, Math.min(1, val)),
    isMuted: val === 0,
  }),

  // buffering state
  setBuffering: (val) => set({ isBuffering: !!val }),

  // fullscreen state
  setFullscreen: (val) => set({ isFullscreen: !!val }),

  // Picture-in-Picture state
  setPip: (val) => set({ isPip: !!val }),

  // quality level
  setQuality: (q) => set({ quality: q }),

  // error state
  setError: (message) => set({
    hasError:     !!message,
    errorMessage: message || null,
    isBuffering:  false,
  }),

  clearError: () => set({ hasError: false, errorMessage: null }),

  // player সম্পূর্ণ reset করো
  clearPlayer: () => set({
    currentChannelId: null,
    streamUrl:        null,
    backupUrl:        null,
    channelTitle:     '',
    isPlaying:        false,
    isBuffering:      false,
    hasError:         false,
    errorMessage:     null,
    isPip:            false,
    isFullscreen:     false,
  }),

  // ── Derived ──────────────────────────────────────────
  isActive: () => !!get().currentChannelId,
}))
