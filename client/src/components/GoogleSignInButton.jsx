import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import useAuthStore from '../store/authStore';

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let script = document.getElementById('google-identity-services');
    if (!script) {
      script = document.createElement('script');
      script.id = 'google-identity-services';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
    }

    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', reject, { once: true });
    if (!script.isConnected) document.head.appendChild(script);
  });
}

export default function GoogleSignInButton() {
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const googleLogin = useAuthStore((state) => state.googleLogin);
  const setError = useAuthStore((state) => state.setError);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let active = true;

    if (!clientId) {
      setError('Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to the client environment.');
      return undefined;
    }

    loadGoogleIdentityScript()
      .then(() => {
        if (!active || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response.credential) {
              setError('Google did not return a sign-in credential. Please try again.');
              return;
            }

            setLoading(true);
            const result = await googleLogin(response.credential);
            setLoading(false);
            if (result.success) navigate('/');
          },
        });

        buttonRef.current.replaceChildren();
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.max(240, Math.floor(buttonRef.current.getBoundingClientRect().width)),
        });
      })
      .catch(() => {
        if (active) setError('Could not load Google sign-in. Check your connection and try again.');
      });

    return () => {
      active = false;
      if (buttonRef.current) buttonRef.current.replaceChildren();
    };
  }, [clientId, googleLogin, navigate, setError]);

  return (
    <div className="mt-5">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-stone-500">
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-stone-700" />
          Signing in with Google...
        </div>
      ) : (
        <div ref={buttonRef} className="flex justify-center min-h-10" />
      )}
    </div>
  );
}
