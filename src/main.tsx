import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import App from './App';
import { recordVisit } from './model/uiPreferences';
import { bindInstallPromptCapture } from './pwa/installPrompt';
import { initServiceWorker } from './pwa/registerSW';

bindInstallPromptCapture();
recordVisit();
initServiceWorker();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
