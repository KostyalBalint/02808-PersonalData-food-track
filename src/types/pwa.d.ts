// src/types/pwa.d.ts
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// If you get errors about duplicate identifiers, you might need to ensure
// this file is treated as a module or adjust your tsconfig.json.
// You could add `export {};` at the end if needed.
export {};

// Add this to your main `vite-env.d.ts` or a global declaration file
// to make it available globally without importing:
// declare global {
//   interface WindowEventMap {
//     beforeinstallprompt: BeforeInstallPromptEvent;
//   }
//   interface Navigator {
//      standalone?: boolean; // For iOS Safari PWA detection
//   }
// }
