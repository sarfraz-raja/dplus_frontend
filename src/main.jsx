// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import Swal from 'sweetalert2'
// import 'sweetalert2/dist/sweetalert2.min.css'
// import App from './App.jsx'
// import './index.css'

// /** Legacy inline handlers in `index.html` (e.g. copyToClipboard) expect global Swal — CDN removed. */
// if (typeof window !== 'undefined') {
//   window.Swal = Swal
// }

// /* Map CSS moved to their lazy-loaded components to avoid loading ~200KB CSS on every page */

// import { BrowserRouter } from 'react-router-dom'  
// import { Provider } from 'react-redux'
// import store from './store'
// /* Unicons imported per-component via named imports for tree-shaking */
// import { ThemeProvider } from './context/ThemeContext.jsx'


// // 1. Import MSAL and your config
// import { PublicClientApplication, EventType } from "@azure/msal-browser";
// import { MsalProvider } from "@azure/msal-react";
// import { msalConfig } from "./authConfig";

// /** Initialize MSAL instance */
// const msalInstance = new PublicClientApplication(msalConfig);

// /** 
//  * Optional: Default to account 0 if already logged in.
//  * This helps the app remember the user on page refresh.
//  */
// if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
//     msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
// }


// // ReactDOM.createRoot(document.getElementById('root')).render(
// //   // <React.StrictMode>
// //     <Provider store={store}>
// //       <BrowserRouter basename='/'>
// //         <ThemeProvider>
// //           <App />
// //         </ThemeProvider>
// //       </BrowserRouter>
// //     </Provider>
// //   // </React.StrictMode>,
// // )

// // const root = ReactDOM.createRoot(document.getElementById('root'));

// // // 2. Wrap the render in the MSAL initialization promise
// // msalInstance.initialize().then(() => {
// //   console.log('[MSAL] initialize() resolved. window.name:', window.name, '| hash:', window.location.hash.slice(0, 60))

// //   if (typeof window.name === 'string' && window.name.includes('msal')) {
// //     console.log('[MSAL] Popup window detected — skipping React render. MSAL has broadcast the token to the parent window.')
// //     return
// //   }

// //   console.log('[MSAL] Main window — rendering React app.')
// //   root.render(
// //     <Provider store={store}>
// //       <BrowserRouter basename='/'>
// //         {/* 3. Wrap everything in MsalProvider */}
// //         <MsalProvider instance={msalInstance}>
// //           <ThemeProvider>
// //             <App />
// //           </ThemeProvider>
// //         </MsalProvider>
// //       </BrowserRouter>
// //     </Provider>
// //   );
// // });

// const root = ReactDOM.createRoot(document.getElementById('root'));

// // msalInstance.initialize().then(() => {
// //   console.log('[MSAL] initialize() resolved. window.name:', window.name, '| hash:', window.location.hash.slice(0, 60));

// //   // Check if this execution context is inside the MSAL popup
// //   const isMsalPopup = typeof window.name === 'string' && window.name.includes('msal');

// //   if (isMsalPopup) {
// //     console.log('[MSAL] Popup window context detected. Mounting minimal MSAL instance to process authentication...');
    
// //     // Render ONLY the provider so MSAL can parse the hash and communicate with the opener window
// //     root.render(
// //       <MsalProvider instance={msalInstance}>
// //         <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
// //           <h3>Authenticating... Please wait.</h3>
// //         </div>
// //       </MsalProvider>
// //     );
// //     return;
// //   }

// //   // Normal rendering flow for the main application window
// //   console.log('[MSAL] Main window — rendering React app.');
// //   root.render(
// //     <Provider store={store}>
// //       <BrowserRouter basename='/'>
// //         <MsalProvider instance={msalInstance}>
// //           <ThemeProvider>
// //             <App />
// //           </ThemeProvider>
// //         </MsalProvider>
// //       </BrowserRouter>
// //     </Provider>
// //   );
// // });

// msalInstance.initialize().then(() => {

//   console.log(
//     '[MSAL] initialize() resolved. window.name:',
//     window.name,
//     '| hash:',
//     window.location.hash.slice(0, 60)
//   );


//   // ============================================
//   // Existing code
//   // ============================================

//   const isMsalPopup =
//     typeof window.name === 'string' &&
//     window.name.includes('msal');

//   if (isMsalPopup) {

//     console.log(
//       '[MSAL] Popup window context detected.'
//     );

//     root.render(
//       <MsalProvider instance={msalInstance}>
//         <div>
//           <h3>Authenticating... Please wait.</h3>
//         </div>
//       </MsalProvider>
//     );

//     return;
//   }

//   console.log(
//     '[MSAL] Main window — rendering React app.'
//   );

//   root.render(
//     <Provider store={store}>
//       <BrowserRouter basename='/'>
//         <MsalProvider instance={msalInstance}>
//           <ThemeProvider>
//             <App />
//           </ThemeProvider>
//         </MsalProvider>
//       </BrowserRouter>
//     </Provider>
//   );
// });


import React from 'react';
import ReactDOM from 'react-dom/client';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import App from './App.jsx';
import './index.css';

import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';

import store from './store';

import { ThemeProvider } from './context/ThemeContext.jsx';

// =============================================
// MSAL IMPORTS
// =============================================
import { PublicClientApplication } from "@azure/msal-browser";

import { MsalProvider } from "@azure/msal-react";

import { msalConfig } from "./authConfig";

// =============================================
// GLOBAL SWAL
// =============================================
if (typeof window !== 'undefined') {
  window.Swal = Swal;
}

// =============================================
// CREATE MSAL INSTANCE
// =============================================
const msalInstance = new PublicClientApplication(msalConfig);

// =============================================
// ROOT
// =============================================
const root = ReactDOM.createRoot(
  document.getElementById('root')
);

// =============================================
// INITIALIZE MSAL
// =============================================
msalInstance.initialize()
  .then(() => {

    console.log('[MSAL] initialized successfully');

    // =========================================
    // Restore active account on refresh
    // =========================================
    const accounts = msalInstance.getAllAccounts();

    if (
      !msalInstance.getActiveAccount() &&
      accounts.length > 0
    ) {
      msalInstance.setActiveAccount(accounts[0]);
    }

    // =========================================
    // RENDER APP
    // =========================================
    root.render(
      <Provider store={store}>
        <BrowserRouter basename='/'>
          <MsalProvider instance={msalInstance}>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </MsalProvider>
        </BrowserRouter>
      </Provider>
    );

  })
  .catch((err) => {

    console.error(
      '[MSAL INIT ERROR] =>',
      err
    );

  });