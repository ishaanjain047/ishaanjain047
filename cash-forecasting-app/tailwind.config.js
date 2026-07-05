/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#FBFAF7',
        card: '#FFFFFF',
        'table-header': '#F5F3EE',
        border: {
          DEFAULT: '#E8E5DF',
          input: '#D3CEC6',
          subtle: '#E0E0E0',
        },
        ink: {
          primary: '#1A1A1A',
          muted: '#9C9A95',
          secondary: '#6B6B6B',
          soft: '#797469',
        },
        chip: {
          neutral: '#424242',
          'neutral-bg': '#F7F7F7',
          'neutral-bg2': '#F0F0F0',
        },
        brand: {
          orange: '#ED803C',
        },
        green: {
          bg: '#E2F9E8',
          'bg-bull': '#EFFDF4',
          'bg-header': '#F0F6F2',
          text: '#34744B',
          'text-bull': '#376A42',
          'text-header': '#42925B',
        },
        blue: {
          bg: '#D6E8FD',
          text: '#356FE7',
        },
        amber: {
          bg: '#FCF1CC',
          text: '#CE6F2A',
        },
        red: {
          bg: '#FBF3F2',
          'bg-bear': '#F8EAEA',
          'bg-header': '#FBF1EF',
          text: '#972A23',
          'text-bear': '#9B3B37',
          'text-header': '#B14434',
        },
        chart: {
          green: '#53B071',
          red: '#D35E59',
        },
        btn: {
          'primary-bg': '#292929',
          'primary-active': '#1A1A1A',
          'primary-text': '#FFFFFF',
          'secondary-bg': '#FFFFFF',
          'secondary-border': '#D3CEC6',
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '10px',
        input: '7px',
      },
    },
  },
  plugins: [],
}
