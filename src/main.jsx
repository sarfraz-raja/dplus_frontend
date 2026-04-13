import React from 'react'
import ReactDOM from 'react-dom/client'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import App from './App.jsx'
import './index.css'

/** Legacy inline handlers in `index.html` (e.g. copyToClipboard) expect global Swal — CDN removed. */
if (typeof window !== 'undefined') {
  window.Swal = Swal
}

/* Map CSS moved to their lazy-loaded components to avoid loading ~200KB CSS on every page */

import { BrowserRouter } from 'react-router-dom'  
import { Provider } from 'react-redux'
import store from './store'
/* Unicons imported per-component via named imports for tree-shaking */
import { ThemeProvider } from './context/ThemeContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter basename='/'>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  // </React.StrictMode>,
)
