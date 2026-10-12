// A manual update for the installed game: ask the service worker for a new version, let it take over at once, and
// restart. If there is nothing new (or no service worker, as in dev), the restart alone reloads the latest files.

/** Returns a promise that resolves just before the page restarts; `onStatus` gets short progress lines. */
export async function updateGame(onStatus = () => {}) {
  onStatus('Checking for a new version…');
  try {
    const sw = navigator.serviceWorker;
    const reg = sw && sw.getRegistration ? await sw.getRegistration() : null;
    if (reg) {
      await reg.update();
      // A fresh worker waits until told; tell it, and restart when it takes over (or after a moment regardless).
      const waiting = reg.waiting || reg.installing;
      if (waiting) {
        onStatus('New version found, installing…');
        waiting.postMessage({ type: 'SKIP_WAITING' });
        await new Promise((resolve) => { let done = false; const go = () => { if (!done) { done = true; resolve(); } }; sw.addEventListener('controllerchange', go, { once: true }); setTimeout(go, 2500); });
      }
    }
  } catch { /* offline, or no service worker: the reload below still picks up anything the browser has */ }
  onStatus('Restarting…');
  setTimeout(() => window.location.reload(), 400);
}
