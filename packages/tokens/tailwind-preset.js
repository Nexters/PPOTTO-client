// Shared design tokens — consumed by mobile (tailwind.config.js presets)
// and web (@config in globals.css). Works with Tailwind v3 and v4.
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3b82f6',
          light: '#93c5fd',
          dark: '#1d4ed8',
        },
      },
    },
  },
};
