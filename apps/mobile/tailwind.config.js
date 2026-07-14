/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [
    require('nativewind/preset'),
    // ponytail: relative require, config-only file이라 workspace dep 등록 생략
    require('../../packages/tokens/tailwind-preset'),
  ],
};
