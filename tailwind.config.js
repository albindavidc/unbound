/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./views/user/*.html','./views/admin/*.html', './public/js/*.js', './public/css/*.css'],
  theme: {
    extend: {
      colors: {
        // Extend common colors
        blue: {
          100: '#ebf8ff',
          200: '#bee3f8',
          300: '#90cdf4',
          400: '#63b3ed',
          500: '#4299e1',
          600: '#3182ce',
          700: '#2b6cb0',
          800: '#2c5282',
          900: '#2a4365',
        },
        red: {
          100: '#fff5f5',
          200: '#fed7d7',
          300: '#feb2b2',
          400: '#fc8181',
          500: '#f56565',
          600: '#e53e3e',
          700: '#c53030',
          800: '#9b2c2c',
          900: '#742a2a',
        },
        // Add custom colors
        customGray: '#f0f0f0',
        customDarkBlue: '#1f2a44',
        customPrimary: '#4a90e2',
        customAccent: '#f4a261',
      },
      fontFamily: {
        baloo: ['"Baloo"', 'cursive'],
      },
    },
  },
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
};
