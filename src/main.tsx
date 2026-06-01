import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global window.fetch interceptor to automatically route /api endpoints to the VITE_API_URL backend on static hosts (e.g. Netlify)
const apiBase = (((import.meta as any).env?.VITE_API_URL as string) || '').trim();
if (apiBase) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      return originalFetch(`${cleanBase}${input}`, init);
    }
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
