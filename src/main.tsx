import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/cards.css';
import './styles/pages.css';
import './styles/detail.css';
import './styles/charts.css';
import './styles/quiz.css';
import './styles/pages2.css';
import './styles/security.css';
import './styles/pages3.css';
import './styles/print.css';
import App from './App';
import { installDisclosure } from './lib/disclosure';

installDisclosure();

// A new deploy renames the script files. If a page's file is gone, reload once to pick up the new site;
// if that already just happened, let the error reach the page's error boundary instead of looping.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('bf-preload-reload') ?? 0);
    if (Date.now() - last < 15000) return;
    sessionStorage.setItem('bf-preload-reload', String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
