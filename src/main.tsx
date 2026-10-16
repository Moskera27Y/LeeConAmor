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