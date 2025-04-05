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

// Import the type if you defined it separately
// If you declared it globally, you might not need this import.
// import { BeforeInstallPromptEvent } from '../types/pwa';

interface PWAInstallContextType {
  canInstall: boolean;
  isAppInstalled: boolean;
  triggerInstallPrompt: () => Promise<void>;
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

interface PWAInstallProviderProps {
  children: ReactNode;
}

export const PWAInstallProvider: React.FC<PWAInstallProviderProps> = ({
  children,
}) => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Check if the app is installed
  useEffect(() => {
    // Check standard PWA display mode
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    // Check iOS specific property
    const isSafariStandalone = window.navigator.standalone === true;

    const checkInstallation = () => {
      if (mediaQuery.matches || isSafariStandalone) {
        console.log("App is installed.");
        setIsAppInstalled(true);
        setDeferredPrompt(null); // No need for prompt if installed
      } else {
        console.log("App is not installed.");
        setIsAppInstalled(false);
      }
    };

    checkInstallation(); // Initial check
    mediaQuery.addEventListener("change", checkInstallation); // Listen for changes

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      console.log("App installed successfully!");
      setIsAppInstalled(true);
      setDeferredPrompt(null); // Clear the prompt event
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener("change", checkInstallation);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Listen for the beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the default mini-infobar (important!)
      event.preventDefault();
      console.log("beforeinstallprompt event fired");
      // Store the event so it can be triggered later.
      // Type assertion needed as Event type doesn't have prompt() by default
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      // Ensure we know it's not installed if this event fires
      setIsAppInstalled(false);
    };

    // Only add listener if not installed
    if (!isAppInstalled) {
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      console.log("Added beforeinstallprompt listener.");
    } else {
      console.log("Skipping beforeinstallprompt listener as app is installed.");
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      console.log("Removed beforeinstallprompt listener.");
    };
  }, [isAppInstalled]); // Rerun if installation status changes

  const triggerInstallPrompt = useCallback(async () => {
    if (!deferredPrompt) {
      console.log("Install prompt not available.");
      return;
    }

    console.log("Triggering install prompt...");
    deferredPrompt.prompt(); // Show the browser's install dialog

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We hide the install button permanently (or until next eligible event)
    // regardless of the outcome.
    setDeferredPrompt(null);

    if (outcome === "accepted") {
      // The appinstalled event will handle setting isAppInstalled=true
      console.log("User accepted the install prompt.");
    } else {
      console.log("User dismissed the install prompt");
    }
  }, [deferredPrompt]);

  const canInstall = !!deferredPrompt && !isAppInstalled;

  const contextValue: PWAInstallContextType = {
    canInstall,
    isAppInstalled,
    triggerInstallPrompt,
  };

  return (
    <PWAInstallContext.Provider value={contextValue}>
      {children}
    </PWAInstallContext.Provider>
  );
};
