// src/components/InstallPWAPrompt.tsx
import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  // DialogActions, // No longer always needed
  DialogContent,
  DialogContentText,
  DialogTitle,
  useMediaQuery,
  useTheme,
  Stack, // Import Stack
  Box, // Import Box for structuring if needed
  DialogActions, // Keep DialogActions for desktop layout
} from "@mui/material";
import { usePWAInstall } from "../context/PWAInstallContext";

const PROMPT_DISMISSED_KEY = "pwaInstallPromptDismissed";

export const InstallPWAPrompt: React.FC = () => {
  const { canInstall, triggerInstallPrompt } = usePWAInstall();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(PROMPT_DISMISSED_KEY) === "true";
  });

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm")); // Check for mobile size

  useEffect(() => {
    if (canInstall && !dismissed) {
      console.log("Conditions met, showing install prompt modal.");
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    } else {
      if (!canInstall) console.log("Modal not shown: cannot install.");
      if (dismissed) console.log("Modal not shown: already dismissed.");
      setOpen(false);
    }
  }, [canInstall, dismissed]);

  const handleDismiss = () => {
    console.log("Dismissing install prompt permanently (session).");
    localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
    setDismissed(true);
    setOpen(false);
  };

  const handleInstall = async () => {
    try {
      await triggerInstallPrompt();
      console.log("Install prompt triggered successfully from modal.");
      // Closing handled by useEffect
    } catch (error) {
      console.error("Error triggering install prompt from modal:", error);
      handleDismiss();
    }
  };

  return (
    <Dialog
      fullScreen={fullScreen}
      open={open}
      onClose={handleDismiss}
      aria-labelledby="install-pwa-dialog-title"
      // Ensure the Dialog Paper itself can accommodate the full height structure if needed
      PaperProps={{
        sx: {
          // Ensure height allows internal stacking to work, especially on mobile
          height: fullScreen ? "100%" : undefined,
          // Prevent outer scroll issues
          overflow: fullScreen ? "hidden" : "auto",
        },
      }}
    >
      {/* Conditionally Render Layout based on screen size */}
      {fullScreen ? (
        // --- MOBILE LAYOUT (Using Stack) ---
        <Stack sx={{ height: "100%", p: 2.5 /* Outer padding */ }}>
          <DialogTitle
            id="install-pwa-dialog-title"
            sx={{ px: 0, pt: 0 /* Adjust padding */ }}
          >
            Install Our App
          </DialogTitle>

          {/* Scrollable Content Area */}
          <DialogContent
            sx={{ flexGrow: 1, overflowY: "auto", px: 0 /* Adjust padding */ }}
          >
            <DialogContentText>
              Get the best experience by installing our app directly to your
              device
            </DialogContentText>
            <DialogContentText
              variant="caption"
              sx={{ mt: 2, display: "block" }}
            >
              If you choose not to install now, you can later install it from
              the settings menu of the application, or from your browser's menu
            </DialogContentText>
          </DialogContent>

          {/* Centered Install Button (takes space after content) */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 3 /* Margin top/bottom */,
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <Button
              onClick={handleInstall}
              variant="contained"
              color="primary"
              size="large" // Make it prominent
            >
              Install App
            </Button>
          </Box>

          {/* Bottom "Maybe Later" Button */}
          <Button
            onClick={handleDismiss}
            color="secondary"
            sx={{
              width: "100%" /* Full width at bottom */,
              mt: "auto" /* Pushes to bottom if needed, though order matters more here */,
            }}
          >
            Maybe Later
          </Button>
        </Stack>
      ) : (
        // --- DESKTOP LAYOUT (Standard Dialog Structure) ---
        <>
          <DialogTitle id="install-pwa-dialog-title">
            Install Our App?
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Get the best experience by installing our app directly to your
              device. It's fast, works offline (if configured), and easy to
              access from your home screen.
            </DialogContentText>
            <DialogContentText
              variant="caption"
              sx={{ mt: 2, display: "block" }}
            >
              If you choose not to install now, you can usually add this app to
              your home screen later from your browser's menu (often under "Add
              to Home Screen" or "Install App").
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ padding: theme.spacing(2, 3) }}>
            <Button onClick={handleDismiss} color="secondary">
              Maybe Later
            </Button>
            <Button onClick={handleInstall} variant="contained" color="primary">
              Install App
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};
