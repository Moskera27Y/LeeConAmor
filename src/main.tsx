import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Touch optimization for mobile
if ('ontouchstart' in window) {
  document.documentElement.classList.add('touch-device');
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA: en producción se registra el shell offline. En desarrollo se evita
// para no interferir con el HMR de Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}