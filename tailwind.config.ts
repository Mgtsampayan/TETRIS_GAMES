/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                'tetris-cyan': '#00f0f0',
                'tetris-blue': '#0000f0',
                'tetris-orange': '#f0a000',
                'tetris-yellow': '#f0f000',
                'tetris-green': '#00f000',
                'tetris-purple': '#a000f0',
                'tetris-red': '#f00000',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'pulse-slow': 'pulse 3s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
            fontFamily: {
                'game': ['Courier New', 'monospace'],
            },
            screens: {
                'xs': '475px',
            },
        },
    },
    plugins: [],
    // Optimize for reduced motion
    variants: {
        extend: {
            animation: ['motion-safe', 'motion-reduce'],
        },
    },
};