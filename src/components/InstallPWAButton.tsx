// src/components/InstallPWAButton.tsx
import React from "react";
import { Button, ButtonProps } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download"; // Example Icon
import { usePWAInstall } from "../context/PWAInstallContext";

// Extend Mui ButtonProps to allow passing standard button props
interface InstallPWAButtonProps
  extends Omit<ButtonProps, "onClick" | "disabled"> {
  // Add any custom props specific to this button if needed
}

export const InstallPWAButton: React.FC<InstallPWAButtonProps> = (props) => {
  const { canInstall, triggerInstallPrompt } = usePWAInstall();

  if (!canInstall) {
    // Don't render the button if installation isn't possible
    // Alternatively, render a disabled button:
    // return <Button {...props} disabled startIcon={<DownloadIcon />}>Install App</Button>;
    return null;
  }

  const handleInstallClick = () => {
    triggerInstallPrompt().catch((err) => {
      console.error("Error triggering install prompt:", err);
      // Handle potential errors if needed
    });
  };

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<DownloadIcon />}
      {...props} // Spread remaining props
      onClick={handleInstallClick}
    >
      Install App
    </Button>
  );
};
