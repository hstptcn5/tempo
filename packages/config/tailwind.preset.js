/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Minecraft Theme - Primary is Creeper/Emerald Green
                primary: '#10b981',
                'primary-dark': '#047857',
                // Background colors
                'background-light': '#f0fdf4',
                'background-dark': '#0f172a',
                'surface-light': '#ffffff',
                'surface-dark': '#1e293b',
                // Legacy aqua theme colors (keeping for backward compatibility)
                aqua: {
                    bg: '#F5FBFB',
                    text: '#2C3E50',
                    cyan: '#00C6FF',
                    green: '#00E676',
                },
                // Brand colors
                brand: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                },
                // Web3 specific
                success: '#22c55e',
                warning: '#eab308',
                error: '#ef4444',
                pending: '#f59e0b',
            },
            fontFamily: {
                // Minecraft-style fonts
                display: ['"Silkscreen"', 'cursive'],
                data: ['"VT323"', 'monospace'],
                mono: ['"Space Mono"', 'monospace'],
                // Legacy fonts
                sans: ['"DM Sans"', 'Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                // NO ROUNDED CORNERS - Minecraft Rule #1
                DEFAULT: '0px',
                'none': '0px',
                // Allow explicit rounded if needed
                'xl': '1rem',
                '2xl': '1.5rem',
            },
            boxShadow: {
                // Minecraft block shadows - 3D pixel effect
                'block': '4px 4px 0px 0px rgba(0,0,0,1)',
                'block-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
                'block-green': '4px 4px 0px 0px #047857',
                // Legacy shadows
                'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
                'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
                'water-glow': '0 10px 40px -10px rgba(0, 198, 255, 0.2)',
                'water-card': '0 4px 20px -5px rgba(44, 62, 80, 0.05)',
            },
            backdropBlur: {
                'glass': '10px',
            },
            backgroundImage: {
                'aqua-gradient': 'linear-gradient(90deg, #00C6FF, #00E676)',
            },
            animation: {
                'spin-slow': 'spin 3s linear infinite',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'bounce-slow': 'bounce 3s infinite',
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
        },
    },
    plugins: [],
};
