import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Suppress non-fatal ResizeObserver warnings
// const originalError = console.error;
// console.error = function(...args) {
//   if (args[0]?.includes?.('ResizeObserver loop completed with undelivered notifications')) {
//     return; // Suppress this benign warning
//   }
//   originalError.apply(console, args);
// };

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
