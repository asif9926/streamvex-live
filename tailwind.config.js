// tailwind.config.js
// StreamVex Live — Tailwind CSS v3 Configuration
//
// Blueprint Design System:
//   Colors:      brand-{bg, surface, elevated, red, green, blue, border}
//   Fonts:       Inter (body) + Teko (sports scores) — [Update #4]
//   Animations:  shimmer, marquee, pulse-live
//   Max widths:  content(1400) player(900) tournament(1200)
//   Utilities:   glass, gradient-text, card-glow, scrollbar-hide, live-dot

/** @type {import('tailwindcss').Config} */
export default {
  // ── Content paths — Tailwind scans these for class names ──
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],

  theme: {
    extend: {

      // ── Brand Colors (Blueprint Design System) ────────────
      colors: {
        brand: {
          bg:       '#0A0A0F',              // মেইন background
          surface:  '#141418',              // card background
          elevated: '#1E1E26',              // hover / active state
          red:      '#E50914',              // LIVE badge, CTA button
          green:    '#00DC82',              // online indicator
          blue:     '#0066FF',              // links, secondary accent
          border:   'rgba(255,255,255,0.08)', // subtle borders
        },
      },

      // ── Typography — [Update #4] Teko sports font ─────────
      fontFamily: {
        sans:   ['Inter',          'ui-sans-serif', 'system-ui', 'sans-serif'],
        sports: ['Teko',           'ui-sans-serif', 'sans-serif'],  // live score numbers
        mono:   ['ui-monospace',   'SFMono-Regular', 'monospace'],
      },

      // ── Max widths (Blueprint layout rules) ───────────────
      maxWidth: {
        content:    '1400px',   // page container max
        player:     '900px',    // video player max — no stretch on ultrawide
        tournament: '1200px',   // scores / tournament content max
      },

      // ── Custom Animations ──────────────────────────────────
      animation: {
        // Live badge pulse — slightly slower than default for less distraction
        'pulse-live':   'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // Skeleton shimmer loading
        'shimmer':      'shimmer 2s linear infinite',
        // Ticker / marquee scroll (Home page announcement bar)
        'marquee':      'marquee 35s linear infinite',
      },

      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },  // -50% because content is doubled
        },
      },

      // ── Background images ──────────────────────────────────
      backgroundImage: {
        // Used by gradient-text utility class
        'gradient-brand': 'linear-gradient(135deg, #E50914 0%, #ff6b6b 100%)',
        // Used by hero section ambient glow
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },

      // ── Box shadows ────────────────────────────────────────
      boxShadow: {
        'brand-red-sm': '0 0 0 1px rgba(229,9,20,0.3)',
        'brand-glow':   '0 0 20px rgba(229,9,20,0.15)',
      },

    },
  },

  plugins: [
    // ── Custom utility classes ─────────────────────────────
    // These classes are used throughout the src/ components.
    // Defined here so Tailwind doesn't purge them.
    function({ addUtilities, addComponents, theme }) {

      // ── Glass morphism (Header, Watch page nav) ──────────
      addUtilities({
        '.glass': {
          background:   'rgba(20, 20, 24, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        },
      })

      // ── Gradient text (Hero heading, 404, stats) ─────────
      addUtilities({
        '.gradient-text': {
          background:            'linear-gradient(135deg, #E50914 0%, #ff6b6b 50%, #ff8c42 100%)',
          WebkitBackgroundClip:  'text',
          WebkitTextFillColor:   'transparent',
          backgroundClip:        'text',
          color:                 'transparent',
        },
      })

      // ── Card glow hover (ChannelCard, interactive cards) ──
      addUtilities({
        '.card-glow': {
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4)',
          },
        },
      })

      // ── Scrollbar hide (Tabs overflow-x, etc.) ───────────
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width':    'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      })

      // ── Live dot (LIVE badge animated dot) ───────────────
      addUtilities({
        '.live-dot': {
          width:        '6px',
          height:       '6px',
          borderRadius: '50%',
          display:      'inline-block',
          backgroundColor: theme('colors.brand.red'),
          boxShadow:    '0 0 6px rgba(229, 9, 20, 0.8)',
        },
      })

      // ── Shimmer skeleton background ───────────────────────
      addUtilities({
        '.shimmer': {
          backgroundImage:  'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0) 100%)',
          backgroundSize:   '200% 100%',
          animation:        'shimmer 2s linear infinite',
        },
      })

    },
  ],
}
