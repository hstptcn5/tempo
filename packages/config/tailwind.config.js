/** @type {import('tailwindcss').Config} */
const preset = require('./tailwind.preset');

module.exports = {
    presets: [preset],
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        '../../packages/ui-web3/src/**/*.{js,ts,jsx,tsx}',
    ],
};
