/// <reference types="vite/client" />

import { BeforeInstallPromptEvent } from "./types/pwa";

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface Navigator {
    standalone?: boolean; // For iOS Safari PWA detection
  }
}
