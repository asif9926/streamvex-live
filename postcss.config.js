// postcss.config.js
// Vite এ Tailwind CSS চালাতে এই ফাইলটা দরকার
// এটা ছাড়া CSS build হবে না

export default {
  plugins: {
    tailwindcss:  {},
    autoprefixer: {},   // cross-browser vendor prefixes auto-add করে
  },
}
