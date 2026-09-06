"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallToast() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const toastId = toast("Install FlyGo Airlines", {
      description:
        "Get the best experience by installing our premium app on your device.",
      duration: 30000,
      action: {
        label: "Install",
        onClick: async () => {
          const promptEvent = deferredPromptRef.current;
          if (promptEvent) {
            await promptEvent.prompt();
            await promptEvent.userChoice;
            deferredPromptRef.current = null;
          } else {
            toast("Installation Hint", {
              description:
                "Tap your browser's menu or share button, then select 'Add to Home Screen'.",
            });
          }
        },
      },
    });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      toast.dismiss(toastId);
    };
  }, []);

  return null;
}
