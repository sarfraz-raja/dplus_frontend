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
// GLOBAL SWAL
// =============================================
if (typeof window !== 'undefined') {
  window.Swal = Swal;
}

// =============================================
// ROOT
// =============================================
const root = ReactDOM.createRoot(
  document.getElementById('root')
);

// =============================================
// LAZY MSAL — always handle redirect on load
// Mirrors the working pattern from a6e5988 but
// with lazy imports instead of global init
// =============================================
const _msalRedirectUrlCheck = () =>
  /[?&](code|error|error_description)=/.test(window.location.search + window.location.hash);

(async () => {
  try {
    const [{ PublicClientApplication }, { msalConfig }, { default: AuthActions }] =
      await Promise.all([
        import('@azure/msal-browser'),
        import('./authConfig'),
        import('./store/actions/auth-actions'),
      ]);

    const msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
    const redirectResult = await msalInstance.handleRedirectPromise();

    if (redirectResult?.accessToken) {
      console.log('[MSAL] SSO redirect result received — calling backend');
      const result = await store.dispatch(
        AuthActions.ssoSignIn(redirectResult.accessToken, () => {})
      );
      if (result?.ok !== false) {
        window.location.replace('/home');
        return; // navigating away — skip render
      }
      console.error('[MSAL] SSO backend call failed:', result?.message);
      sessionStorage.setItem('sso_error', result?.message || 'Microsoft sign-in failed.');
    }
    // null = normal page load — no error needed
  } catch (err) {
    console.error('[MSAL REDIRECT ERROR] =>', err);
    const msg = err?.errorMessage || err?.message || '';
    const isOAuthRedirect = _msalRedirectUrlCheck();
    if (err?.errorCode === 'crypto_nonexistent') {
      if (isOAuthRedirect) {
        sessionStorage.setItem('sso_error', 'Microsoft sign-in requires a secure (HTTPS) connection. Please contact your administrator.');
      }
    } else if (msg.includes('AADSTS50020') || msg.includes('personal') || err?.errorCode === 'access_denied') {
      sessionStorage.setItem('sso_error', 'Personal Microsoft accounts are not allowed. Please sign in with your work or school account.');
    } else if (isOAuthRedirect) {
      sessionStorage.setItem('sso_error', 'Microsoft sign-in failed. Please try again.');
    }
    // On normal page loads, MSAL errors are silently ignored
  }

  renderApp();
})();

function renderApp() {
  root.render(
    <Provider store={store}>
      <BrowserRouter basename='/'>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
}