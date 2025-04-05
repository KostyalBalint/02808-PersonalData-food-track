// src/components/InstallPWAPrompt.tsx
import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useMediaQuery,
  useTheme,
  Stack,
  Box,
  DialogActions,
  Typography, // For text formatting
  ListItemIcon, // For icon
  ListItemText, // For text next to icon
  ListItem, // To group icon and text
} from "@mui/material";
import IosShareIcon from "@mui/icons-material/IosShare"; // MUI Share icon for iOS
// Or use '@mui/icons-material/Share' if IosShareIcon isn't suitable
import { usePWAInstall } from "../context/PWAInstallContext";

// Key for standard prompt dismissal
const PROMPT_DISMISSED_KEY = "pwaInstallPromptDismissed";
// Key for iOS instruction dismissal
const IOS_INSTRUCTIONS_DISMISSED_KEY = "pwaIOSInstructionsDismissed";

export const InstallPWAPrompt: React.FC = () => {
  const {
    canInstall, // Standard install prompt available (non-iOS)
    triggerInstallPrompt,
    isIOS,
    showIOSInstallInstructions, // Should we show iOS instructions?
    isAppInstalled, // Added for safety check, though covered by context logic
  } = usePWAInstall();

  const [open, setOpen] = useState(false);

  // Dismissal state for the standard prompt
  const [dismissedStandard, setDismissedStandard] = useState(() => {
    return localStorage.getItem(PROMPT_DISMISSED_KEY) === "true";
  });

  // Dismissal state for the iOS instructions
  const [dismissedIOS, setDismissedIOS] = useState(() => {
    return localStorage.getItem(IOS_INSTRUCTIONS_DISMISSED_KEY) === "true";
  });

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // Determine which mode the prompt is potentially in (if it were to open)
  const isIOSMode = isIOS && showIOSInstallInstructions && !dismissedIOS;
  const isStandardMode = !isIOS && canInstall && !dismissedStandard;

  useEffect(() => {
    // Show prompt if either condition is met
    if ((isIOSMode || isStandardMode) && !isAppInstalled) {
      console.log(
        `Conditions met, showing prompt. iOS Mode: ${isIOSMode}, Standard Mode: ${isStandardMode}`,
      );
      // Add a delay to avoid flickering on load/navigation
      const timer = setTimeout(() => setOpen(true), 700); // Slightly longer delay might help
      return () => clearTimeout(timer);
    } else {
      // Log why it's not showing
      if (!isIOSMode && !isStandardMode)
        console.log("Modal not shown: Conditions not met.");
      if (isAppInstalled)
        console.log("Modal not shown: App already installed.");
      if (isIOSMode && dismissedIOS)
        console.log("Modal not shown: iOS instructions previously dismissed.");
      if (isStandardMode && dismissedStandard)
        console.log("Modal not shown: Standard prompt previously dismissed.");
      setOpen(false); // Ensure it's closed
    }
    // Dependencies: include all factors determining if the modal should open
  }, [isIOSMode, isStandardMode, isAppInstalled]); // Simplified dependencies based on derived modes

  // Handles dismissing the currently relevant prompt type
  const handleDismiss = () => {
    if (isIOSMode) {
      console.log("Dismissing iOS install instructions permanently (session).");
      localStorage.setItem(IOS_INSTRUCTIONS_DISMISSED_KEY, "true");
      setDismissedIOS(true);
    } else if (isStandardMode) {
      console.log("Dismissing standard install prompt permanently (session).");
      localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
      setDismissedStandard(true);
    } else {
      console.log("Dismiss called but no active mode detected?"); // Should not happen if modal is open
    }
    setOpen(false);
  };

  // Handles triggering the standard install (only called in standard mode)
  const handleInstall = async () => {
    if (isStandardMode) {
      // Check if we are in the correct mode
      try {
        await triggerInstallPrompt();
        console.log("Install prompt triggered successfully from modal.");
        // No need to close here, context change will handle it via useEffect
      } catch (error) {
        console.error("Error triggering install prompt from modal:", error);
        handleDismiss(); // Dismiss on error
      }
    } else {
      console.warn("handleInstall called but not in standard mode.");
    }
  };

  // Don't render anything if the dialog shouldn't be open
  // This prevents rendering the structure unnecessarily before the useEffect opens it
  if (!open) {
    return null;
  }

  // Choose content based on the mode determined *before* opening
  const currentModeIsIOS = showIOSInstallInstructions;

  return (
    <Dialog
      fullScreen={fullScreen}
      open={open}
      onClose={handleDismiss} // Always dismiss on close
      aria-labelledby="install-pwa-dialog-title"
      PaperProps={{
        sx: {
          height: fullScreen ? "100%" : undefined,
          maxHeight: fullScreen ? "100%" : "calc(100% - 64px)", // Example max height desktop
          overflow: "hidden", // Parent handles structure, inner content scrolls
        },
      }}
    >
      {/* ---- RENDER BASED ON iOS vs Standard ---- */}

      {currentModeIsIOS ? (
        // --- iOS INSTRUCTIONS LAYOUT ---
        <Stack sx={{ height: "100%", p: 2.5 }}>
          <DialogTitle id="install-pwa-dialog-title" sx={{ px: 0, pt: 0 }}>
            Add to Home Screen
          </DialogTitle>

          <DialogContent sx={{ flexGrow: 1, overflowY: "auto", px: 0 }}>
            <DialogContentText component="div">
              {" "}
              {/* Use div for better structure */}
              <Typography paragraph>
                Install this app on your device for easy access. Tap the Share
                button below (or in your browser menu), then scroll down and tap
                'Add to Home Screen'.
              </Typography>
              {/* Example visual cue */}
              <ListItem sx={{ py: 1, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 30 /* Adjust spacing */ }}>
                  <IosShareIcon />
                </ListItemIcon>
                <ListItemText primary="Tap Share" />
              </ListItem>
              <ListItem sx={{ py: 1, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  {/* Placeholder for 'Add to Home Screen' icon - Use a generic Add icon? */}
                  <Box
                    component="span"
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: "action.selected",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    +
                  </Box>
                </ListItemIcon>
                <ListItemText primary="Select 'Add to Home Screen'" />
              </ListItem>
            </DialogContentText>
          </DialogContent>

          {/* Only show a dismiss button for iOS instructions */}
          <Button
            onClick={handleDismiss}
            color="primary" // Often "OK" or "Got it" uses primary color
            variant="contained" // Make it prominent
            sx={{ width: "100%", mt: 2 /* Add margin top */ }}
          >
            Got It
          </Button>
        </Stack>
      ) : // --- STANDARD (Non-iOS) INSTALL LAYOUT ---
      fullScreen ? (
        // --- MOBILE Standard Layout ---
        <Stack sx={{ height: "100%", p: 2.5 }}>
          <DialogTitle
            id="install-pwa-dialog-title-standard"
            sx={{ px: 0, pt: 0 }}
          >
            Install Our App
          </DialogTitle>
          <DialogContent sx={{ flexGrow: 1, overflowY: "auto", px: 0 }}>
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
          <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
            <Button
              onClick={handleInstall}
              variant="contained"
              color="primary"
              size="large"
            >
              Install App
            </Button>
          </Box>
          <Button
            onClick={handleDismiss}
            color="secondary"
            sx={{ width: "100%", mt: "auto" }}
          >
            Maybe Later
          </Button>
        </Stack>
      ) : (
        // --- DESKTOP Standard Layout ---
        <>
          <DialogTitle id="install-pwa-dialog-title-standard-desktop">
            Install Our App?
          </DialogTitle>
          <DialogContent>
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
