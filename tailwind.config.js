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

        // Design tokens — values live in src/index.css (:root + html[data-theme="dark"])
        "surface-0":"rgb(var(--surface-0) / <alpha-value>)",
        "surface-1":"rgb(var(--surface-1) / <alpha-value>)",
        "surface-2":"rgb(var(--surface-2) / <alpha-value>)",
        "line":"rgb(var(--line) / <alpha-value>)",
        "content":"rgb(var(--content) / <alpha-value>)",
        "muted":"rgb(var(--muted) / <alpha-value>)",
        "field":"rgb(var(--field) / <alpha-value>)",
        "accent":{
          DEFAULT:"rgb(var(--accent) / <alpha-value>)",
          hover:"rgb(var(--accent-hover) / <alpha-value>)",
        },
        "gridline":"var(--gridline)",
        "hoverlay":"var(--hoverlay)",
      },
      // Dashboard Builder editor type scale (index.css --dbe-fs-*): text-dbe-head / -body / -meta.
      fontSize: {
        'dbe-head': 'var(--dbe-fs-head)',
        'dbe-h1': 'var(--dbe-fs-h1)',
        'dbe-h2': 'var(--dbe-fs-h2)',
        'dbe-h3': 'var(--dbe-fs-h3)',
        'dbe-body': 'var(--dbe-fs-body)',
        'dbe-meta': 'var(--dbe-fs-meta)',
        // App-wide type scale (index.css --ui-fs-*), see CLAUDE.md section 8.
        'ui-title': 'var(--ui-fs-title)',
        'ui-heading': 'var(--ui-fs-heading)',
        'ui-body': 'var(--ui-fs-body)',
        'ui-small': 'var(--ui-fs-small)',
        'ui-micro': 'var(--ui-fs-micro)',
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

