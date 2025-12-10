/** @type {import('tailwindcss').Config} */
module.exports = {
    presets: [require('@hst/config/tailwind/preset')],
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        '../../packages/ui-web3/src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};
