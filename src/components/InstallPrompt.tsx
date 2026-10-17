import { useEffect, useState } from 'react';
import { APP_NAME } from '../config';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS(): boolean {
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

/**
 * PWA install affordance: captures beforeinstallprompt and offers an
 * "Install Daydrop" button; on iOS shows Add-to-Home-Screen instructions;
 * renders nothing otherwise.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  if (deferred) {
    return (
      <section className="install-card" aria-label="Install app">
        <p>Keep Daydrop close — install it for a quieter, full-screen moment.</p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            void deferred.prompt();
          }}
        >
          Install {APP_NAME}
        </button>
      </section>
    );
  }

  if (isIOS() && !isStandalone()) {
    return (
      <section className="install-card" aria-label="Add to Home Screen">
        <p>
          <strong>Add to Home Screen:</strong> tap Share, then choose “Add to Home Screen” to
          keep {APP_NAME} a tap away.
        </p>
      </section>
    );
  }

  return null;
}
