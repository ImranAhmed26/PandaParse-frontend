"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import authApi from "@/lib/api/auth";
import { useAuthStore } from "@/lib/auth/authStore";
import env from "@/lib/env";

const GSI_SRC = "https://accounts.google.com/gsi/client";

type GoogleButtonText = "signin_with" | "signup_with" | "continue_with";

/**
 * "Continue with Google" button backed by Google Identity Services.
 *
 * GIS renders its own (compliant) button, hands us a Google ID token on success,
 * and we exchange it at POST /auth/google for our own JWTs — reusing the exact
 * same auth-store login path as email/password sign-in. Renders nothing when
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.
 */
export default function GoogleAuthButton({ text = "continue_with" }: { text?: GoogleButtonText }) {
  const clientId = env.googleClientId;
  const { login } = useAuthStore();
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleMutation = useMutation({
    mutationFn: (idToken: string) => authApi.googleLogin(idToken),
    onSuccess: (response) => {
      const { user, access_token, refresh_token } = response.data;
      login(
        { accessToken: access_token, refreshToken: refresh_token },
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          userType: user.userType,
          companyName: user.companyName,
          image: user.image,
        }
      );
      router.push("/dashboard");
    },
    onError: () => {
      setError("Google sign-in failed. Please try again.");
    },
  });

  // Keep the latest handler in a ref so GIS is initialized only once (its callback
  // can't be swapped after initialize), without stale closures over the mutation.
  const handleCredential = useCallback(
    (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        setError("No credential returned from Google.");
        return;
      }
      setError(null);
      googleMutation.mutate(response.credential);
    },
    [googleMutation]
  );
  const handlerRef = useRef(handleCredential);
  handlerRef.current = handleCredential;

  useEffect(() => {
    if (!scriptLoaded || !clientId || renderedRef.current) return;
    const google = window.google;
    const container = containerRef.current;
    if (!google || !container) return;

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => handlerRef.current(response),
      cancel_on_tap_outside: true,
    });
    google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text,
      shape: "rectangular",
      logo_alignment: "center",
      width: container.offsetWidth || 320,
    });
    renderedRef.current = true;
  }, [scriptLoaded, clientId, text]);

  if (!clientId) return null;

  return (
    <div className="w-full">
      <Script src={GSI_SRC} strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} />
      <div ref={containerRef} className="flex w-full justify-center min-h-[44px]" />
      {googleMutation.isPending && (
        <p className="mt-2 text-center text-sm text-gray-500">Signing you in…</p>
      )}
      {error && <p className="mt-2 text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}
