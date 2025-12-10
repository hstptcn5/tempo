/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
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
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
            },
            boxShadow: {
                'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
                'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
            },
            backdropBlur: {
                'glass': '10px',
            },
            animation: {
                'spin-slow': 'spin 3s linear infinite',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
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
