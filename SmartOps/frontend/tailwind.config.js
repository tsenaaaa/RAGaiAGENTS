/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ice: {
          light: '#F4FAFC',
          DEFAULT: '#E5F6FA',
          dark: '#CBEAF3',
        },
        soft: {
          light: '#A3D9F5',
          DEFAULT: '#72C4EE',
          dark: '#4AABDE',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F8FBFB',
        }
      },
      backgroundImage: {
        'gradient-iconic': 'linear-gradient(135deg, #E5F6FA 0%, #72C4EE 100%)',
        'gradient-glow': 'radial-gradient(circle, rgba(114,196,238,0.15) 0%, rgba(255,255,255,0) 70%)',
      },
      boxShadow: {
        'iconic': '0 10px 40px -10px rgba(114, 196, 238, 0.4)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
