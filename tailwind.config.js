/** @type {import('tailwindcss').Config} */
export default {
  content:["./src/**/*.{js,jsx}"],
  darkMode: ['selector', '[data-theme="dark"]'],

  
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors:{
        "primaryLine":"var(--mainprimary)",
        "secLine":"var(--mainsec)",
        "topbarLine":"var(--topbar)",
        
        // "topbarLine":"#6102af",
      },
      backgroundImage: {
        "primaryLine":"var(--mainprimary)",
        // "topbarLine":"var(--topbar)",
        
      },
      backgroundColor:{
        'pbutton':"var(--mainsec)"
      },
      borderColor:{
        'pbutton':"var(--mainsec)",
        "primaryLine":"var(--mainprimary)",
      },
      stroke:{
        'scolor':"var(--mainsec)",
        
        "pcolor":"var(--mainprimary)",
      }
    },
  },
  plugins: [require('tailwind-scrollbar')],
}

