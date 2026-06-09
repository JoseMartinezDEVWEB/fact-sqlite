/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        'print': {'raw': 'print'},
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'primary': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      // Configuraciones específicas para impresión
      typography: {
        print: {
          css: {
            maxWidth: '100%',
            width: '100%',
            color: '#000',
            fontSize: '12px',
            lineHeight: '1.3',
          },
        },
      },
    },
  },
  plugins: [
    function({ addComponents }) {
      addComponents({
        '@media print': {
          '.no-print': {
            display: 'none !important',
          },
          'body': {
            margin: '0',
            padding: '0',
            '-webkit-print-color-adjust': 'exact',
            'print-color-adjust': 'exact',
          },
          '.invoice-print-container': {
            width: '100%',
            margin: '0 auto',
            padding: '0',
            boxShadow: 'none',
            border: 'none',
          },
        },
      });
    },
  ],
}

