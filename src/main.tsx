import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import App from './App';
import { bindAppLifecyclePause } from './appLifecycle';
import { bindAudioLifecycleResume } from './audio/unlockAudio';
import { recordVisit } from './model/uiPreferences';
import { bindInstallPromptCapture } from './pwa/installPrompt';
import { initServiceWorker } from './pwa/registerSW';
import { initProgressSync } from './sync/progressSync';

bindInstallPromptCapture();
recordVisit();
bindAudioLifecycleResume();
bindAppLifecyclePause();
initServiceWorker();
initProgressSync();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
