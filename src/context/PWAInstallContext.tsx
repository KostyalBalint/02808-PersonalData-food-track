// src/context/PWAInstallContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { BeforeInstallPromptEvent } from "../types/pwa";

// Types (ensure navigator.standalone is declared if needed)
// ...

interface PWAInstallContextType {
  // Standard install prompt state
  canInstall: boolean;
  triggerInstallPrompt: () => Promise<void>;

  // General installation status and platform info
  isAppInstalled: boolean;
  isIOS: boolean;
  // Flag specifically for showing manual install instructions on iOS Safari
  showIOSInstallInstructions: boolean;
}

const PWAInstallContext = createContext<PWAInstallContextType | undefined>(
  undefined,
);

export const usePWAInstall = (): PWAInstallContextType => {
  const context = useContext(PWAInstallContext);
  if (!context) {
    throw new Error("usePWAInstall must be used within a PWAInstallProvider");
  }
  return context;
};

// --- Helper function to detect iOS ---
const checkIsIOS = (): boolean => {
  return (
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      // Handle iPad pretending to be Mac OS
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) &&
    !window.MSStream
  );
};

interface PWAInstallProviderProps {
  children: ReactNode;
}

export const PWAInstallProvider: React.FC<PWAInstallProviderProps> = ({
  children,
}) => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstallInstructions, setShowIOSInstallInstructions] =
    useState(false);

  // --- Check Platform and Installation Status ---
  useEffect(() => {
    const isCurrentlyIOS = checkIsIOS();
    setIsIOS(isCurrentlyIOS);

    // Check standard PWA display mode
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    // Check iOS specific property (true when launched from home screen)
    const isSafariStandalone = window.navigator.standalone === true;

    const checkInstallation = () => {
      const installed = mediaQuery.matches || isSafariStandalone;
      console.log(`App installed status: ${installed}`);
      setIsAppInstalled(installed);

      // Determine if we should show iOS install instructions
      const shouldShowIOSInstructions = isCurrentlyIOS && !installed;
      console.log(`Should show iOS instructions: ${shouldShowIOSInstructions}`);
      setShowIOSInstallInstructions(shouldShowIOSInstructions);

      if (installed) {
        setDeferredPrompt(null); // No prompt needed if installed
      }
    };

    checkInstallation();
    mediaQuery.addEventListener("change", checkInstallation);

    const handleAppInstalled = () => {
      console.log("App installed event received!");
      setIsAppInstalled(true);
      setShowIOSInstallInstructions(false); // Hide instructions if installed
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener("change", checkInstallation);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []); // Run once on mount

  // --- Listener for standard 'beforeinstallprompt' ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent mini-infobar (only relevant on non-iOS)
      event.preventDefault();
      console.log("beforeinstallprompt event fired (non-iOS)");
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsAppInstalled(false); // Explicitly set false if prompt appears
      setShowIOSInstallInstructions(false); // Not iOS if this fires
    };

    // Only add listener if NOT iOS and NOT already installed
    if (!isIOS && !isAppInstalled) {
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      console.log("Added beforeinstallprompt listener.");
    } else {
      console.log(
        "Skipping beforeinstallprompt listener (is iOS or already installed).",
      );
    }

    return () => {
      // Check again before removing, just in case
      if (!isIOS) {
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt,
        );
        console.log("Removed beforeinstallprompt listener.");
      }
    };
    // Rerun if isIOS or isAppInstalled changes
  }, [isIOS, isAppInstalled]);

  // --- Trigger Standard Install Prompt ---
  const triggerInstallPrompt = useCallback(async () => {
    if (isIOS) {
      console.log(
        "Install prompt cannot be triggered programmatically on iOS.",
      );
      return;
    }
    if (!deferredPrompt) {
      console.log("Standard install prompt not available.");
      return;
    }

    console.log("Triggering standard install prompt...");
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to standard install prompt: ${outcome}`);
    setDeferredPrompt(null); // Hide prompt button once used
    // isAppInstalled state will update via 'appinstalled' event or display-mode change
  }, [deferredPrompt, isIOS]);

  // Standard install possible only if event exists AND not on iOS AND not installed
  const canInstall = !!deferredPrompt && !isIOS && !isAppInstalled;

  // Context Value
  const contextValue: PWAInstallContextType = {
    canInstall,
    isAppInstalled,
    isIOS,
    showIOSInstallInstructions: showIOSInstallInstructions && !isAppInstalled, // Ensure instructions hidden if somehow installed later
    triggerInstallPrompt,
  };

  return (
    <PWAInstallContext.Provider value={contextValue}>
      {children}
    </PWAInstallContext.Provider>
  );
};
