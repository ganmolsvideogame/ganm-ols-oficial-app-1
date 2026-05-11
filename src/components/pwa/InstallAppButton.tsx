"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { PWA_INSTALL_STATE_EVENT } from "@/components/pwa/AppInstallPrompt";

type InstallAppButtonProps = {
  source: string;
  label?: string;
  className?: string;
  children?: ReactNode;
};

type InstallState = {
  available: boolean;
  ios: boolean;
  standalone: boolean;
};

function readInstallState(): InstallState {
  if (typeof window === "undefined") {
    return {
      available: false,
      ios: false,
      standalone: false,
    };
  }

  return (
    window.__ganmolsPwaInstallState ?? {
      available: false,
      ios: false,
      standalone: false,
    }
  );
}

export default function InstallAppButton({
  source,
  label = "Instalar app",
  className,
  children,
}: InstallAppButtonProps) {
  const [installState, setInstallState] = useState<InstallState>(() =>
    readInstallState()
  );

  useEffect(() => {
    const syncState = () => setInstallState(readInstallState());

    syncState();
    window.addEventListener(PWA_INSTALL_STATE_EVENT, syncState);
    window.addEventListener("focus", syncState);
    document.addEventListener("visibilitychange", syncState);

    return () => {
      window.removeEventListener(PWA_INSTALL_STATE_EVENT, syncState);
      window.removeEventListener("focus", syncState);
      document.removeEventListener("visibilitychange", syncState);
    };
  }, []);

  if (!installState.available || installState.standalone) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void window.__ganmolsPwaInstall?.(source)}
      className={className}
    >
      {children ?? label}
    </button>
  );
}
