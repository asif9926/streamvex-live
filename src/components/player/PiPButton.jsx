// PiPButton.jsx — Picture-in-Picture toggle button
// blueprint: src/components/player/PiPButton.jsx

export default function PiPButton({ active = false, onClick }) {
  if (!document.pictureInPictureEnabled) return null

  return (
    <button
      onClick={onClick}
      title="Picture in Picture"
      className={`p-1.5 rounded transition-all ${active ? 'text-brand-red' : 'text-white/70 hover:text-white'}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M2.5 5A1.5 1.5 0 0 0 1 6.5v7A1.5 1.5 0 0 0 2.5 15h15a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 17.5 5h-15Zm9 4h5.5v4H11.5V9Z" />
      </svg>
    </button>
  )
}
